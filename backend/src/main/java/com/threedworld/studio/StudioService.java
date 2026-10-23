package com.threedworld.studio;

import com.fasterxml.jackson.databind.JsonNode;
import com.threedworld.common.*;
import com.threedworld.pod.PrintRequestService;
import com.threedworld.storage.StorageService;
import com.threedworld.storage.StorageService.StoredFile;
import org.springframework.stereotype.Service;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

/**
 * 3D Studio: dự án editor theo tài khoản.
 * - Scene (JSON các node) lưu ở Cloudinary theo từng revision; DB giữ revision hiện tại + URL.
 * - Lưu dùng baseRevision: khác revision server → 409 REVISION_CONFLICT (FR-002).
 * - Snapshot gửi in: STL đã bake (mm) lưu Cloudinary, bất biến khi READY.
 */
@Service
public class StudioService {
    static final int MAX_NAME = 120;
    static final int MAX_NODES = 1000;
    static final long MAX_STL_BYTES = 50L * 1024 * 1024;
    private static final Pattern SNAP_CODE = Pattern.compile("^S-\\d{3,6}$");
    private static final Map<String, String> TECH = Map.of("fdm", "FDM (in nhựa sợi)", "sla", "SLA (in nhựa lỏng)");
    private static final Map<String, String> MATERIAL_TECH = Map.of("pla", "fdm", "petg", "fdm", "resin-std", "sla");

    private final Db db;
    private final StorageService storage;
    private final PrintRequestService printRequests;

    public StudioService(Db db, StorageService storage, PrintRequestService printRequests) {
        this.db = db;
        this.storage = storage;
        this.printRequests = printRequests;
    }

    // ---------------- helpers ----------------
    static String iso(long ms) {
        return Instant.ofEpochMilli(ms).toString();
    }

    static String validateName(Object raw) {
        String t = raw == null ? "" : raw.toString().trim();
        if (t.isEmpty()) throw ApiException.bad("INVALID_NAME", "Tên dự án là bắt buộc. 1–" + MAX_NAME + " ký tự.");
        if (t.codePointCount(0, t.length()) > MAX_NAME) throw ApiException.bad("INVALID_NAME", "Tối đa " + MAX_NAME + " ký tự.");
        return t;
    }

    static String truncateName(String s) {
        if (s.codePointCount(0, s.length()) <= MAX_NAME) return s;
        return s.substring(0, s.offsetByCodePoints(0, MAX_NAME));
    }

    Map<String, Object> own(CurrentUserId u, String id) {
        Map<String, Object> p = db.one("SELECT * FROM studio_projects WHERE id = ? AND owner_id = ? AND deleted = FALSE", id, u.id());
        if (p == null) throw ApiException.notFound("Dự án");
        return p;
    }

    public record CurrentUserId(String id) {}

    Map<String, Object> meta(Map<String, Object> p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.get("id"));
        m.put("name", p.get("name"));
        m.put("createdAt", iso(Db.lng(p, "created_at")));
        m.put("updatedAt", iso(Db.lng(p, "updated_at")));
        m.put("status", p.get("status"));
        m.put("unit", p.get("unit"));
        m.put("preset", p.get("preset"));
        m.put("templateId", p.get("template_id"));
        m.put("icon", p.get("icon"));
        m.put("revision", Db.integer(p, "revision"));
        String turl = Db.str(p, "thumbnail_url");
        m.put("thumbnail", turl == null ? null : Optional.ofNullable(storage.browserUrl(turl))
                .orElse("/api/studio/projects/" + p.get("id") + "/thumbnail?v=" + Db.integer(p, "revision")));
        return m;
    }

    /** Kiểm tra sơ bộ nodes: phải là mảng, ≤ MAX_NODES. Nội dung chi tiết do editor validate. */
    private static List<?> nodesOf(Object raw) {
        if (!(raw instanceof List<?> l)) throw ApiException.bad("INVALID_SCENE", "Scene không hợp lệ (nodes phải là mảng).");
        if (l.size() > MAX_NODES) throw ApiException.bad("INVALID_SCENE", "Tối đa " + MAX_NODES + " node trong scene.");
        return l;
    }

    private StoredFile putScene(String owner, String pid, int revision, List<?> nodes) {
        return storage.put("studio/" + owner + "/" + pid + "/scene-r" + revision + ".json", Json.bytes(Map.of("nodes", nodes)), "application/json");
    }

    /** Thumbnail data URL (PNG/JPEG) do editor render → Cloudinary. */
    private StoredFile putThumbnail(String owner, String pid, int revision, Object dataUrl) {
        if (!(dataUrl instanceof String s) || !s.startsWith("data:image/")) return null;
        int comma = s.indexOf(',');
        if (comma < 0 || !s.substring(0, comma).endsWith(";base64")) return null;
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(s.substring(comma + 1));
        } catch (IllegalArgumentException e) {
            return null;
        }
        if (bytes.length > 4 * 1024 * 1024) return null;
        String mime = com.threedworld.ai.ImageProbe.sniffMime(bytes);
        if (mime == null) return null;
        return storage.put("studio/" + owner + "/" + pid + "/thumb-r" + revision + "." + mime.substring(6), bytes, mime);
    }

    // ---------------- projects ----------------
    public List<Map<String, Object>> list(CurrentUserId u) {
        return db.all("SELECT * FROM studio_projects WHERE owner_id = ? AND deleted = FALSE ORDER BY updated_at DESC", u.id()).stream().map(this::meta).toList();
    }

    public Map<String, Object> create(CurrentUserId u, Map<String, Object> b) {
        String name = validateName(b.get("name"));
        List<?> nodes = b.get("nodes") == null ? List.of() : nodesOf(b.get("nodes"));
        String pid = Ids.id("prj");
        StoredFile scene = putScene(u.id(), pid, 1, nodes);
        StoredFile thumb = putThumbnail(u.id(), pid, 1, b.get("thumbnail"));
        long now = Ids.now();
        db.run("""
                INSERT INTO studio_projects (id, owner_id, name, status, unit, preset, template_id, icon, revision, scene_key, scene_url,
                  thumbnail_key, thumbnail_url, created_at, updated_at, saved_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                pid, u.id(), name, "draft", "mm", str(b.get("preset"), 40), str(b.get("templateId"), 60), Optional.ofNullable(str(b.get("icon"), 40)).orElse("box"),
                1, scene.key(), scene.url(), thumb == null ? null : thumb.key(), thumb == null ? null : thumb.url(), now, now, now);
        db.audit(u.id(), "studio.project_create", pid, Map.of("template", String.valueOf(b.get("templateId"))));
        return meta(own(u, pid));
    }

    private static String str(Object o, int max) {
        if (o == null) return null;
        String s = o.toString().trim();
        if (s.isEmpty()) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }

    public Map<String, Object> get(CurrentUserId u, String id) {
        Map<String, Object> p = own(u, id);
        JsonNode scene = Json.tree(storage.read(Db.str(p, "scene_url")));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("revision", Db.integer(p, "revision"));
        out.put("name", p.get("name"));
        out.put("nodes", scene.path("nodes"));
        out.put("savedAt", iso(Db.lng(p, "saved_at")));
        out.put("meta", meta(p));
        return out;
    }

    public Map<String, Object> saveContent(CurrentUserId u, String id, Map<String, Object> b) {
        Map<String, Object> p = own(u, id);
        if (!(b.get("baseRevision") instanceof Number base)) throw ApiException.bad("BASE_REVISION_REQUIRED", "Thiếu baseRevision.");
        String name = validateName(b.get("name"));
        List<?> nodes = nodesOf(b.get("nodes"));
        int current = Db.integer(p, "revision");
        if (base.intValue() != current) {
            throw new ApiException(409, "REVISION_CONFLICT", "Server đã ở revision " + current + ".", Map.of("currentRevision", current));
        }
        int next = current + 1;
        // Upload trước (file mới theo revision, không ghi đè), rồi compare-and-set revision trong DB
        StoredFile scene = putScene(u.id(), id, next, nodes);
        StoredFile thumb = putThumbnail(u.id(), id, next, b.get("thumbnail"));
        long now = Ids.now();
        int changed = db.run("""
                UPDATE studio_projects SET revision = ?, name = ?, status = 'saved', scene_key = ?, scene_url = ?,
                  thumbnail_key = COALESCE(?, thumbnail_key), thumbnail_url = COALESCE(?, thumbnail_url), updated_at = ?, saved_at = ?
                WHERE id = ? AND revision = ?""",
                next, name, scene.key(), scene.url(), thumb == null ? null : thumb.key(), thumb == null ? null : thumb.url(), now, now, id, current);
        if (changed == 0) {
            storage.delete(scene.key(), scene.url());
            if (thumb != null) storage.delete(thumb.key(), thumb.url());
            Map<String, Object> fresh = db.one("SELECT revision FROM studio_projects WHERE id = ?", id);
            int rev = fresh == null ? current : Db.integer(fresh, "revision");
            throw new ApiException(409, "REVISION_CONFLICT", "Server đã ở revision " + rev + ".", Map.of("currentRevision", rev));
        }
        // Dọn file revision cũ (best-effort)
        storage.delete(Db.str(p, "scene_key"), Db.str(p, "scene_url"));
        if (thumb != null && p.get("thumbnail_key") != null) storage.delete(Db.str(p, "thumbnail_key"), Db.str(p, "thumbnail_url"));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("revision", next);
        out.put("savedAt", iso(now));
        out.put("project", meta(own(u, id)));
        return out;
    }

    public Map<String, Object> rename(CurrentUserId u, String id, Map<String, Object> b) {
        own(u, id);
        String name = validateName(b.get("name"));
        db.run("UPDATE studio_projects SET name = ?, updated_at = ? WHERE id = ?", name, Ids.now(), id);
        return meta(own(u, id));
    }

    /** Nhân bản: bản sao độc lập (id mới, file scene + thumbnail mới). */
    public Map<String, Object> duplicate(CurrentUserId u, String id) {
        Map<String, Object> src = own(u, id);
        String pid = Ids.id("prj");
        byte[] sceneBytes = storage.read(Db.str(src, "scene_url"));
        StoredFile scene = storage.put("studio/" + u.id() + "/" + pid + "/scene-r1.json", sceneBytes, "application/json");
        StoredFile thumb = null;
        if (src.get("thumbnail_url") != null) {
            try {
                byte[] t = storage.read(Db.str(src, "thumbnail_url"));
                String mime = com.threedworld.ai.ImageProbe.sniffMime(t);
                if (mime != null) thumb = storage.put("studio/" + u.id() + "/" + pid + "/thumb-r1." + mime.substring(6), t, mime);
            } catch (Exception ignored) {
                // thumbnail không bắt buộc
            }
        }
        long now = Ids.now();
        db.run("""
                INSERT INTO studio_projects (id, owner_id, name, status, unit, preset, template_id, icon, revision, scene_key, scene_url,
                  thumbnail_key, thumbnail_url, created_at, updated_at, saved_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                pid, u.id(), truncateName(src.get("name") + " (bản sao)"), "draft", src.get("unit"), src.get("preset"), src.get("template_id"), src.get("icon"),
                1, scene.key(), scene.url(), thumb == null ? null : thumb.key(), thumb == null ? null : thumb.url(), now, now, now);
        db.audit(u.id(), "studio.project_duplicate", pid, Map.of("source", id));
        return meta(own(u, pid));
    }

    /** Xóa khỏi danh sách (xóa mềm). Snapshot đã gửi POD và lịch sử yêu cầu in được giữ. */
    public void delete(CurrentUserId u, String id) {
        own(u, id);
        db.run("UPDATE studio_projects SET deleted = TRUE, updated_at = ? WHERE id = ?", Ids.now(), id);
        db.audit(u.id(), "studio.project_delete", id, null);
    }

    public Map<String, Object> thumbnailRow(CurrentUserId u, String id) {
        Map<String, Object> p = own(u, id);
        if (p.get("thumbnail_url") == null) throw ApiException.notFound("Ảnh xem trước");
        return p;
    }

    // ---------------- snapshots ----------------
    Map<String, Object> snapshotDto(Map<String, Object> s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.get("code"));
        m.put("revision", Db.integer(s, "revision"));
        m.put("meshHash", s.get("mesh_hash"));
        m.put("dims", Json.list(Db.str(s, "dims_json")));
        m.put("parts", Db.integer(s, "parts"));
        m.put("triangles", Db.integer(s, "triangles"));
        m.put("state", s.get("state"));
        m.put("createdAt", iso(Db.lng(s, "created_at")));
        m.put("acknowledgedWarnings", Json.list(Db.str(s, "acknowledged_json")));
        m.put("unit", "mm");
        m.put("consentVersion", s.get("consent_version"));
        m.put("bytes", Db.lng(s, "bytes"));
        return m;
    }

    Map<String, Object> requestDto(Map<String, Object> r) {
        Map<String, Object> cfg = Json.map(Db.str(r, "config_json"));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.get("code"));
        m.put("snapshotId", cfg.get("snapshotCode"));
        m.put("projectId", r.get("studio_project_id"));
        m.put("idempotencyKey", r.get("request_key"));
        m.put("quantity", cfg.get("quantity"));
        m.put("technology", cfg.get("technology"));
        m.put("material", cfg.get("material"));
        m.put("note", cfg.get("note"));
        m.put("stage", r.get("status"));
        m.put("observedAt", iso(Ids.now()));
        m.put("createdAt", iso(Db.lng(r, "created_at")));
        return m;
    }

    public Map<String, Object> snapshots(CurrentUserId u, String projectId) {
        own(u, projectId);
        List<Map<String, Object>> snaps = db.all("SELECT * FROM studio_snapshots WHERE project_id = ? ORDER BY created_at", projectId).stream().map(this::snapshotDto).toList();
        List<Map<String, Object>> reqs = db.all("SELECT * FROM print_requests WHERE owner_id = ? AND source = 'STUDIO' AND studio_project_id = ? ORDER BY created_at", u.id(), projectId)
                .stream().map(this::requestDto).toList();
        return Map.of("snapshots", snaps, "requests", reqs);
    }

    private static double num(Object o) {
        return o instanceof Number n ? n.doubleValue() : Double.NaN;
    }

    public Map<String, Object> uploadSnapshot(CurrentUserId u, String projectId, Map<String, Object> m, byte[] stl) {
        Map<String, Object> p = own(u, projectId);
        String code = String.valueOf(m.get("id"));
        if (!SNAP_CODE.matcher(code).matches()) throw ApiException.bad("INVALID_SNAPSHOT", "Mã snapshot không hợp lệ.");
        if (stl.length > MAX_STL_BYTES) throw ApiException.bad("FILE_TOO_LARGE", "STL vượt 50 MiB.");
        // STL binary: 84 byte header + 50 byte / tam giác
        if (stl.length < 84) throw ApiException.bad("INVALID_STL", "Tệp STL không hợp lệ.");
        long tris = ByteBuffer.wrap(stl, 80, 4).order(ByteOrder.LITTLE_ENDIAN).getInt() & 0xffffffffL;
        if (84 + tris * 50 != stl.length || tris == 0) throw ApiException.bad("INVALID_STL", "Tệp STL không hợp lệ (cần STL binary).");
        List<?> dims = m.get("dims") instanceof List<?> l && l.size() == 3 ? l : null;
        if (dims == null || dims.stream().anyMatch(d -> !(d instanceof Number n) || !Double.isFinite(n.doubleValue()))) {
            throw ApiException.bad("INVALID_SNAPSHOT", "Kích thước snapshot không hợp lệ.");
        }
        int revision = (int) num(m.get("revision"));
        if (revision != Db.integer(p, "revision")) throw ApiException.conflict("REVISION_CONFLICT", "Snapshot phải dựa trên revision đã lưu mới nhất.");
        Map<String, Object> existing = db.one("SELECT * FROM studio_snapshots WHERE project_id = ? AND code = ?", projectId, code);
        if (existing != null && "READY".equals(existing.get("state"))) throw ApiException.conflict("SNAPSHOT_IMMUTABLE", "Snapshot đã READY, không thể ghi đè.");

        StoredFile f = storage.put("studio/" + u.id() + "/" + projectId + "/snapshots/" + code + "-" + Ids.code(6) + ".stl", stl, "model/stl");
        String meshHash = str(m.get("meshHash"), 120);
        String ack = Json.write(m.get("acknowledgedWarnings") instanceof List<?> a ? a : List.of());
        long now = Ids.now();
        if (existing != null) {
            storage.delete(Db.str(existing, "stl_key"), Db.str(existing, "stl_url"));
            db.run("""
                    UPDATE studio_snapshots SET revision = ?, mesh_hash = ?, dims_json = ?, parts = ?, triangles = ?, state = 'CREATING', bytes = ?,
                      stl_key = ?, stl_url = ?, acknowledged_json = ?, created_at = ? WHERE id = ?""",
                    revision, meshHash == null ? "" : meshHash, Json.write(dims), (int) num(m.get("parts")), (int) tris, f.size(), f.key(), f.url(), ack, now, existing.get("id"));
        } else {
            db.run("""
                    INSERT INTO studio_snapshots (id, project_id, owner_id, code, revision, mesh_hash, dims_json, parts, triangles, state, bytes,
                      stl_key, stl_url, acknowledged_json, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    Ids.id("snp"), projectId, u.id(), code, revision, meshHash == null ? "" : meshHash, Json.write(dims), (int) num(m.get("parts")), (int) tris,
                    "CREATING", f.size(), f.key(), f.url(), ack, now);
        }
        db.audit(u.id(), "studio.snapshot_upload", projectId, Map.of("code", code, "bytes", f.size()));
        return snapshotDto(db.one("SELECT * FROM studio_snapshots WHERE project_id = ? AND code = ?", projectId, code));
    }

    public Map<String, Object> patchSnapshot(CurrentUserId u, String projectId, String code, Map<String, Object> b) {
        own(u, projectId);
        Map<String, Object> s = db.one("SELECT * FROM studio_snapshots WHERE project_id = ? AND code = ?", projectId, code);
        if (s == null) throw ApiException.notFound("Snapshot");
        String cur = Db.str(s, "state");
        if (b.get("state") != null) {
            String to = String.valueOf(b.get("state"));
            boolean ok = switch (to) {
                case "VALIDATING" -> cur.equals("CREATING");
                case "READY" -> cur.equals("VALIDATING") || cur.equals("CREATING");
                case "FAILED" -> !cur.equals("READY");
                default -> false;
            };
            if (!ok && !to.equals(cur)) throw ApiException.conflict("INVALID_STATE", "Không thể chuyển snapshot từ " + cur + " sang " + to + ".");
            db.run("UPDATE studio_snapshots SET state = ? WHERE id = ?", to, s.get("id"));
        }
        if (b.get("consentVersion") != null) {
            db.run("UPDATE studio_snapshots SET consent_version = ? WHERE id = ?", str(b.get("consentVersion"), 40), s.get("id"));
        }
        return snapshotDto(db.one("SELECT * FROM studio_snapshots WHERE id = ?", s.get("id")));
    }

    // ---------------- print requests ----------------
    public Map<String, Object> createPrintRequest(CurrentUserId u, String key, Map<String, Object> b) {
        Map<String, Object> prev = printRequests.findByKey(u.id(), key);
        if (prev != null) return requestDto(prev); // Idempotency: thử lại trả về đúng yêu cầu ban đầu
        String projectId = String.valueOf(b.get("projectId"));
        own(u, projectId);
        Map<String, Object> snap = db.one("SELECT * FROM studio_snapshots WHERE project_id = ? AND code = ?", projectId, String.valueOf(b.get("snapshotId")));
        if (snap == null) throw ApiException.notFound("Snapshot");
        if (!"READY".equals(snap.get("state"))) throw ApiException.conflict("SNAPSHOT_NOT_READY", "Snapshot chưa READY.");
        double q = num(b.get("quantity"));
        if (Double.isNaN(q) || q != Math.floor(q) || q < 1 || q > 100) throw ApiException.bad("INVALID_QUANTITY", "Số lượng là số nguyên 1–100.");
        String tech = String.valueOf(b.get("technology"));
        String mat = String.valueOf(b.get("material"));
        if (!TECH.containsKey(tech) || !tech.equals(MATERIAL_TECH.get(mat))) throw ApiException.bad("INVALID_POD_CONFIG", "Tổ hợp công nghệ/vật liệu không hợp lệ.");
        String note = b.get("note") == null ? "" : b.get("note").toString();
        if (note.length() > 2000) throw ApiException.bad("NOTE_TOO_LONG", "Ghi chú tối đa 2000 ký tự.");
        if (b.get("consentVersion") == null) throw ApiException.bad("CONSENT_REQUIRED", "Cần đồng ý điều khoản trước khi gửi.");

        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("snapshotCode", snap.get("code"));
        cfg.put("quantity", (int) q);
        cfg.put("technology", tech);
        cfg.put("material", mat);
        cfg.put("note", note);
        cfg.put("consentVersion", str(b.get("consentVersion"), 40));
        Map<String, Object> file = new LinkedHashMap<>();
        file.put("format", "stl");
        file.put("unit", "mm");
        file.put("url", snap.get("stl_url"));
        file.put("bytes", Db.lng(snap, "bytes"));
        file.put("meshHash", snap.get("mesh_hash"));
        file.put("dims", Json.list(Db.str(snap, "dims_json")));
        file.put("revision", Db.integer(snap, "revision"));
        db.run("UPDATE studio_snapshots SET consent_version = ? WHERE id = ?", cfg.get("consentVersion"), snap.get("id"));
        Map<String, Object> r = printRequests.create(u.id(), key, PrintRequestService.Source.studio(projectId, Db.str(snap, "id")), cfg, List.of(file), "STAFF_REVIEW", "PR-");
        return requestDto(r);
    }

    public Map<String, Object> getPrintRequest(CurrentUserId u, String code) {
        Map<String, Object> r = printRequests.findByCode(u.id(), code);
        if (r == null || !"STUDIO".equals(r.get("source"))) throw ApiException.notFound("Yêu cầu in");
        return requestDto(r);
    }
}
