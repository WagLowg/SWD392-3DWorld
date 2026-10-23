package com.threedworld.ai;

import com.threedworld.ai.TaskService.PendingAsset;
import com.threedworld.ai.provider.ProviderAdapter.ProviderTask;
import com.threedworld.ai.provider.ProviderRegistry;
import com.threedworld.common.Db;
import com.threedworld.common.Ids;
import com.threedworld.storage.StorageService;
import com.threedworld.storage.StorageService.StoredFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Gói OBJ: model.obj + model.mtl + ảnh texture, đóng ZIP.
 * Meshy trả texture qua texture_urls (base_color, metallic, roughness, normal, emission);
 * MTL của Meshy chỉ tham chiếu ảnh base color, nên MTL được viết lại để trỏ đúng tên file và thêm map PBR.
 */
@Service
public class ObjBundleService {
    private static final Logger log = LoggerFactory.getLogger(ObjBundleService.class);
    private static final List<String> MAP_KEYS = List.of("base_color", "metallic", "roughness", "normal", "emission");
    private static final Pattern TEX_NAME = Pattern.compile("^texture_(\\d+)(?:_(\\w+))?\\.\\w+$");

    private final Db db;
    private final StorageService storage;
    private final ProviderRegistry providers;

    public ObjBundleService(Db db, StorageService storage, ProviderRegistry providers) {
        this.db = db;
        this.storage = storage;
        this.providers = providers;
    }

    public record Bundle(Map<String, Object> asset, List<Map<String, Object>> files, boolean texturesIncluded) {}

    private static String extOf(String url) {
        try {
            String p = URI.create(url).getPath().toLowerCase();
            String e = p.contains(".") ? p.substring(p.lastIndexOf('.') + 1) : "";
            return List.of("png", "jpg", "jpeg", "webp").contains(e) ? e : "png";
        } catch (Exception e) {
            return "png";
        }
    }

    /** Tải ảnh texture về storage. Tên: texture_{i}.{ext} (base color, khớp MTL của Meshy), texture_{i}_{map}.{ext} cho map khác. */
    public List<PendingAsset> downloadTextures(String ownerId, String versionId, List<Map<String, String>> textureUrls) {
        List<PendingAsset> out = new ArrayList<>();
        if (textureUrls == null) return out;
        for (int i = 0; i < textureUrls.size(); i++) {
            Map<String, String> set = textureUrls.get(i);
            for (String key : MAP_KEYS) {
                String url = set == null ? null : set.get(key);
                if (url == null || url.isBlank()) continue;
                String ext = extOf(url);
                String name = "texture_" + i + (key.equals("base_color") ? "" : "_" + key) + "." + ext;
                try {
                    // lưu dạng raw để giữ nguyên byte
                    StoredFile sf = storage.put("ai/" + ownerId + "/" + versionId + "/textures/" + name, TaskService.download(url), "application/octet-stream");
                    out.add(new PendingAsset("texture", ext, name, sf));
                } catch (Exception e) {
                    log.warn("[textures] {} bỏ qua {}: {}", versionId, name, e.getMessage());
                }
            }
        }
        return out;
    }

    private void insert(String ownerId, String versionId, PendingAsset s) {
        db.run("INSERT INTO ai_assets (id, version_id, owner_id, kind, format, file_name, storage_key, url, size_bytes, checksum, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                Ids.id("ast"), versionId, ownerId, s.kind(), s.format(), s.fileName(), s.file().key(), s.file().url(), s.file().size(), s.file().checksum(), Ids.now());
    }

    private List<Map<String, Object>> texturesOf(String versionId) {
        return db.all("SELECT * FROM ai_assets WHERE version_id = ? AND kind = 'texture' ORDER BY file_name", versionId);
    }

    /** Bổ sung texture cho phiên bản tạo trước khi có tính năng này (nếu task Meshy còn hạn). */
    private void backfillTextures(Map<String, Object> version, String ownerId) {
        String vid = Db.str(version, "id");
        if (!texturesOf(vid).isEmpty()) return;
        String srcTask = Db.str(version, "source_task_id");
        Map<String, Object> task = srcTask == null ? null : db.one("SELECT * FROM ai_tasks WHERE id = ?", srcTask);
        if (task == null || task.get("provider_task_id") == null || !"meshy".equals(task.get("provider"))) return;
        try {
            ProviderTask r = providers.forName("meshy").get(TaskService.modeOf(task), Db.str(task, "provider_task_id"));
            List<PendingAsset> list = downloadTextures(ownerId, vid, r.textureUrls());
            if (!list.isEmpty() && texturesOf(vid).isEmpty()) list.forEach(s -> insert(ownerId, vid, s));
        } catch (Exception e) {
            log.warn("[textures] không bổ sung được cho {}: {}", vid, e.getMessage());
        }
    }

    /** Viết lại MTL: mỗi khối newmtl thứ i trỏ tới texture bộ i (hoặc bộ 0), thêm map PBR. */
    static String rewriteMtl(String mtl, List<String> texNames) {
        Map<String, Map<String, String>> sets = new HashMap<>();
        for (String n : texNames) {
            Matcher m = TEX_NAME.matcher(n);
            if (!m.matches()) continue;
            sets.computeIfAbsent(m.group(1), k -> new HashMap<>()).put(m.group(2) == null ? "base_color" : m.group(2), n);
        }
        List<String> out = new ArrayList<>();
        int[] idx = {-1};
        Runnable flush = () -> {
            if (idx[0] < 0) return;
            Map<String, String> s = sets.getOrDefault(String.valueOf(idx[0]), sets.get("0"));
            if (s == null) return;
            if (s.containsKey("base_color")) out.add("map_Kd " + s.get("base_color"));
            if (s.containsKey("roughness")) out.add("map_Pr " + s.get("roughness"));
            if (s.containsKey("metallic")) out.add("map_Pm " + s.get("metallic"));
            if (s.containsKey("normal")) { out.add("norm " + s.get("normal")); out.add("map_Bump " + s.get("normal")); }
            if (s.containsKey("emission")) out.add("map_Ke " + s.get("emission"));
        };
        Pattern drop = Pattern.compile("^\\s*(map_\\w+|norm|bump|disp)\\s.*", Pattern.CASE_INSENSITIVE);
        for (String l : mtl.split("\\r?\\n")) {
            if (drop.matcher(l).matches()) continue;
            if (l.matches("^\\s*newmtl\\s.*")) { flush.run(); idx[0]++; }
            out.add(l);
        }
        flush.run();
        return String.join("\n", out).replaceAll("\\n+$", "") + "\n";
    }

    private static Map<String, Object> file(String name, Long size) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("sizeBytes", size);
        return m;
    }

    /** Tạo (hoặc dùng lại) gói ZIP OBJ cho phiên bản. Kết quả lưu như asset kind 'bundle', format 'objzip'. */
    public Bundle ensureObjBundle(Map<String, Object> version, String ownerId) {
        String vid = Db.str(version, "id");
        Map<String, Object> obj = db.one("SELECT * FROM ai_assets WHERE version_id = ? AND kind = 'model' AND format = 'obj'", vid);
        if (obj == null) return null;
        Map<String, Object> cached = db.one("SELECT * FROM ai_assets WHERE version_id = ? AND kind = 'bundle' AND format = 'objzip'", vid);

        backfillTextures(version, ownerId);
        List<Map<String, Object>> textures = texturesOf(vid);
        if (cached != null) {
            // Gói cũ còn dùng được nếu được tạo sau khi đã có đủ texture
            long newestTex = textures.stream().mapToLong(t -> Db.lng(t, "created_at")).max().orElse(0);
            if (Db.lng(cached, "created_at") >= newestTex) {
                List<Map<String, Object>> files = new ArrayList<>();
                files.add(file("model.obj", Db.lng(obj, "size_bytes")));
                files.add(file("model.mtl", null));
                textures.forEach(t -> files.add(file(Db.str(t, "file_name"), Db.lng(t, "size_bytes"))));
                return new Bundle(cached, files, !textures.isEmpty());
            }
            db.run("DELETE FROM ai_assets WHERE id = ?", Db.str(cached, "id"));
        }

        Map<String, Object> mtlAsset = db.one("SELECT * FROM ai_assets WHERE version_id = ? AND kind = 'model' AND format = 'mtl'", vid);
        LinkedHashMap<String, byte[]> texEntries = new LinkedHashMap<>();
        for (Map<String, Object> t : textures) texEntries.put(Db.str(t, "file_name"), storage.read(Db.str(t, "url")));
        String mtl = mtlAsset != null ? new String(storage.read(Db.str(mtlAsset, "url")), StandardCharsets.UTF_8) : "newmtl Material\nKd 0.8 0.8 0.8\n";
        mtl = rewriteMtl(mtl, new ArrayList<>(texEntries.keySet()));

        // Đảm bảo OBJ trỏ tới model.mtl
        byte[] objBuf = storage.read(Db.str(obj, "url"));
        int headLen = Math.min(4096, objBuf.length);
        String head = new String(objBuf, 0, headLen, StandardCharsets.UTF_8);
        Matcher m = Pattern.compile("(?m)^mtllib\\s+(.+)$").matcher(head);
        if (!m.find()) {
            objBuf = concat("mtllib model.mtl\n".getBytes(StandardCharsets.UTF_8), objBuf);
        } else if (!m.group(1).trim().equals("model.mtl")) {
            // chỉ thay trong phần đầu (ASCII), giữ nguyên phần còn lại
            String fixed = head.replaceFirst("(?m)^mtllib\\s+.+$", "mtllib model.mtl");
            int headBytes = head.getBytes(StandardCharsets.UTF_8).length;
            objBuf = concat(fixed.getBytes(StandardCharsets.UTF_8), Arrays.copyOfRange(objBuf, Math.min(headBytes, objBuf.length), objBuf.length));
        }

        LinkedHashMap<String, byte[]> entries = new LinkedHashMap<>();
        entries.put("model.obj", objBuf);
        entries.put("model.mtl", mtl.getBytes(StandardCharsets.UTF_8));
        entries.putAll(texEntries);
        byte[] zip = zip(entries);
        StoredFile sf = storage.put("ai/" + ownerId + "/" + vid + "/model_obj.zip", zip, "application/zip");
        String assetId = Ids.id("ast");
        db.run("INSERT INTO ai_assets (id, version_id, owner_id, kind, format, file_name, storage_key, url, size_bytes, checksum, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                assetId, vid, ownerId, "bundle", "objzip", "model_obj.zip", sf.key(), sf.url(), sf.size(), sf.checksum(), Ids.now());
        List<Map<String, Object>> files = new ArrayList<>();
        entries.forEach((k, v) -> files.add(file(k, (long) v.length)));
        db.audit(ownerId, "bundle.created", vid, Map.of("assetId", assetId, "textures", textures.size()));
        return new Bundle(db.one("SELECT * FROM ai_assets WHERE id = ?", assetId), files, !textures.isEmpty());
    }

    private static byte[] concat(byte[] a, byte[] b) {
        byte[] out = Arrays.copyOf(a, a.length + b.length);
        System.arraycopy(b, 0, out, a.length, b.length);
        return out;
    }

    static byte[] zip(Map<String, byte[]> entries) {
        try (ByteArrayOutputStream bos = new ByteArrayOutputStream(); ZipOutputStream zos = new ZipOutputStream(bos, StandardCharsets.UTF_8)) {
            for (Map.Entry<String, byte[]> e : entries.entrySet()) {
                zos.putNextEntry(new ZipEntry(e.getKey()));
                zos.write(e.getValue());
                zos.closeEntry();
            }
            zos.finish();
            return bos.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
