package com.threedworld.pod;

import com.threedworld.common.Db;
import com.threedworld.common.Ids;
import com.threedworld.common.Json;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.util.Map;

/**
 * Yêu cầu in (PrintRequest) dùng chung cho AI Studio và 3D Studio.
 * Mỗi lần gửi tạo một PrintRequest mới + snapshot file bất biến (BR-17); idempotent theo (owner, Idempotency-Key).
 * Báo giá, thanh toán, sản xuất thuộc module POD (sẽ làm) — module đó đọc bảng print_requests.
 */
@Service
public class PrintRequestService {
    private final Db db;

    public PrintRequestService(Db db) {
        this.db = db;
    }

    public Map<String, Object> findByKey(String ownerId, String requestKey) {
        return db.one("SELECT * FROM print_requests WHERE owner_id = ? AND request_key = ?", ownerId, requestKey);
    }

    public Map<String, Object> findByCode(String ownerId, String code) {
        return db.one("SELECT * FROM print_requests WHERE owner_id = ? AND code = ?", ownerId, code);
    }

    public record Source(String type, String aiVersionId, String studioProjectId, String studioSnapshotId) {
        public static Source ai(String versionId) { return new Source("AI", versionId, null, null); }
        public static Source studio(String projectId, String snapshotId) { return new Source("STUDIO", null, projectId, snapshotId); }
    }

    public Map<String, Object> create(String ownerId, String requestKey, Source src, Object config, Object fileSnapshot, String status, String codePrefix) {
        String id = Ids.id("pod");
        String code = codePrefix + Ids.code(6);
        long now = Ids.now();
        db.run("""
                INSERT INTO print_requests (id, code, owner_id, source, request_key, ai_version_id, studio_project_id, studio_snapshot_id,
                  config_json, file_snapshot_json, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                id, code, ownerId, src.type(), requestKey, src.aiVersionId(), src.studioProjectId(), src.studioSnapshotId(),
                Json.write(config), Json.write(fileSnapshot), status, now, now);
        db.audit(ownerId, "pod.request_created", id, Map.of("code", code, "source", src.type()));
        return db.one("SELECT * FROM print_requests WHERE id = ?", id);
    }

    /** Mã yêu cầu AI theo định dạng cũ: PR-<năm>-XXXXXX */
    public static String aiPrefix() {
        return "PR-" + Year.now().getValue() + "-";
    }
}
