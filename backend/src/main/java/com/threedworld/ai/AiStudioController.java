package com.threedworld.ai;

import com.threedworld.ai.provider.ProviderException;
import com.threedworld.ai.provider.ProviderRegistry;
import com.threedworld.auth.CurrentUser;
import com.threedworld.common.*;
import com.threedworld.pod.PrintRequestService;
import com.threedworld.storage.StorageService;
import com.threedworld.storage.StorageService.StoredFile;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Pattern;

/** API AI Studio (Image → 3D) – /api/ai-studio/** theo mục 9 của SRS. Mọi endpoint kiểm tra chủ sở hữu (chống IDOR). */
@RestController
@RequestMapping("/api/ai-studio")
public class AiStudioController {
    private static final Pattern IDEM = Pattern.compile("^[\\w-]{8,80}$");
    private static final long MAX_UPLOAD = 20L * 1024 * 1024; // giới hạn Meshy: 20 MB/ảnh
    private static final int MIN_SIDE = 256, MAX_SIDE = 8192;
    private static final List<String> MIMES = List.of("image/jpeg", "image/png", "image/webp");
    private static final Map<String, Map<String, List<String>>> POD_OPTIONS = new LinkedHashMap<>();
    private static final Map<String, String> TYPES = Map.ofEntries(
            Map.entry("glb", "model/gltf-binary"), Map.entry("stl", "model/stl"), Map.entry("obj", "text/plain"), Map.entry("mtl", "text/plain"),
            Map.entry("fbx", "application/octet-stream"), Map.entry("usdz", "model/vnd.usdz+zip"), Map.entry("3mf", "model/3mf"),
            Map.entry("png", "image/png"), Map.entry("jpg", "image/jpeg"), Map.entry("jpeg", "image/jpeg"), Map.entry("webp", "image/webp"),
            Map.entry("objzip", "application/zip"));

    static {
        POD_OPTIONS.put("FDM", Map.of("materials", List.of("PLA", "PETG", "ABS"), "qualities", List.of("0.28 mm · Nháp", "0.20 mm · Tiêu chuẩn", "0.12 mm · Chi tiết")));
        POD_OPTIONS.put("RESIN", Map.of("materials", List.of("Standard Resin", "Tough Resin"), "qualities", List.of("50 µm · Tiêu chuẩn", "25 µm · Chi tiết cao")));
    }

    private final Db db;
    private final AiDtos dto;
    private final PricingService pricing;
    private final WalletService wallet;
    private final TaskService tasks;
    private final ObjBundleService objBundles;
    private final StorageService storage;
    private final ProviderRegistry providers;
    private final PrintRequestService printRequests;
    private final AppProperties props;

    public AiStudioController(Db db, AiDtos dto, PricingService pricing, WalletService wallet, TaskService tasks, ObjBundleService objBundles,
                              StorageService storage, ProviderRegistry providers, PrintRequestService printRequests, AppProperties props) {
        this.db = db;
        this.dto = dto;
        this.pricing = pricing;
        this.wallet = wallet;
        this.tasks = tasks;
        this.objBundles = objBundles;
        this.storage = storage;
        this.providers = providers;
        this.printRequests = printRequests;
        this.props = props;
    }

    // ---------- helpers ----------
    private Map<String, Object> ownProject(CurrentUser u, String pid) {
        Map<String, Object> p = db.one("SELECT * FROM ai_projects WHERE id = ? AND owner_id = ?", pid, u.id());
        if (p == null) throw ApiException.notFound("Dự án");
        return p;
    }

    private Map<String, Object> ownVersion(CurrentUser u, String vid) {
        Map<String, Object> v = db.one("SELECT v.* FROM ai_versions v JOIN ai_projects p ON p.id = v.project_id WHERE v.id = ? AND p.owner_id = ?", vid, u.id());
        if (v == null) throw ApiException.notFound("Phiên bản");
        return v;
    }

    private Map<String, Object> ownTask(CurrentUser u, String tid) {
        Map<String, Object> t = db.one("SELECT * FROM ai_tasks WHERE id = ? AND owner_id = ?", tid, u.id());
        if (t == null) throw ApiException.notFound("Tác vụ");
        return t;
    }

    private static String idemKey(String header) {
        String key = header == null ? "" : header.trim();
        if (!IDEM.matcher(key).matches()) throw ApiException.bad("IDEMPOTENCY_KEY_REQUIRED", "Thiếu Idempotency-Key hợp lệ.");
        return key;
    }

    private static double num(Object v, double def) {
        if (v instanceof Number n) return n.doubleValue();
        if (v instanceof String s && !s.isBlank()) {
            try { return Double.parseDouble(s); } catch (NumberFormatException e) { return Double.NaN; }
        }
        return def;
    }

    private static int variantsOf(Object v) {
        double d = num(v, 1);
        if (Double.isNaN(d) || d < 1) return 1;
        return (int) Math.min(3, Math.floor(d));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> mapOf(Object o) {
        return o instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
    }

    // ---------- cấu hình / giá ----------
    @GetMapping("/config-options")
    public Map<String, Object> configOptions(CurrentUser u) {
        List<Map<String, Object>> models = new ArrayList<>();
        PricingService.MODELS.forEach((k, m) -> models.add(Map.of("id", k, "label", m.label(), "textureResolutions", List.copyOf(m.tex().keySet()), "geometryResolutions", m.geo())));
        return Map.of(
                "provider", providers.currentName(),
                "priceVersion", PricingService.PRICE_VERSION,
                "models", models,
                "presets", PricingService.PRESETS,
                "upload", Map.of("maxBytes", MAX_UPLOAD, "mimes", MIMES, "minSide", MIN_SIDE));
    }

    @PostMapping("/estimates")
    public Map<String, Object> estimates(CurrentUser u, @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> b = body == null ? Map.of() : body;
        String mode = "multi".equals(b.get("mode")) ? "multi" : "single";
        Map<String, Object> cfg = pricing.normalizeConfig(mapOf(b.get("config")), mode);
        Map<String, Object> est = pricing.estimate(cfg, variantsOf(b.get("variants")));
        long balance = wallet.balanceOf(u.id()).available();
        Map<String, Object> out = new LinkedHashMap<>(est);
        out.put("balance", balance);
        out.put("sufficient", balance >= ((Number) est.get("total")).longValue());
        out.put("config", cfg);
        return out;
    }

    // ---------- upload ảnh ----------
    @PostMapping("/uploads")
    public ResponseEntity<?> upload(CurrentUser u, @RequestParam(value = "file", required = false) MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) throw ApiException.bad("NO_FILE", "Chưa chọn tệp ảnh.");
        if (file.getSize() > MAX_UPLOAD) throw ApiException.bad("FILE_TOO_LARGE", "Ảnh vượt quá 20 MB.");
        byte[] buf = file.getBytes();
        String mime = ImageProbe.sniffMime(buf); // kiểm tra MIME thực, không tin extension/Content-Type
        if (mime == null) throw ApiException.bad("INVALID_TYPE", "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.");
        ImageProbe.Dim dim;
        try {
            dim = ImageProbe.dimensions(buf, mime);
        } catch (Exception e) {
            throw ApiException.bad("CORRUPT_IMAGE", "Không đọc được ảnh, tệp có thể bị hỏng.");
        }
        if (Math.min(dim.width(), dim.height()) < MIN_SIDE) throw ApiException.bad("IMAGE_TOO_SMALL", "Ảnh quá nhỏ (tối thiểu " + MIN_SIDE + "px mỗi cạnh).");
        if (Math.max(dim.width(), dim.height()) > MAX_SIDE) throw ApiException.bad("IMAGE_TOO_LARGE", "Ảnh quá lớn (tối đa " + MAX_SIDE + "px mỗi cạnh).");
        String imgId = Ids.id("img");
        String ext = mime.substring(6);
        StoredFile saved = storage.put("ai/" + u.id() + "/images/" + imgId + "." + ext, buf, mime);
        String original = file.getOriginalFilename() == null ? "image." + ext : file.getOriginalFilename();
        String name = original.replaceAll("[^\\p{L}\\p{N}._ -]", "_");
        if (name.length() > 120) name = name.substring(0, 120);
        db.run("INSERT INTO ai_source_images (id, owner_id, storage_key, url, mime, size_bytes, width, height, original_name, checksum, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                imgId, u.id(), saved.key(), saved.url(), mime, saved.size(), dim.width(), dim.height(), name, saved.checksum(), Ids.now());
        db.audit(u.id(), "image.upload", imgId, Map.of("size", saved.size()));
        return ResponseEntity.status(201).body(Map.of("image", dto.image(db.one("SELECT * FROM ai_source_images WHERE id = ?", imgId))));
    }

    @GetMapping("/uploads")
    public Map<String, Object> uploads(CurrentUser u) {
        return Map.of("images", db.all("SELECT * FROM ai_source_images WHERE owner_id = ? ORDER BY created_at DESC LIMIT 12", u.id()).stream().map(dto::image).toList());
    }

    @GetMapping("/uploads/{id}/file")
    public ResponseEntity<InputStreamResource> uploadFile(CurrentUser u, @PathVariable String id) {
        Map<String, Object> img = db.one("SELECT * FROM ai_source_images WHERE id = ? AND owner_id = ?", id, u.id());
        if (img == null) throw ApiException.notFound("Ảnh");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(Db.str(img, "mime")))
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)).cachePrivate())
                .body(new InputStreamResource(storage.open(Db.str(img, "url"))));
    }

    // ---------- tác vụ ----------
    @PostMapping("/tasks")
    public ResponseEntity<?> createTask(CurrentUser u, @RequestHeader(value = "Idempotency-Key", required = false) String idem,
                                        @RequestBody(required = false) Map<String, Object> body) {
        String key = idemKey(idem);
        Map<String, Object> b = body == null ? Map.of() : body;
        if (!Boolean.TRUE.equals(b.get("consent"))) throw ApiException.bad("CONSENT_REQUIRED", "Bạn cần xác nhận có quyền sử dụng ảnh trước khi Generate.");
        String mode = "multi".equals(b.get("mode")) ? "multi" : "single";
        List<String> imageIds = new ArrayList<>(new LinkedHashSet<>(b.get("imageIds") instanceof List<?> l ? l.stream().map(String::valueOf).toList() : List.of()));
        if (mode.equals("single") && imageIds.size() != 1) throw ApiException.bad("INVALID_IMAGES", "Chế độ Một ảnh cần đúng 1 ảnh.");
        if (mode.equals("multi") && (imageIds.isEmpty() || imageIds.size() > 4)) throw ApiException.bad("INVALID_IMAGES", "Multi-View cần từ 1 đến 4 ảnh.");
        for (String iid : imageIds) {
            if (db.one("SELECT 1 AS x FROM ai_source_images WHERE id = ? AND owner_id = ?", iid, u.id()) == null) throw ApiException.notFound("Ảnh nguồn");
        }
        int variants = variantsOf(b.get("variants"));
        Map<String, Object> cfg = pricing.normalizeConfig(mapOf(b.get("config")), mode);
        Map<String, Object> est = pricing.estimate(cfg, variants);
        int total = ((Number) est.get("total")).intValue();
        int perVariant = ((Number) est.get("perVariant")).intValue();
        if (!PricingService.PRICE_VERSION.equals(b.get("priceVersion")) || num(b.get("quotedCredits"), -1) != total) {
            throw new ApiException(409, "PRICE_CHANGED", "Chi phí đã thay đổi, vui lòng xác nhận lại.", Map.of("estimate", est));
        }
        String provider = providers.currentName();

        record Created(List<Map<String, Object>> tasks, boolean replay) {}
        Created created = db.tx(() -> {
            // Khóa hàng user: chống 2 request song song cùng tiêu một số dư
            db.one("SELECT id FROM users WHERE id = ? FOR UPDATE", u.id());
            List<Map<String, Object>> existing = db.all("SELECT * FROM ai_tasks WHERE owner_id = ? AND request_key = ? ORDER BY variant_index", u.id(), key);
            if (!existing.isEmpty()) return new Created(existing, true);

            long bal = wallet.balanceOf(u.id()).available();
            if (bal < total) {
                throw new ApiException(402, "INSUFFICIENT_CREDITS", "Không đủ credit: cần " + total + ", hiện có " + bal + ".", Map.of("required", total, "balance", bal));
            }
            String projectId = b.get("projectId") == null ? null : String.valueOf(b.get("projectId"));
            long now = Ids.now();
            if (projectId != null && !projectId.isBlank()) {
                ownProject(u, projectId);
                db.run("UPDATE ai_projects SET updated_at = ?, archived = FALSE WHERE id = ?", now, projectId);
            } else {
                projectId = Ids.id("prj");
                String title = String.valueOf(b.getOrDefault("title", "")).trim();
                if (title.length() > 80) title = title.substring(0, 80);
                if (title.isBlank() || "null".equals(title)) title = "Mô hình chưa đặt tên";
                db.run("INSERT INTO ai_projects (id, owner_id, title, source_mode, created_at, updated_at) VALUES (?,?,?,?,?,?)", projectId, u.id(), title, mode, now, now);
            }
            List<Map<String, Object>> list = new ArrayList<>();
            for (int i = 0; i < variants; i++) {
                String tid = Ids.id("tsk");
                db.run("""
                        INSERT INTO ai_tasks (id, owner_id, project_id, provider, type, status, request_key, variant_index, config_json, image_ids_json, credits, price_version, created_at, updated_at)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                        tid, u.id(), projectId, provider, mode.equals("multi") ? "multi-image-to-3d" : "image-to-3d", "SUBMITTED", key, i,
                        Json.write(cfg), Json.write(imageIds), perVariant, PricingService.PRICE_VERSION, now, now);
                wallet.entryOnce(u.id(), -perVariant, "HOLD", tid, "Giữ credit cho tác vụ AI");
                list.add(db.one("SELECT * FROM ai_tasks WHERE id = ?", tid));
            }
            for (String iid : imageIds) db.run("UPDATE ai_source_images SET project_id = COALESCE(project_id, ?) WHERE id = ?", projectId, iid);
            return new Created(list, false);
        });

        if (!created.replay()) {
            db.audit(u.id(), "task.create", Db.str(created.tasks().get(0), "project_id"),
                    Map.of("tasks", created.tasks().stream().map(t -> t.get("id")).toList(), "credits", total));
            for (Map<String, Object> t : created.tasks()) tasks.submitAsync(Db.str(t, "id"));
        }
        return ResponseEntity.status(created.replay() ? 200 : 201).body(Map.of(
                "projectId", created.tasks().get(0).get("project_id"),
                "tasks", created.tasks().stream().map(dto::task).toList(),
                "replay", created.replay()));
    }

    @GetMapping("/tasks")
    public Map<String, Object> listTasks(CurrentUser u, @RequestParam(required = false) String projectId, @RequestParam(required = false) String active) {
        List<Map<String, Object>> rows;
        if (projectId != null && !projectId.isBlank()) {
            ownProject(u, projectId);
            rows = db.all("SELECT * FROM ai_tasks WHERE owner_id = ? AND project_id = ? ORDER BY created_at DESC LIMIT 50", u.id(), projectId);
        } else if (active != null && !active.isBlank()) {
            rows = db.all("SELECT * FROM ai_tasks WHERE owner_id = ? AND status IN ('SUBMITTED','QUEUED','RUNNING','NEEDS_RECONCILIATION','SUCCEEDED','INGESTING') ORDER BY created_at DESC", u.id());
        } else {
            rows = db.all("SELECT * FROM ai_tasks WHERE owner_id = ? ORDER BY created_at DESC LIMIT 30", u.id());
        }
        return Map.of("tasks", rows.stream().map(dto::task).toList());
    }

    @GetMapping("/tasks/{id}")
    public Map<String, Object> getTask(CurrentUser u, @PathVariable String id) {
        return Map.of("task", dto.task(ownTask(u, id)));
    }

    @PostMapping("/tasks/{id}/refresh")
    public Map<String, Object> refreshTask(CurrentUser u, @PathVariable String id) {
        Map<String, Object> t = ownTask(u, id);
        tasks.sync(Db.str(t, "id"));
        return Map.of("task", dto.task(db.one("SELECT * FROM ai_tasks WHERE id = ?", id)));
    }

    @PostMapping("/tasks/{id}/cancel")
    public Map<String, Object> cancelTask(CurrentUser u, @PathVariable String id) {
        Map<String, Object> t = ownTask(u, id);
        try {
            tasks.cancel(t);
        } catch (ProviderException e) {
            throw ApiException.conflict(e.code(), "PROVIDER_CONFLICT".equals(e.code()) ? "Tác vụ đã bắt đầu xử lý, không thể hủy." : e.getMessage());
        }
        return Map.of("task", dto.task(db.one("SELECT * FROM ai_tasks WHERE id = ?", id)));
    }

    // ---------- dự án / thư viện ----------
    @GetMapping("/projects")
    public Map<String, Object> projects(CurrentUser u, @RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "all") String tab,
                                        @RequestParam(defaultValue = "") String mode, @RequestParam(defaultValue = "") String status,
                                        @RequestParam(defaultValue = "newest") String sort, @RequestParam(defaultValue = "1") String page,
                                        @RequestParam(defaultValue = "9") String pageSize) {
        List<String> where = new ArrayList<>(List.of("owner_id = ?"));
        List<Object> params = new ArrayList<>(List.of(u.id()));
        where.add(tab.equals("archived") ? "archived = TRUE" : "archived = FALSE");
        if (tab.equals("favorites")) where.add("favorite = TRUE");
        if (tab.equals("recent")) { where.add("updated_at > ?"); params.add(Ids.now() - 7L * 24 * 3600 * 1000); }
        String query = q.trim().toLowerCase();
        if (!query.isEmpty()) { where.add("LOWER(title) LIKE ?"); params.add("%" + query + "%"); }
        if (mode.equals("single") || mode.equals("multi")) { where.add("source_mode = ?"); params.add(mode); }
        String order = switch (sort) {
            case "oldest" -> "updated_at ASC";
            case "name" -> "LOWER(title) ASC";
            default -> "updated_at DESC";
        };
        List<Map<String, Object>> items = db.all("SELECT * FROM ai_projects WHERE " + String.join(" AND ", where) + " ORDER BY " + order, params.toArray())
                .stream().map(dto::projectSummary).toList();
        if (!status.isBlank()) items = items.stream().filter(p -> status.equals(p.get("status"))).toList();
        int pg = Math.max(1, (int) num(page, 1));
        int size = (int) Math.min(48, Math.max(1, num(pageSize, 9)));
        int from = Math.min(items.size(), (pg - 1) * size);
        int to = Math.min(items.size(), pg * size);
        return Map.of("items", items.subList(from, to), "total", items.size(), "page", pg, "pageSize", size);
    }

    @GetMapping("/projects/{id}")
    public Map<String, Object> project(CurrentUser u, @PathVariable String id) {
        Map<String, Object> p = ownProject(u, id);
        List<Map<String, Object>> versions = db.all("SELECT * FROM ai_versions WHERE project_id = ? ORDER BY created_at", id).stream().map(dto::version).toList();
        List<Map<String, Object>> taskList = db.all("SELECT * FROM ai_tasks WHERE project_id = ? ORDER BY created_at DESC", id).stream().map(dto::task).toList();
        LinkedHashSet<Object> imageIds = new LinkedHashSet<>();
        for (Map<String, Object> t : taskList) imageIds.addAll((List<?>) t.get("imageIds"));
        List<Map<String, Object>> images = new ArrayList<>();
        for (Object iid : imageIds) {
            Map<String, Object> img = db.one("SELECT * FROM ai_source_images WHERE id = ?", iid);
            if (img != null) images.add(dto.image(img));
        }
        return Map.of("project", dto.projectSummary(p), "versions", versions, "tasks", taskList, "images", images);
    }

    @PatchMapping("/projects/{id}")
    public Map<String, Object> patchProject(CurrentUser u, @PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> p = ownProject(u, id);
        Map<String, Object> b = body == null ? Map.of() : body;
        if (b.containsKey("title")) {
            String title = String.valueOf(b.get("title")).trim();
            if (title.length() > 80) title = title.substring(0, 80);
            if (title.isEmpty() || b.get("title") == null) throw ApiException.bad("INVALID_TITLE", "Tên dự án không được để trống.");
            db.run("UPDATE ai_projects SET title = ? WHERE id = ?", title, id);
        }
        if (b.containsKey("favorite")) db.run("UPDATE ai_projects SET favorite = ? WHERE id = ?", Boolean.TRUE.equals(b.get("favorite")), id);
        if (b.containsKey("archived")) db.run("UPDATE ai_projects SET archived = ? WHERE id = ?", Boolean.TRUE.equals(b.get("archived")), id);
        if (b.containsKey("activeVersionId")) {
            String vid = String.valueOf(b.get("activeVersionId"));
            if (db.one("SELECT 1 AS x FROM ai_versions WHERE id = ? AND project_id = ?", vid, id) == null) throw ApiException.notFound("Phiên bản");
            db.run("UPDATE ai_projects SET active_version_id = ? WHERE id = ?", vid, id);
        }
        db.run("UPDATE ai_projects SET updated_at = ? WHERE id = ?", Ids.now(), id);
        db.audit(u.id(), "project.update", Db.str(p, "id"), b);
        return Map.of("project", dto.projectSummary(db.one("SELECT * FROM ai_projects WHERE id = ?", id)));
    }

    // ---------- phiên bản / xuất / kích thước ----------
    @GetMapping("/versions/{id}")
    public Map<String, Object> version(CurrentUser u, @PathVariable String id) {
        return Map.of("version", dto.version(ownVersion(u, id)));
    }

    @PutMapping("/versions/{id}/dimensions")
    public Map<String, Object> dimensions(CurrentUser u, @PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> v = ownVersion(u, id);
        Map<String, Object> d = body == null ? Map.of() : body;
        double[] dims = {num(d.get("lengthMm"), Double.NaN), num(d.get("widthMm"), Double.NaN), num(d.get("heightMm"), Double.NaN)};
        for (double x : dims) if (!Double.isFinite(x) || x <= 0) throw ApiException.bad("INVALID_DIMENSIONS", "Kích thước phải là số dương.");
        for (double x : dims) if (x < 5) throw ApiException.bad("DIMENSION_TOO_SMALL", "Mỗi chiều tối thiểu 5 mm.");
        for (double x : dims) if (x > 1000) throw ApiException.bad("DIMENSION_TOO_LARGE", "Mỗi chiều tối đa 1000 mm (giới hạn máy in).");
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("lengthMm", dims[0]);
        value.put("widthMm", dims[1]);
        value.put("heightMm", dims[2]);
        value.put("keepRatio", !Boolean.FALSE.equals(d.get("keepRatio")));
        value.put("confirmedAt", Ids.now());
        db.run("UPDATE ai_versions SET dims_json = ? WHERE id = ?", Json.write(value), Db.str(v, "id"));
        db.audit(u.id(), "version.dimensions", id, value);
        return Map.of("version", dto.version(db.one("SELECT * FROM ai_versions WHERE id = ?", id)));
    }

    @PostMapping("/versions/{id}/exports")
    public Map<String, Object> export(CurrentUser u, @PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> v = ownVersion(u, id);
        String format = String.valueOf(body == null ? "" : body.getOrDefault("format", "")).toLowerCase();
        if (format.equals("obj")) {
            // OBJ luôn xuất dạng ZIP: model.obj + model.mtl + ảnh texture
            ObjBundleService.Bundle bundle = objBundles.ensureObjBundle(v, u.id());
            if (bundle == null) throw ApiException.conflict("FORMAT_UNAVAILABLE", "Định dạng OBJ chưa có cho phiên bản này.");
            db.audit(u.id(), "version.export", id, Map.of("format", "obj-zip", "texturesIncluded", bundle.texturesIncluded()));
            return Map.of("downloadUrl", "/api/ai-studio/assets/" + bundle.asset().get("id") + "/file?download=1", "format", "obj", "packaging", "zip",
                    "sizeBytes", Db.lng(bundle.asset(), "size_bytes"), "files", bundle.files(), "texturesIncluded", bundle.texturesIncluded());
        }
        Map<String, Object> a = db.one("SELECT * FROM ai_assets WHERE version_id = ? AND kind = 'model' AND format = ?", id, format);
        if (a == null) throw ApiException.conflict("FORMAT_UNAVAILABLE", "Định dạng " + format.toUpperCase() + " chưa có cho phiên bản này.");
        db.audit(u.id(), "version.export", id, Map.of("format", format));
        return Map.of("downloadUrl", "/api/ai-studio/assets/" + a.get("id") + "/file?download=1", "format", format, "sizeBytes", Db.lng(a, "size_bytes"));
    }

    @GetMapping("/assets/{id}/file")
    public ResponseEntity<InputStreamResource> assetFile(CurrentUser u, @PathVariable String id, @RequestParam(required = false) String download) {
        Map<String, Object> a = db.one("SELECT * FROM ai_assets WHERE id = ? AND owner_id = ?", id, u.id());
        if (a == null) throw ApiException.notFound("Tệp");
        String format = Db.str(a, "format");
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.parseMediaType(TYPES.getOrDefault(format, "application/octet-stream")));
        h.setCacheControl(CacheControl.maxAge(java.time.Duration.ofDays(1)).cachePrivate());
        if (download != null && !download.isBlank()) {
            Map<String, Object> v = db.one("SELECT v.label, p.title FROM ai_versions v JOIN ai_projects p ON p.id = v.project_id WHERE v.id = ?", a.get("version_id"));
            String base = (Db.str(v, "title") + "_" + Db.str(v, "label").split(" ")[0]).replaceAll("[^\\p{L}\\p{N}_-]+", "_");
            String fname = "objzip".equals(format) ? base + "_OBJ.zip" : base + "." + format;
            h.setContentDisposition(ContentDisposition.attachment().filename(fname, StandardCharsets.UTF_8).build());
        }
        if (a.get("size_bytes") != null) h.setContentLength(Db.lng(a, "size_bytes"));
        return new ResponseEntity<>(new InputStreamResource(storage.open(Db.str(a, "url"))), h, HttpStatus.OK);
    }

    // ---------- bàn giao In 3D (POD) ----------
    @GetMapping("/pod-options")
    public Map<String, Object> podOptions(CurrentUser u) {
        return Map.of("options", POD_OPTIONS);
    }

    @PostMapping("/versions/{id}/pod-handoffs")
    public ResponseEntity<?> podHandoff(CurrentUser u, @PathVariable String id, @RequestHeader(value = "Idempotency-Key", required = false) String idem,
                                        @RequestBody(required = false) Map<String, Object> body) {
        String key = idemKey(idem);
        Map<String, Object> v = ownVersion(u, id);
        Map<String, Object> prev = printRequests.findByKey(u.id(), key);
        if (prev != null) return ResponseEntity.ok(Map.of("handoff", dto.handoff(prev), "replay", true));
        Map<String, Object> b = body == null ? Map.of() : body;
        if (!Boolean.TRUE.equals(b.get("confirm"))) throw ApiException.bad("CONFIRM_REQUIRED", "Bạn cần xác nhận thông tin trước khi gửi.");
        if (v.get("dims_json") == null) throw ApiException.bad("DIMENSIONS_REQUIRED", "Hãy xác nhận kích thước thật trước khi gửi yêu cầu in.");
        Map<String, List<String>> tech = POD_OPTIONS.get(String.valueOf(b.get("technology")));
        if (tech == null) throw ApiException.bad("INVALID_TECHNOLOGY", "Công nghệ in không hợp lệ.");
        if (!tech.get("materials").contains(String.valueOf(b.get("material"))) || !tech.get("qualities").contains(String.valueOf(b.get("quality")))) {
            throw ApiException.bad("INVALID_POD_CONFIG", "Tổ hợp vật liệu/chất lượng không được phép.");
        }
        long quantity = Math.round(num(b.get("quantity"), 1));
        if (quantity < 1 || quantity > 100) throw ApiException.bad("INVALID_QUANTITY", "Số lượng từ 1 đến 100.");
        List<Map<String, Object>> files = new ArrayList<>();
        for (Map<String, Object> f : db.all("SELECT id, format, checksum, size_bytes, url FROM ai_assets WHERE version_id = ? AND kind = 'model'", id)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", f.get("id"));
            m.put("format", f.get("format"));
            m.put("checksum", f.get("checksum"));
            m.put("size_bytes", Db.lng(f, "size_bytes"));
            m.put("url", f.get("url"));
            files.add(m);
        }
        if (files.stream().noneMatch(f -> List.of("stl", "glb", "3mf", "obj").contains(f.get("format")))) {
            throw ApiException.bad("NO_PRINTABLE_FILE", "Phiên bản chưa có tệp phù hợp để in.");
        }
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("technology", b.get("technology"));
        cfg.put("material", b.get("material"));
        cfg.put("quality", b.get("quality"));
        String color = String.valueOf(b.getOrDefault("color", ""));
        cfg.put("color", color.length() > 40 ? color.substring(0, 40) : color);
        cfg.put("quantity", quantity);
        String note = String.valueOf(b.getOrDefault("note", ""));
        cfg.put("note", note.length() > 1000 ? note.substring(0, 1000) : note);
        cfg.put("dimensions", Json.map(Db.str(v, "dims_json")));
        // Luôn tạo PrintRequest mới + snapshot bất biến (BR-17). Báo giá & thanh toán do module POD xử lý (BR-18).
        Map<String, Object> h = printRequests.create(u.id(), key, PrintRequestService.Source.ai(id), cfg, files, "AWAITING_STAFF_REVIEW", PrintRequestService.aiPrefix());
        return ResponseEntity.status(201).body(Map.of("handoff", dto.handoff(h)));
    }

    @GetMapping("/pod-handoffs")
    public Map<String, Object> handoffs(CurrentUser u) {
        return Map.of("handoffs", db.all("SELECT * FROM print_requests WHERE owner_id = ? AND source = 'AI' ORDER BY created_at DESC", u.id()).stream().map(dto::handoff).toList());
    }

    // ---------- ví credit ----------
    @GetMapping("/wallet")
    public Map<String, Object> wallet(CurrentUser u) {
        WalletService.Balance b = wallet.balanceOf(u.id());
        long spent = db.count("SELECT COALESCE(SUM(t.credits),0) FROM credit_ledger l JOIN ai_tasks t ON t.id = l.task_id WHERE l.owner_id = ? AND l.type = 'SETTLE'", u.id());
        return Map.of("balance", b.available(), "held", b.held(), "spent", spent, "ledger", wallet.history(u.id(), 50));
    }

    /** Nạp credit DEMO: chưa tích hợp cổng thanh toán (FRD-AI-026 là M1). */
    @PostMapping("/wallet/topup")
    public Map<String, Object> topup(CurrentUser u, @RequestBody(required = false) Map<String, Object> body) {
        int amount = (int) num(body == null ? null : body.get("amount"), 0);
        if (!List.of(100, 500, 1000).contains(amount)) throw ApiException.bad("INVALID_AMOUNT", "Gói nạp không hợp lệ.");
        if (!props.demoTopupEnabled()) throw new ApiException(403, "TOPUP_DISABLED", "Nạp credit demo bị tắt trên môi trường production.");
        wallet.addEntry(u.id(), amount, "TOPUP", null, "Nạp demo " + amount + " credit");
        db.audit(u.id(), "wallet.topup_demo", u.id(), Map.of("amount", amount));
        return Map.of("balance", wallet.balanceOf(u.id()).available());
    }
}
