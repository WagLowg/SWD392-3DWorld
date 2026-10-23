package com.threedworld.ai;

import com.threedworld.common.Db;
import com.threedworld.common.Json;
import org.springframework.stereotype.Component;

import java.util.*;

/** Chuyển hàng DB → JSON trả cho frontend AI Studio (giữ đúng hình dạng API cũ). */
@Component
public class AiDtos {
    private final Db db;

    public AiDtos(Db db) {
        this.db = db;
    }

    public Map<String, Object> image(Map<String, Object> i) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", i.get("id"));
        m.put("name", i.get("original_name"));
        m.put("mime", i.get("mime"));
        m.put("sizeBytes", Db.lng(i, "size_bytes"));
        m.put("width", Db.integer(i, "width"));
        m.put("height", Db.integer(i, "height"));
        m.put("url", "/api/ai-studio/uploads/" + i.get("id") + "/file");
        m.put("createdAt", Db.lng(i, "created_at"));
        return m;
    }

    public Map<String, Object> task(Map<String, Object> t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.get("id"));
        m.put("projectId", t.get("project_id"));
        m.put("provider", t.get("provider"));
        m.put("providerTaskId", t.get("provider_task_id"));
        m.put("type", t.get("type"));
        m.put("status", t.get("status"));
        m.put("providerStatus", t.get("provider_status"));
        m.put("progress", Db.integer(t, "progress"));
        m.put("errorCode", t.get("error_code"));
        m.put("errorMessage", t.get("error_message"));
        m.put("variantIndex", Db.integer(t, "variant_index"));
        m.put("credits", Db.integer(t, "credits"));
        m.put("config", Json.map(Db.str(t, "config_json")));
        m.put("imageIds", Json.list(Db.str(t, "image_ids_json")));
        m.put("createdAt", Db.lng(t, "created_at"));
        m.put("updatedAt", Db.lng(t, "updated_at"));
        m.put("finishedAt", Db.lngOrNull(t, "finished_at"));
        return m;
    }

    public Map<String, Object> asset(Map<String, Object> a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.get("id"));
        m.put("kind", a.get("kind"));
        m.put("format", a.get("format"));
        m.put("sizeBytes", Db.lng(a, "size_bytes"));
        m.put("checksum", a.get("checksum"));
        m.put("url", "/api/ai-studio/assets/" + a.get("id") + "/file");
        return m;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> version(Map<String, Object> v) {
        List<Map<String, Object>> assets = db.all("SELECT * FROM ai_assets WHERE version_id = ? ORDER BY created_at, file_name", v.get("id"))
                .stream().map(this::asset).toList();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", v.get("id"));
        m.put("projectId", v.get("project_id"));
        m.put("label", v.get("label"));
        m.put("sourceTaskId", v.get("source_task_id"));
        m.put("metadata", Json.map(Db.str(v, "metadata_json")));
        m.put("dimensions", v.get("dims_json") == null ? null : Json.map(Db.str(v, "dims_json")));
        m.put("createdAt", Db.lng(v, "created_at"));
        m.put("assets", assets);
        m.put("glbUrl", assets.stream().filter(a -> "glb".equals(a.get("format"))).map(a -> a.get("url")).findFirst().orElse(null));
        m.put("thumbnailUrl", assets.stream().filter(a -> "thumbnail".equals(a.get("kind"))).map(a -> a.get("url")).findFirst().orElse(null));
        return m;
    }

    public String projectStatus(Map<String, Object> p) {
        Object id = p.get("id");
        long active = db.count("SELECT COUNT(*) FROM ai_tasks WHERE project_id = ? AND status IN ('SUBMITTED','QUEUED','RUNNING','SUCCEEDED','INGESTING','NEEDS_RECONCILIATION')", id);
        if (active > 0) return "PROCESSING";
        if (db.count("SELECT COUNT(*) FROM ai_versions WHERE project_id = ?", id) > 0) return "READY";
        long failed = db.count("SELECT COUNT(*) FROM ai_tasks WHERE project_id = ? AND status IN ('FAILED','ASSET_ERROR')", id);
        return failed > 0 ? "FAILED" : "DRAFT";
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> projectSummary(Map<String, Object> p) {
        Map<String, Object> v = p.get("active_version_id") == null ? null : db.one("SELECT * FROM ai_versions WHERE id = ?", p.get("active_version_id"));
        Map<String, Object> vd = v == null ? null : version(v);
        Map<String, Object> firstTask = db.one("SELECT image_ids_json FROM ai_tasks WHERE project_id = ? ORDER BY created_at LIMIT 1", p.get("id"));
        List<Object> ids = firstTask == null ? List.of() : Json.list(Db.str(firstTask, "image_ids_json"));
        Object srcId = ids.isEmpty() ? null : ids.get(0);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.get("id"));
        m.put("title", p.get("title"));
        m.put("sourceMode", p.get("source_mode"));
        m.put("favorite", Db.bool(p, "favorite"));
        m.put("archived", Db.bool(p, "archived"));
        m.put("visibility", p.get("visibility"));
        m.put("status", projectStatus(p));
        m.put("activeVersionId", p.get("active_version_id"));
        m.put("versionCount", db.count("SELECT COUNT(*) FROM ai_versions WHERE project_id = ?", p.get("id")));
        List<Object> formats = new ArrayList<>();
        if (vd != null) {
            for (Map<String, Object> a : (List<Map<String, Object>>) vd.get("assets")) {
                if ("model".equals(a.get("kind")) && !"mtl".equals(a.get("format"))) formats.add(a.get("format"));
            }
        }
        m.put("formats", formats);
        Object thumb = vd != null && vd.get("thumbnailUrl") != null ? vd.get("thumbnailUrl") : (srcId != null ? "/api/ai-studio/uploads/" + srcId + "/file" : null);
        m.put("thumbnailUrl", thumb);
        m.put("stats", vd == null ? null : ((Map<String, Object>) vd.get("metadata")).get("stats"));
        m.put("createdAt", Db.lng(p, "created_at"));
        m.put("updatedAt", Db.lng(p, "updated_at"));
        return m;
    }

    public Map<String, Object> handoff(Map<String, Object> h) {
        Map<String, Object> v = db.one("SELECT v.label, p.title, p.id AS pid FROM ai_versions v JOIN ai_projects p ON p.id = v.project_id WHERE v.id = ?", h.get("ai_version_id"));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", h.get("id"));
        m.put("printRequestId", h.get("code"));
        m.put("versionId", h.get("ai_version_id"));
        m.put("versionLabel", v == null ? null : v.get("label"));
        m.put("projectTitle", v == null ? null : v.get("title"));
        m.put("projectId", v == null ? null : v.get("pid"));
        m.put("config", Json.map(Db.str(h, "config_json")));
        m.put("files", Json.list(Db.str(h, "file_snapshot_json")));
        m.put("status", h.get("status"));
        m.put("createdAt", Db.lng(h, "created_at"));
        return m;
    }
}
