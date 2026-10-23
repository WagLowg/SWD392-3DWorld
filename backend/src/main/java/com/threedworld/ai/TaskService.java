package com.threedworld.ai;

import com.threedworld.ai.provider.ProviderAdapter;
import com.threedworld.ai.provider.ProviderAdapter.ProviderTask;
import com.threedworld.ai.provider.ProviderException;
import com.threedworld.ai.provider.ProviderRegistry;
import com.threedworld.common.Db;
import com.threedworld.common.Ids;
import com.threedworld.common.Json;
import com.threedworld.storage.StorageService;
import com.threedworld.storage.StorageService.StoredFile;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Vòng đời AI task nội bộ (SRS 6.1):
 * SUBMITTED → QUEUED → RUNNING → SUCCEEDED → INGESTING → AVAILABLE | ASSET_ERROR
 *           ↘ FAILED | CANCELLED | NEEDS_RECONCILIATION
 * Trạng thái không bao giờ lùi (BR-09). Cập nhật bằng compare-and-set để chống race giữa webhook và polling.
 */
@Service
public class TaskService {
    private static final Logger log = LoggerFactory.getLogger(TaskService.class);
    public static final List<String> ACTIVE = List.of("SUBMITTED", "QUEUED", "RUNNING", "NEEDS_RECONCILIATION");
    public static final List<String> TERMINAL = List.of("AVAILABLE", "FAILED", "CANCELLED");
    private static final Map<String, Integer> RANK = Map.of("SUBMITTED", 0, "NEEDS_RECONCILIATION", 0, "QUEUED", 1, "RUNNING", 2,
            "SUCCEEDED", 3, "INGESTING", 4, "ASSET_ERROR", 5, "AVAILABLE", 6, "FAILED", 6, "CANCELLED", 6);
    private static final int MAX_INGEST_ATTEMPTS = 3;
    private static final long RECONCILE_TIMEOUT_MS = 30 * 60 * 1000L;
    static final long MAX_ASSET_BYTES = 300L * 1024 * 1024;
    private static final List<String> FORMATS = List.of("glb", "fbx", "obj", "mtl", "usdz", "stl", "3mf");
    private static final Map<String, String> CONTENT_TYPES = Map.of("glb", "model/gltf-binary", "stl", "model/stl",
            "obj", "text/plain", "mtl", "text/plain", "usdz", "model/vnd.usdz+zip", "3mf", "model/3mf", "fbx", "application/octet-stream");

    private final Db db;
    private final ProviderRegistry providers;
    private final StorageService storage;
    private final WalletService wallet;
    private final ObjBundleService objBundles;
    private final ExecutorService executor = Executors.newFixedThreadPool(4, r -> {
        Thread t = new Thread(r, "ai-task");
        t.setDaemon(true);
        return t;
    });
    private final Set<String> inflight = ConcurrentHashMap.newKeySet();
    private final AtomicBoolean ticking = new AtomicBoolean(false);
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30)).followRedirects(HttpClient.Redirect.NORMAL).build();

    public TaskService(Db db, ProviderRegistry providers, StorageService storage, WalletService wallet, ObjBundleService objBundles) {
        this.db = db;
        this.providers = providers;
        this.storage = storage;
        this.wallet = wallet;
        this.objBundles = objBundles;
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }

    // ---------------- state machine ----------------
    static boolean canTransition(String from, String to) {
        if (from.equals(to)) return false;
        if (TERMINAL.contains(from)) return false;
        if (from.equals("ASSET_ERROR")) return to.equals("INGESTING") || to.equals("FAILED");
        if (from.equals("INGESTING")) return to.equals("AVAILABLE") || to.equals("ASSET_ERROR");
        if (from.equals("SUCCEEDED")) return to.equals("INGESTING");
        if (List.of("FAILED", "CANCELLED", "SUCCEEDED").contains(to)) return true;
        return RANK.get(to) > RANK.get(from);
    }

    /** Compare-and-set: chỉ cập nhật nếu trạng thái trong DB vẫn là trạng thái đã đọc. */
    boolean transition(Map<String, Object> task, String to, Map<String, Object> fields) {
        String from = Db.str(task, "status");
        if (!canTransition(from, to)) return false;
        StringBuilder sql = new StringBuilder("UPDATE ai_tasks SET status = ?, updated_at = ?");
        List<Object> vals = new ArrayList<>(List.of(to, Ids.now()));
        for (Map.Entry<String, Object> e : fields.entrySet()) {
            sql.append(", ").append(e.getKey()).append(" = ?");
            vals.add(e.getValue());
        }
        sql.append(" WHERE id = ? AND status = ?");
        vals.add(Db.str(task, "id"));
        vals.add(from);
        if (db.run(sql.toString(), vals.toArray()) > 0) {
            task.putAll(fields);
            task.put("status", to);
            return true;
        }
        return false;
    }

    private static Map<String, Object> f(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    static String modeOf(Map<String, Object> task) {
        return "multi-image-to-3d".equals(Db.str(task, "type")) ? "multi" : "single";
    }

    private Map<String, Object> load(String taskId) {
        Map<String, Object> t = db.one("SELECT * FROM ai_tasks WHERE id = ?", taskId);
        return t == null ? null : new HashMap<>(t);
    }

    private List<String> imageDataUris(Map<String, Object> task) {
        List<String> out = new ArrayList<>();
        for (Object imgId : Json.list(Db.str(task, "image_ids_json"))) {
            Map<String, Object> img = db.one("SELECT * FROM ai_source_images WHERE id = ? AND owner_id = ?", imgId, Db.str(task, "owner_id"));
            if (img == null) throw new ProviderException("SOURCE_MISSING", "Ảnh nguồn không còn tồn tại.");
            byte[] buf = storage.read(Db.str(img, "url"));
            out.add("data:" + Db.str(img, "mime") + ";base64," + Base64.getEncoder().encodeToString(buf));
        }
        return out;
    }

    // ---------------- submit ----------------
    public void submitAsync(String taskId) {
        executor.execute(() -> {
            try {
                submit(taskId);
            } catch (Exception e) {
                log.error("[submit] {}", taskId, e);
            }
        });
    }

    /** Gửi task lên provider. Chạy nền sau khi API đã trả localTaskId. */
    public void submit(String taskId) {
        Map<String, Object> task = load(taskId);
        if (task == null || !"SUBMITTED".equals(Db.str(task, "status")) || task.get("provider_task_id") != null) return;
        ProviderAdapter adapter = providers.forName(Db.str(task, "provider"));
        try {
            String providerTaskId = adapter.create(modeOf(task), imageDataUris(task), Json.map(Db.str(task, "config_json")));
            transition(task, "QUEUED", f("provider_task_id", providerTaskId, "provider_status", "PENDING"));
            db.audit(Db.str(task, "owner_id"), "task.submitted", taskId, Map.of("providerTaskId", providerTaskId));
        } catch (Exception ex) {
            ProviderException e = ex instanceof ProviderException pe ? pe : new ProviderException("SUBMIT_FAILED", ex.getMessage() == null ? "Gửi tác vụ thất bại." : ex.getMessage());
            if (e.ambiguous()) {
                // Không rõ provider đã tạo task hay chưa → đối soát, KHÔNG tự gửi lại (BR-08)
                transition(task, "NEEDS_RECONCILIATION", f("error_code", e.code(), "error_message", "Đang xác minh trạng thái với nhà cung cấp."));
            } else {
                db.txRun(() -> {
                    if (transition(task, "FAILED", f("error_code", e.code(), "error_message", e.getMessage(), "finished_at", Ids.now()))) {
                        wallet.releaseHold(task, "Hoàn credit: gửi tác vụ thất bại");
                    }
                });
            }
            db.audit(Db.str(task, "owner_id"), "task.submit_error", taskId, f("code", e.code(), "message", e.getMessage()));
        }
    }

    // ---------------- sync ----------------
    /** Đồng bộ một task với provider (polling, webhook và nút "Làm mới"). */
    public void sync(String taskId) {
        if (!inflight.add(taskId)) return;
        try {
            Map<String, Object> task = load(taskId);
            if (task == null) return;
            String status = Db.str(task, "status");
            String providerTaskId = Db.str(task, "provider_task_id");
            if ("NEEDS_RECONCILIATION".equals(status) && providerTaskId == null) {
                if (Ids.now() - Db.lng(task, "created_at") > RECONCILE_TIMEOUT_MS) {
                    db.txRun(() -> {
                        if (transition(task, "FAILED", f("error_code", "UNKNOWN_OUTCOME", "error_message",
                                "Không xác minh được tác vụ với nhà cung cấp. Credit đã được hoàn.", "finished_at", Ids.now()))) {
                            wallet.releaseHold(task, "Hoàn credit sau đối soát");
                        }
                    });
                    db.audit(null, "task.reconcile_release", taskId, null);
                }
                return;
            }
            if (providerTaskId == null) return;
            if (TERMINAL.contains(status) || "INGESTING".equals(status)) return;
            if ("ASSET_ERROR".equals(status) && Db.integer(task, "ingest_attempts") >= MAX_INGEST_ATTEMPTS) return;

            ProviderTask r;
            try {
                r = providers.forName(Db.str(task, "provider")).get(modeOf(task), providerTaskId);
            } catch (ProviderException e) {
                db.run("UPDATE ai_tasks SET last_synced_at = ? WHERE id = ?", Ids.now(), taskId);
                if ("PROVIDER_NOT_FOUND".equals(e.code()) && ACTIVE.contains(status)) {
                    db.txRun(() -> {
                        if (transition(task, "FAILED", f("error_code", "PROVIDER_NOT_FOUND", "error_message", "Nhà cung cấp không còn tác vụ này.", "finished_at", Ids.now()))) {
                            wallet.releaseHold(task, "Hoàn credit: tác vụ không tồn tại phía provider");
                        }
                    });
                }
                return;
            }
            db.run("UPDATE ai_tasks SET last_synced_at = ?, provider_status = ? WHERE id = ?", Ids.now(), r.status(), taskId);

            switch (r.status()) {
                case "PENDING" -> {
                    if (status.equals("NEEDS_RECONCILIATION") || status.equals("SUBMITTED")) transition(task, "QUEUED", f("progress", 0));
                }
                case "IN_PROGRESS" -> {
                    if (status.equals("RUNNING")) {
                        if (r.progress() > Db.integer(task, "progress")) {
                            db.run("UPDATE ai_tasks SET progress = ?, updated_at = ? WHERE id = ? AND status = 'RUNNING'", r.progress(), Ids.now(), taskId);
                        }
                    } else transition(task, "RUNNING", f("progress", r.progress()));
                }
                case "SUCCEEDED" -> {
                    if (!status.equals("ASSET_ERROR")) transition(task, "SUCCEEDED", f("progress", 100));
                    ingest(task, r);
                }
                case "FAILED" -> db.txRun(() -> {
                    if (transition(task, "FAILED", f("error_code", "PROVIDER_FAILED", "error_message",
                            r.errorMessage() != null ? r.errorMessage() : "Nhà cung cấp không tạo được mô hình.", "finished_at", Ids.now()))) {
                        wallet.releaseHold(task, "Hoàn credit: tạo mô hình thất bại");
                    }
                });
                case "CANCELED" -> db.txRun(() -> {
                    if (transition(task, "CANCELLED", f("finished_at", Ids.now()))) wallet.releaseHold(task, "Hoàn credit: tác vụ đã hủy");
                });
                default -> { }
            }
        } finally {
            inflight.remove(taskId);
        }
    }

    // ---------------- ingest ----------------
    static byte[] download(String url) {
        try {
            HttpResponse<InputStream> res = HTTP.send(HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofMinutes(3)).GET().build(),
                    HttpResponse.BodyHandlers.ofInputStream());
            try (InputStream in = res.body()) {
                if (res.statusCode() >= 400) throw new IllegalStateException("Tải asset thất bại (HTTP " + res.statusCode() + ")");
                long len = res.headers().firstValueAsLong("content-length").orElse(0);
                if (len > MAX_ASSET_BYTES) throw new IllegalStateException("Asset vượt dung lượng cho phép");
                byte[] buf = in.readNBytes((int) MAX_ASSET_BYTES + 1);
                if (buf.length > MAX_ASSET_BYTES) throw new IllegalStateException("Asset vượt dung lượng cho phép");
                return buf;
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Bị gián đoạn");
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException(e.getMessage(), e);
        }
    }

    private static byte[] fetchAsset(String url, String format, String seed) {
        if (url.startsWith("mock://")) return "stl".equals(format) ? Procedural.makeStl(seed) : Procedural.makeGlb(seed);
        return download(url);
    }

    record PendingAsset(String kind, String format, String fileName, StoredFile file) {}

    /** Lưu asset kết quả về storage riêng (Cloudinary) ngay khi provider báo thành công (BR-11). */
    private void ingest(Map<String, Object> task, ProviderTask r) {
        if (!transition(task, "INGESTING", f("ingest_attempts", Db.integer(task, "ingest_attempts") + 1))) return;
        String taskId = Db.str(task, "id");
        String owner = Db.str(task, "owner_id");
        String versionId = Ids.id("ver");
        String base = "ai/" + owner + "/" + versionId + "/";
        try {
            if (!r.modelUrls().containsKey("glb")) throw new IllegalStateException("Provider không trả về GLB");
            List<PendingAsset> stored = new ArrayList<>();
            byte[] glb = null;
            for (String fmt : FORMATS) {
                String url = r.modelUrls().get(fmt);
                if (url == null) continue;
                try {
                    byte[] buf = fetchAsset(url, fmt, taskId);
                    StoredFile sf = storage.put(base + "model." + fmt, buf, CONTENT_TYPES.getOrDefault(fmt, "application/octet-stream"));
                    stored.add(new PendingAsset("model", fmt, "model." + fmt, sf));
                    if (fmt.equals("glb")) glb = buf;
                } catch (Exception e) {
                    if (fmt.equals("glb")) throw e; // GLB bắt buộc, định dạng khác thiếu thì bỏ qua
                    log.warn("[ingest] {} bỏ qua {}: {}", taskId, fmt, e.getMessage());
                }
            }
            // Ảnh texture rời: cần cho gói OBJ (GLB/FBX/USDZ đã nhúng texture)
            if (stored.stream().anyMatch(s -> s.format().equals("obj")) && r.textureUrls() != null && !r.textureUrls().isEmpty()) {
                stored.addAll(objBundles.downloadTextures(owner, versionId, r.textureUrls()));
            }
            // Thumbnail: từ provider, nếu không có thì dùng ảnh nguồn đầu tiên
            try {
                byte[] thumb = null;
                if (r.thumbnailUrl() != null) thumb = download(r.thumbnailUrl());
                else {
                    List<Object> ids = Json.list(Db.str(task, "image_ids_json"));
                    Map<String, Object> img = ids.isEmpty() ? null : db.one("SELECT url FROM ai_source_images WHERE id = ?", ids.get(0));
                    if (img != null) thumb = storage.read(Db.str(img, "url"));
                }
                if (thumb != null) {
                    String mime = ImageProbe.sniffMime(thumb);
                    String ext = mime == null ? "png" : mime.substring(6).replace("jpeg", "jpg");
                    StoredFile sf = storage.put(base + "thumbnail." + ext, thumb, mime == null ? "application/octet-stream" : mime);
                    stored.add(new PendingAsset("thumbnail", ext, "thumbnail." + ext, sf));
                }
            } catch (Exception e) {
                log.warn("[ingest] {} thumbnail: {}", taskId, e.getMessage());
            }

            Map<String, Object> cfg = Json.map(Db.str(task, "config_json"));
            Map<String, Object> stats = GlbStats.of(glb);
            db.txRun(() -> {
                String projectId = Db.str(task, "project_id");
                long n = db.count("SELECT COUNT(*) FROM ai_versions WHERE project_id = ?", projectId) + 1;
                int variant = Db.integer(task, "variant_index");
                String label = String.format("v%02d · %s", n, variant > 0 ? "Biến thể " + (variant + 1) : "Bản gốc");
                Map<String, Object> meta = new LinkedHashMap<>();
                meta.put("stats", stats);
                meta.put("aiModel", cfg.get("aiModel"));
                // Chỉ ghi nhận texture khi GLB thực sự chứa ảnh texture
                boolean hasTex = Boolean.TRUE.equals(cfg.get("shouldTexture")) && (stats == null || ((Number) stats.get("textures")).intValue() != 0);
                meta.put("texture", hasTex ? cfg.get("textureResolution").toString().toUpperCase() + (Boolean.TRUE.equals(cfg.get("enablePbr")) ? " · PBR" : "") : null);
                meta.put("topology", Boolean.TRUE.equals(cfg.get("shouldRemesh")) ? cfg.get("topology") : "triangle");
                meta.put("credits", Db.integer(task, "credits"));
                meta.put("provider", task.get("provider"));
                meta.put("providerTaskId", task.get("provider_task_id"));
                db.run("INSERT INTO ai_versions (id, project_id, parent_version_id, source_task_id, label, metadata_json, created_at) VALUES (?,?,?,?,?,?,?)",
                        versionId, projectId, null, taskId, label, Json.write(meta), Ids.now());
                for (PendingAsset s : stored) insertAsset(owner, versionId, s);
                db.run("UPDATE ai_projects SET active_version_id = COALESCE(active_version_id, ?), updated_at = ? WHERE id = ?", versionId, Ids.now(), projectId);
                transition(task, "AVAILABLE", f("finished_at", Ids.now(), "error_code", null, "error_message", null));
                wallet.settleHold(task);
            });
            db.audit(owner, "task.available", taskId, Map.of("versionId", versionId));
        } catch (Exception e) {
            log.error("[ingest] {} lỗi: {}", taskId, e.getMessage());
            db.txRun(() -> {
                transition(task, "ASSET_ERROR", f("error_code", "ASSET_ERROR", "error_message", "Lưu kết quả thất bại: " + e.getMessage()));
                if (Db.integer(task, "ingest_attempts") >= MAX_INGEST_ATTEMPTS) wallet.releaseHold(task, "Hoàn credit: không lưu được kết quả");
            });
        }
    }

    void insertAsset(String owner, String versionId, PendingAsset s) {
        db.run("INSERT INTO ai_assets (id, version_id, owner_id, kind, format, file_name, storage_key, url, size_bytes, checksum, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                Ids.id("ast"), versionId, owner, s.kind(), s.format(), s.fileName(), s.file().key(), s.file().url(), s.file().size(), s.file().checksum(), Ids.now());
    }

    // ---------------- cancel ----------------
    public void cancel(Map<String, Object> taskRow) {
        Map<String, Object> task = new HashMap<>(taskRow);
        String status = Db.str(task, "status");
        if (!List.of("SUBMITTED", "QUEUED").contains(status) || task.get("provider_task_id") == null) {
            throw new ProviderException("CANNOT_CANCEL", "Chỉ hủy được tác vụ đang chờ trong hàng đợi. Tác vụ đang xử lý không thể dừng.");
        }
        providers.forName(Db.str(task, "provider")).cancel(modeOf(task), Db.str(task, "provider_task_id"));
        db.txRun(() -> {
            if (transition(task, "CANCELLED", f("finished_at", Ids.now()))) wallet.releaseHold(task, "Hoàn credit: người dùng hủy tác vụ");
        });
        db.audit(Db.str(task, "owner_id"), "task.cancelled", Db.str(task, "id"), null);
    }

    // ---------------- polling dự phòng cho webhook ----------------
    @EventListener(ApplicationReadyEvent.class)
    public void recoverOnStartup() {
        // Task SUBMITTED chưa có provider id từ lần chạy trước → không rõ kết quả → đối soát
        db.run("UPDATE ai_tasks SET status = 'NEEDS_RECONCILIATION', updated_at = ? WHERE status = 'SUBMITTED' AND provider_task_id IS NULL AND created_at < ?",
                Ids.now(), Ids.now() - 60000);
        // Ingest bị gián đoạn do restart → cho phép thử lại
        db.run("UPDATE ai_tasks SET status = 'ASSET_ERROR', updated_at = ? WHERE status = 'INGESTING'", Ids.now());
    }

    @Scheduled(fixedDelay = 2500, initialDelay = 4000)
    public void poll() {
        if (!ticking.compareAndSet(false, true)) return;
        try {
            List<Map<String, Object>> due = db.all("""
                    SELECT id FROM ai_tasks WHERE (status IN ('QUEUED','RUNNING','NEEDS_RECONCILIATION','SUCCEEDED')
                        OR (status = 'ASSET_ERROR' AND ingest_attempts < ?))
                      AND (last_synced_at IS NULL OR last_synced_at < ?) ORDER BY updated_at LIMIT 25""",
                    MAX_INGEST_ATTEMPTS, Ids.now() - 4000);
            List<java.util.concurrent.Future<?>> futures = new ArrayList<>();
            for (Map<String, Object> t : due) {
                String id = Db.str(t, "id");
                futures.add(executor.submit(() -> {
                    try {
                        sync(id);
                    } catch (Exception e) {
                        log.error("[poller] {}", id, e);
                    }
                }));
            }
            for (var fu : futures) {
                try {
                    fu.get();
                } catch (Exception ignored) {
                    // đã log trong task
                }
            }
        } finally {
            ticking.set(false);
        }
    }
}
