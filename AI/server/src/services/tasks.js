import { one, all, run, id, now, tx, audit } from '../lib/db.js';
import { adapterFor } from '../adapters/index.js';
import { putBuffer, readBuffer } from '../lib/storage.js';
import { makeGlb, makeStl } from '../lib/procedural.js';
import { config } from '../config.js';
import { releaseHold, settleHold } from './wallet.js';
import { downloadTextures } from './objbundle.js';

/**
 * Vòng đời AI task nội bộ (SRS 6.1):
 * SUBMITTED → QUEUED → RUNNING → SUCCEEDED → INGESTING → AVAILABLE | ASSET_ERROR
 *           ↘ FAILED | CANCELLED | NEEDS_RECONCILIATION
 * Trạng thái không bao giờ lùi (BR-09).
 */
export const ACTIVE = ['SUBMITTED', 'QUEUED', 'RUNNING', 'NEEDS_RECONCILIATION'];
export const TERMINAL = ['AVAILABLE', 'FAILED', 'CANCELLED'];
const RANK = { SUBMITTED: 0, NEEDS_RECONCILIATION: 0, QUEUED: 1, RUNNING: 2, SUCCEEDED: 3, INGESTING: 4, ASSET_ERROR: 5, AVAILABLE: 6, FAILED: 6, CANCELLED: 6 };
const MAX_INGEST_ATTEMPTS = 3;
const RECONCILE_TIMEOUT_MS = 30 * 60 * 1000;

function canTransition(from, to) {
  if (from === to) return false;
  if (TERMINAL.includes(from)) return false;
  if (from === 'ASSET_ERROR') return to === 'INGESTING' || to === 'FAILED';
  if (from === 'INGESTING') return to === 'AVAILABLE' || to === 'ASSET_ERROR';
  if (from === 'SUCCEEDED') return to === 'INGESTING';
  if (['FAILED', 'CANCELLED', 'SUCCEEDED'].includes(to)) return true;
  return RANK[to] > RANK[from];
}

/** Cập nhật trạng thái có điều kiện (compare-and-set) để chống race giữa webhook và polling. */
function transition(task, to, fields = {}) {
  if (!canTransition(task.status, to)) return false;
  const sets = ['status = ?', 'updated_at = ?'];
  const vals = [to, now()];
  for (const [k, v] of Object.entries(fields)) { sets.push(`${k} = ?`); vals.push(v); }
  const r = run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ? AND status = ?`, ...vals, task.id, task.status);
  if (r.changes) { Object.assign(task, fields, { status: to }); return true; }
  return false;
}

const modeOf = (task) => (task.type === 'multi-image-to-3d' ? 'multi' : 'single');

async function imageDataUris(task) {
  const ids = JSON.parse(task.image_ids_json);
  const out = [];
  for (const imgId of ids) {
    const img = one('SELECT * FROM source_images WHERE id = ? AND owner_id = ?', imgId, task.owner_id);
    if (!img) throw Object.assign(new Error('Ảnh nguồn không còn tồn tại.'), { code: 'SOURCE_MISSING' });
    const buf = await readBuffer(img.storage_key);
    out.push(`data:${img.mime};base64,${buf.toString('base64')}`);
  }
  return out;
}

/** Gửi task lên provider. Chạy nền sau khi API trả localTaskId. */
export async function submitTask(taskId) {
  const task = one('SELECT * FROM tasks WHERE id = ?', taskId);
  if (!task || task.status !== 'SUBMITTED' || task.provider_task_id) return;
  const adapter = adapterFor(task.provider);
  try {
    const uris = await imageDataUris(task);
    const providerTaskId = await adapter.create(modeOf(task), uris, JSON.parse(task.config_json));
    transition(task, 'QUEUED', { provider_task_id: providerTaskId, provider_status: 'PENDING' });
    audit(task.owner_id, 'task.submitted', task.id, { providerTaskId });
  } catch (e) {
    if (e.ambiguous) {
      // Không rõ provider đã tạo task hay chưa → đối soát, KHÔNG tự gửi lại (BR-08)
      transition(task, 'NEEDS_RECONCILIATION', { error_code: e.code, error_message: 'Đang xác minh trạng thái với nhà cung cấp.' });
    } else {
      tx(() => {
        if (transition(task, 'FAILED', { error_code: e.code || 'SUBMIT_FAILED', error_message: e.message, finished_at: now() })) {
          releaseHold(task, 'Hoàn credit: gửi tác vụ thất bại');
        }
      });
    }
    audit(task.owner_id, 'task.submit_error', task.id, { code: e.code, message: e.message });
  }
}

/** Đồng bộ một task với provider (dùng cho polling, webhook và nút "Làm mới"). */
const inflight = new Set();
export async function syncTask(taskId) {
  if (inflight.has(taskId)) return;
  inflight.add(taskId);
  try {
    const task = one('SELECT * FROM tasks WHERE id = ?', taskId);
    if (!task) return;
    if (task.status === 'NEEDS_RECONCILIATION' && !task.provider_task_id) {
      if (now() - task.created_at > RECONCILE_TIMEOUT_MS) {
        tx(() => {
          if (transition(task, 'FAILED', { error_code: 'UNKNOWN_OUTCOME', error_message: 'Không xác minh được tác vụ với nhà cung cấp. Credit đã được hoàn.', finished_at: now() })) {
            releaseHold(task, 'Hoàn credit sau đối soát');
          }
        });
        audit(null, 'task.reconcile_release', task.id);
      }
      return;
    }
    if (!task.provider_task_id) return;
    if (TERMINAL.includes(task.status) || task.status === 'INGESTING') return;
    if (task.status === 'ASSET_ERROR' && task.ingest_attempts >= MAX_INGEST_ATTEMPTS) return;

    let r;
    try {
      r = await adapterFor(task.provider).get(modeOf(task), task.provider_task_id);
    } catch (e) {
      run('UPDATE tasks SET last_synced_at = ? WHERE id = ?', now(), task.id);
      if (e.code === 'PROVIDER_NOT_FOUND' && ACTIVE.includes(task.status)) {
        tx(() => {
          if (transition(task, 'FAILED', { error_code: 'PROVIDER_NOT_FOUND', error_message: 'Nhà cung cấp không còn tác vụ này.', finished_at: now() })) {
            releaseHold(task, 'Hoàn credit: tác vụ không tồn tại phía provider');
          }
        });
      }
      return;
    }
    run('UPDATE tasks SET last_synced_at = ?, provider_status = ? WHERE id = ?', now(), r.status, task.id);

    if (r.status === 'PENDING') {
      if (task.status === 'NEEDS_RECONCILIATION' || task.status === 'SUBMITTED') transition(task, 'QUEUED', { progress: 0 });
    } else if (r.status === 'IN_PROGRESS') {
      if (task.status === 'RUNNING') {
        if (r.progress > task.progress) run('UPDATE tasks SET progress = ?, updated_at = ? WHERE id = ? AND status = ?', r.progress, now(), task.id, 'RUNNING');
      } else transition(task, 'RUNNING', { progress: r.progress });
    } else if (r.status === 'SUCCEEDED') {
      if (task.status !== 'ASSET_ERROR') transition(task, 'SUCCEEDED', { progress: 100 });
      await ingest(task, r);
    } else if (r.status === 'FAILED') {
      tx(() => {
        if (transition(task, 'FAILED', { error_code: 'PROVIDER_FAILED', error_message: r.errorMessage || 'Nhà cung cấp không tạo được mô hình.', finished_at: now() })) {
          releaseHold(task, 'Hoàn credit: tạo mô hình thất bại');
        }
      });
    } else if (r.status === 'CANCELED') {
      tx(() => {
        if (transition(task, 'CANCELLED', { finished_at: now() })) releaseHold(task, 'Hoàn credit: tác vụ đã hủy');
      });
    }
  } finally {
    inflight.delete(taskId);
  }
}

async function download(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!res.ok) throw new Error(`Tải asset thất bại (HTTP ${res.status})`);
  const len = Number(res.headers.get('content-length') || 0);
  if (len > config.maxAssetBytes) throw new Error('Asset vượt dung lượng cho phép');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > config.maxAssetBytes) throw new Error('Asset vượt dung lượng cho phép');
  return buf;
}

async function fetchAsset(url, format, seed) {
  if (url.startsWith('mock://')) return format === 'stl' ? makeStl(seed) : makeGlb(seed);
  return download(url);
}

/** Đọc số đỉnh / tam giác / bounding box từ GLB (không cần thư viện 3D). */
export function glbStats(buf) {
  try {
    if (buf.readUInt32LE(0) !== 0x46546c67) return null;
    const jsonLen = buf.readUInt32LE(12);
    const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString());
    let vertices = 0;
    let triangles = 0;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const mesh of gltf.meshes || []) {
      for (const p of mesh.primitives || []) {
        const pa = gltf.accessors[p.attributes.POSITION];
        vertices += pa.count;
        if (pa.min && pa.max) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], pa.min[k]); max[k] = Math.max(max[k], pa.max[k]); }
        triangles += p.indices != null ? gltf.accessors[p.indices].count / 3 : pa.count / 3;
      }
    }
    const size = min[0] === Infinity ? null : max.map((v, k) => +(v - min[k]).toFixed(4));
    return { vertices, triangles: Math.round(triangles), size, materials: (gltf.materials || []).length, textures: (gltf.images || []).length };
  } catch {
    return null;
  }
}

const FORMATS = ['glb', 'fbx', 'obj', 'mtl', 'usdz', 'stl', '3mf'];

/** Lưu asset kết quả về storage riêng ngay khi provider báo thành công (BR-11). */
async function ingest(task, r) {
  if (!transition(task, 'INGESTING', { ingest_attempts: task.ingest_attempts + 1 })) return;
  const versionId = id('ver');
  try {
    if (!r.modelUrls.glb) throw new Error('Provider không trả về GLB');
    const stored = [];
    for (const fmt of FORMATS) {
      const url = r.modelUrls[fmt];
      if (!url) continue;
      try {
        const buf = await fetchAsset(url, fmt, task.id);
        const saved = await putBuffer(`assets/${task.owner_id}/${versionId}/model.${fmt}`, buf);
        stored.push({ kind: 'model', format: fmt, ...saved, buf: fmt === 'glb' ? buf : null });
      } catch (e) {
        if (fmt === 'glb') throw e; // GLB bắt buộc, định dạng khác thiếu thì đánh dấu unavailable
        console.warn(`[ingest] ${task.id} bỏ qua ${fmt}: ${e.message}`);
      }
    }
    // Ảnh texture rời: cần cho gói OBJ (GLB/FBX/USDZ đã nhúng sẵn texture)
    if (stored.some((s) => s.format === 'obj') && r.textureUrls?.length) {
      stored.push(...(await downloadTextures(task.owner_id, versionId, r.textureUrls)));
    }
    // Thumbnail: từ provider, nếu không có thì dùng ảnh nguồn đầu tiên
    try {
      let thumb;
      if (r.thumbnailUrl) thumb = await download(r.thumbnailUrl);
      else {
        const firstImg = one('SELECT storage_key FROM source_images WHERE id = ?', JSON.parse(task.image_ids_json)[0]);
        thumb = firstImg ? await readBuffer(firstImg.storage_key) : null;
      }
      if (thumb) stored.push({ kind: 'thumbnail', format: 'png', ...(await putBuffer(`assets/${task.owner_id}/${versionId}/thumbnail`, thumb)) });
    } catch (e) {
      console.warn(`[ingest] ${task.id} thumbnail: ${e.message}`);
    }

    const cfg = JSON.parse(task.config_json);
    const stats = glbStats(stored.find((s) => s.format === 'glb').buf);
    tx(() => {
      const n = one('SELECT COUNT(*) AS c FROM versions WHERE project_id = ?', task.project_id).c + 1;
      const label = `v${String(n).padStart(2, '0')} · ${task.variant_index > 0 ? `Biến thể ${task.variant_index + 1}` : 'Bản gốc'}`;
      const meta = {
        stats,
        aiModel: cfg.aiModel,
        // Chỉ ghi nhận texture khi GLB thực sự chứa ảnh texture
        texture: cfg.shouldTexture && stats?.textures !== 0 ? `${cfg.textureResolution.toUpperCase()}${cfg.enablePbr ? ' · PBR' : ''}` : null,
        topology: cfg.shouldRemesh ? cfg.topology : 'triangle',
        credits: task.credits,
        provider: task.provider,
        providerTaskId: task.provider_task_id,
      };
      run('INSERT INTO versions (id, project_id, parent_version_id, source_task_id, label, metadata_json, created_at) VALUES (?,?,?,?,?,?,?)',
        versionId, task.project_id, null, task.id, label, JSON.stringify(meta), now());
      for (const s of stored) {
        run('INSERT INTO assets (id, version_id, owner_id, kind, format, storage_key, size_bytes, checksum, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
          id('ast'), versionId, task.owner_id, s.kind, s.format, s.key, s.size, s.checksum, now());
      }
      run('UPDATE projects SET active_version_id = COALESCE(active_version_id, ?), updated_at = ? WHERE id = ?', versionId, now(), task.project_id);
      transition(task, 'AVAILABLE', { finished_at: now(), error_code: null, error_message: null });
      settleHold(task);
    });
    audit(task.owner_id, 'task.available', task.id, { versionId });
  } catch (e) {
    console.error(`[ingest] ${task.id} lỗi:`, e.message);
    tx(() => {
      transition(task, 'ASSET_ERROR', { error_code: 'ASSET_ERROR', error_message: `Lưu kết quả thất bại: ${e.message}` });
      if (task.ingest_attempts >= MAX_INGEST_ATTEMPTS) releaseHold(task, 'Hoàn credit: không lưu được kết quả');
    });
  }
}

export async function cancelTask(task) {
  if (!['SUBMITTED', 'QUEUED'].includes(task.status) || !task.provider_task_id) {
    const e = new Error('Chỉ hủy được tác vụ đang chờ trong hàng đợi. Tác vụ đang xử lý không thể dừng.');
    e.code = 'CANNOT_CANCEL';
    throw e;
  }
  await adapterFor(task.provider).cancel(modeOf(task), task.provider_task_id);
  tx(() => {
    if (transition(task, 'CANCELLED', { finished_at: now() })) releaseHold(task, 'Hoàn credit: người dùng hủy tác vụ');
  });
  audit(task.owner_id, 'task.cancelled', task.id);
}

/** Polling dự phòng cho webhook (BR-09, NFR-07). */
let ticking = false;
export function startPoller() {
  // Task SUBMITTED chưa có provider id từ lần chạy trước → không rõ kết quả → đối soát
  run("UPDATE tasks SET status = 'NEEDS_RECONCILIATION', updated_at = ? WHERE status = 'SUBMITTED' AND provider_task_id IS NULL AND created_at < ?", now(), now() - 60000);
  // Ingest bị gián đoạn do restart → cho phép thử lại
  run("UPDATE tasks SET status = 'ASSET_ERROR', updated_at = ? WHERE status = 'INGESTING'", now());
  setInterval(async () => {
    if (ticking) return;
    ticking = true;
    try {
      const due = all(
        `SELECT id FROM tasks WHERE (status IN ('QUEUED','RUNNING','NEEDS_RECONCILIATION','SUCCEEDED')
            OR (status = 'ASSET_ERROR' AND ingest_attempts < ?))
          AND (last_synced_at IS NULL OR last_synced_at < ?) ORDER BY updated_at LIMIT 25`,
        MAX_INGEST_ATTEMPTS, now() - 4000,
      );
      await Promise.all(due.map((t) => syncTask(t.id).catch((e) => console.error('[poller]', e))));
    } finally {
      ticking = false;
    }
  }, 2500);
}
