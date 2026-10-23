import { one, all, run, id, now } from '../lib/db.js';

/**
 * Ledger credit (BR-08, BR-23). Số dư = tổng amount.
 * HOLD (-) khi tạo task · RELEASE (+) khi task thất bại/hủy · SETTLE (0) đánh dấu đã tính phí.
 * Chỉ mục unique (task_id, type) chặn hold/release/settle trùng.
 */
export function balanceOf(ownerId) {
  const r = one('SELECT COALESCE(SUM(amount),0) AS b FROM ledger WHERE owner_id = ?', ownerId);
  const held = one(
    `SELECT COALESCE(SUM(-h.amount),0) AS h FROM ledger h
     WHERE h.owner_id = ? AND h.type = 'HOLD'
       AND NOT EXISTS (SELECT 1 FROM ledger x WHERE x.task_id = h.task_id AND x.type IN ('RELEASE','SETTLE'))`,
    ownerId,
  );
  return { available: Number(r.b), held: Number(held.h) };
}

export function addEntry(ownerId, amount, type, taskId = null, note = null) {
  run('INSERT INTO ledger (id, owner_id, amount, type, task_id, note, created_at) VALUES (?,?,?,?,?,?,?)',
    id('led'), ownerId, amount, type, taskId, note, now());
}

/** Idempotent: bỏ qua nếu đã có entry cùng (task, type). */
export function entryOnce(ownerId, amount, type, taskId, note) {
  const exists = one('SELECT 1 FROM ledger WHERE task_id = ? AND type = ?', taskId, type);
  if (exists) return false;
  addEntry(ownerId, amount, type, taskId, note);
  return true;
}

/** Hoàn credit đang giữ cho task (nếu chưa settle/release). */
export function releaseHold(task, note) {
  const hold = one("SELECT amount FROM ledger WHERE task_id = ? AND type = 'HOLD'", task.id);
  if (!hold) return;
  const closed = one("SELECT 1 FROM ledger WHERE task_id = ? AND type IN ('RELEASE','SETTLE')", task.id);
  if (closed) return;
  addEntry(task.owner_id, -hold.amount, 'RELEASE', task.id, note);
}

export function settleHold(task) {
  const closed = one("SELECT 1 FROM ledger WHERE task_id = ? AND type IN ('RELEASE','SETTLE')", task.id);
  if (closed) return;
  addEntry(task.owner_id, 0, 'SETTLE', task.id, `Đã tính ${task.credits} credit`);
}

export function history(ownerId, limit = 50) {
  return all(
    `SELECT l.id, l.amount, l.type, l.task_id AS taskId, l.note, l.created_at AS createdAt, p.title AS projectTitle
     FROM ledger l LEFT JOIN tasks t ON t.id = l.task_id LEFT JOIN projects p ON p.id = t.project_id
     WHERE l.owner_id = ? ORDER BY l.created_at DESC LIMIT ?`,
    ownerId, limit,
  );
}
