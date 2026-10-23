package com.threedworld.ai;

import com.threedworld.common.Db;
import com.threedworld.common.Ids;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sổ cái credit (BR-08, BR-23). Số dư = tổng amount.
 * HOLD (-) khi tạo task · RELEASE (+) khi task thất bại/hủy · SETTLE (0) đánh dấu đã tính phí.
 * Ràng buộc UNIQUE (task_id, type) chặn hold/release/settle trùng.
 */
@Service
public class WalletService {
    private final Db db;

    public WalletService(Db db) {
        this.db = db;
    }

    public record Balance(long available, long held) {}

    public Balance balanceOf(String ownerId) {
        long total = db.count("SELECT COALESCE(SUM(amount),0) FROM credit_ledger WHERE owner_id = ?", ownerId);
        long held = db.count("""
                SELECT COALESCE(SUM(-h.amount),0) FROM credit_ledger h
                WHERE h.owner_id = ? AND h.type = 'HOLD'
                  AND NOT EXISTS (SELECT 1 FROM credit_ledger x WHERE x.task_id = h.task_id AND x.type IN ('RELEASE','SETTLE'))""", ownerId);
        return new Balance(total, held);
    }

    public void addEntry(String ownerId, int amount, String type, String taskId, String note) {
        db.run("INSERT INTO credit_ledger (id, owner_id, amount, type, task_id, note, created_at) VALUES (?,?,?,?,?,?,?)",
                Ids.id("led"), ownerId, amount, type, taskId, note, Ids.now());
    }

    /** Idempotent: bỏ qua nếu đã có entry cùng (task, type). */
    public boolean entryOnce(String ownerId, int amount, String type, String taskId, String note) {
        if (db.one("SELECT 1 AS x FROM credit_ledger WHERE task_id = ? AND type = ?", taskId, type) != null) return false;
        addEntry(ownerId, amount, type, taskId, note);
        return true;
    }

    private boolean closed(String taskId) {
        return db.one("SELECT 1 AS x FROM credit_ledger WHERE task_id = ? AND type IN ('RELEASE','SETTLE')", taskId) != null;
    }

    /** Hoàn credit đang giữ cho task (nếu chưa settle/release). */
    public void releaseHold(Map<String, Object> task, String note) {
        String taskId = Db.str(task, "id");
        Map<String, Object> hold = db.one("SELECT amount FROM credit_ledger WHERE task_id = ? AND type = 'HOLD'", taskId);
        if (hold == null || closed(taskId)) return;
        addEntry(Db.str(task, "owner_id"), -Db.integer(hold, "amount"), "RELEASE", taskId, note);
    }

    public void settleHold(Map<String, Object> task) {
        String taskId = Db.str(task, "id");
        if (closed(taskId)) return;
        addEntry(Db.str(task, "owner_id"), 0, "SETTLE", taskId, "Đã tính " + Db.integer(task, "credits") + " credit");
    }

    public List<Map<String, Object>> history(String ownerId, int limit) {
        List<Map<String, Object>> rows = db.all("""
                SELECT l.id, l.amount, l.type, l.task_id, l.note, l.created_at, p.title AS project_title
                FROM credit_ledger l LEFT JOIN ai_tasks t ON t.id = l.task_id LEFT JOIN ai_projects p ON p.id = t.project_id
                WHERE l.owner_id = ? ORDER BY l.created_at DESC LIMIT ?""", ownerId, limit);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.get("id"));
            m.put("amount", Db.integer(r, "amount"));
            m.put("type", r.get("type"));
            m.put("taskId", r.get("task_id"));
            m.put("note", r.get("note"));
            m.put("createdAt", Db.lng(r, "created_at"));
            m.put("projectTitle", r.get("project_title"));
            out.add(m);
        }
        return out;
    }
}
