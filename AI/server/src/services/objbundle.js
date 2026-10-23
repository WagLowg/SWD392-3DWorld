import path from 'node:path';
import { one, all, run, id, now, audit } from '../lib/db.js';
import { putBuffer, readBuffer } from '../lib/storage.js';
import { makeZip } from '../lib/zip.js';
import { adapterFor } from '../adapters/index.js';
import { config } from '../config.js';

/**
 * Gói OBJ: model.obj + model.mtl + ảnh texture, đóng ZIP.
 * Meshy trả texture qua texture_urls (base_color, metallic, roughness, normal, emission);
 * MTL của Meshy chỉ tham chiếu ảnh base color, nên MTL được viết lại để trỏ đúng tên file và thêm map PBR.
 */
const MAP_KEYS = ['base_color', 'metallic', 'roughness', 'normal', 'emission'];

function extOf(url) {
  try {
    const e = path.extname(new URL(url).pathname).toLowerCase().replace('.', '');
    return ['png', 'jpg', 'jpeg', 'webp'].includes(e) ? e : 'png';
  } catch {
    return 'png';
  }
}

async function download(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > config.maxAssetBytes) throw new Error('Texture vượt dung lượng cho phép');
  return buf;
}

/**
 * Tải ảnh texture về storage riêng. Trả về danh sách để chèn bảng assets.
 * Tên file: texture_{i}.{ext} cho base color (khớp MTL của Meshy), texture_{i}_{map}.{ext} cho map khác.
 */
export async function downloadTextures(ownerId, versionId, textureUrls = []) {
  const out = [];
  for (const [i, set] of textureUrls.entries()) {
    for (const key of MAP_KEYS) {
      const url = set?.[key];
      if (!url) continue;
      const name = `texture_${i}${key === 'base_color' ? '' : `_${key}`}.${extOf(url)}`;
      try {
        const saved = await putBuffer(`assets/${ownerId}/${versionId}/textures/${name}`, await download(url));
        out.push({ kind: 'texture', format: path.extname(name).slice(1), ...saved });
      } catch (e) {
        console.warn(`[textures] ${versionId} bỏ qua ${name}: ${e.message}`);
      }
    }
  }
  return out;
}

export function insertAssets(ownerId, versionId, list) {
  for (const s of list) {
    run('INSERT INTO assets (id, version_id, owner_id, kind, format, storage_key, size_bytes, checksum, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      id('ast'), versionId, ownerId, s.kind, s.format, s.key, s.size, s.checksum, now());
  }
}

const texturesOf = (versionId) => all("SELECT * FROM assets WHERE version_id = ? AND kind = 'texture' ORDER BY storage_key", versionId);

/** Bổ sung texture cho phiên bản tạo trước khi có tính năng này (nếu task Meshy còn hạn). */
async function backfillTextures(version, ownerId) {
  if (texturesOf(version.id).length) return;
  const task = version.source_task_id ? one('SELECT * FROM tasks WHERE id = ?', version.source_task_id) : null;
  if (!task?.provider_task_id || task.provider !== 'meshy') return;
  try {
    const mode = task.type === 'multi-image-to-3d' ? 'multi' : 'single';
    const r = await adapterFor(task.provider).get(mode, task.provider_task_id);
    const list = await downloadTextures(ownerId, version.id, r.textureUrls);
    if (list.length && !texturesOf(version.id).length) insertAssets(ownerId, version.id, list);
  } catch (e) {
    console.warn(`[textures] không bổ sung được cho ${version.id}: ${e.message}`);
  }
}

/** Viết lại MTL: mỗi khối newmtl thứ i trỏ tới texture bộ i (hoặc bộ 0), thêm map PBR. */
function rewriteMtl(mtl, texNames) {
  const sets = {};
  for (const n of texNames) {
    const m = n.match(/^texture_(\d+)(?:_(\w+))?\.\w+$/);
    if (!m) continue;
    (sets[m[1]] ??= {})[m[2] || 'base_color'] = n;
  }
  const lines = mtl.split(/\r?\n/).filter((l) => !/^\s*(map_\w+|norm|bump|disp)\s/i.test(l));
  const out = [];
  let idx = -1;
  const flush = () => {
    if (idx < 0) return;
    const s = sets[idx] || sets[0];
    if (!s) return;
    if (s.base_color) out.push(`map_Kd ${s.base_color}`);
    if (s.roughness) out.push(`map_Pr ${s.roughness}`);
    if (s.metallic) out.push(`map_Pm ${s.metallic}`);
    if (s.normal) out.push(`norm ${s.normal}`, `map_Bump ${s.normal}`);
    if (s.emission) out.push(`map_Ke ${s.emission}`);
  };
  for (const l of lines) {
    if (/^\s*newmtl\s/.test(l)) { flush(); idx++; }
    out.push(l);
  }
  flush();
  return out.join('\n').replace(/\n+$/, '') + '\n';
}

/**
 * Tạo (hoặc dùng lại) gói ZIP OBJ cho phiên bản. Kết quả lưu như asset kind 'bundle', format 'objzip'.
 */
export async function ensureObjBundle(version, ownerId) {
  const cached = one("SELECT * FROM assets WHERE version_id = ? AND kind = 'bundle' AND format = 'objzip'", version.id);
  const obj = one("SELECT * FROM assets WHERE version_id = ? AND kind = 'model' AND format = 'obj'", version.id);
  if (!obj) return null;

  await backfillTextures(version, ownerId);
  const textures = texturesOf(version.id);
  if (cached) {
    // Gói cũ còn dùng được nếu được tạo sau khi đã có đủ texture
    const newestTex = Math.max(0, ...textures.map((t) => t.created_at));
    if (cached.created_at >= newestTex) {
      const files = [
        { name: 'model.obj', sizeBytes: obj.size_bytes },
        { name: 'model.mtl', sizeBytes: null },
        ...textures.map((t) => ({ name: path.basename(t.storage_key), sizeBytes: t.size_bytes })),
      ];
      return { asset: cached, files, texturesIncluded: textures.length > 0 };
    }
    run('DELETE FROM assets WHERE id = ?', cached.id);
  }

  const mtlAsset = one("SELECT * FROM assets WHERE version_id = ? AND kind = 'model' AND format = 'mtl'", version.id);
  const texEntries = await Promise.all(textures.map(async (t) => ({ name: path.basename(t.storage_key), data: await readBuffer(t.storage_key) })));
  let mtl = mtlAsset ? (await readBuffer(mtlAsset.storage_key)).toString('utf8') : 'newmtl Material\nKd 0.8 0.8 0.8\n';
  mtl = rewriteMtl(mtl, texEntries.map((e) => e.name));

  // Đảm bảo OBJ trỏ tới model.mtl
  let objBuf = await readBuffer(obj.storage_key);
  const head = objBuf.subarray(0, 4096).toString('utf8');
  const m = head.match(/^mtllib\s+(.+)$/m);
  if (!m) objBuf = Buffer.concat([Buffer.from('mtllib model.mtl\n'), objBuf]);
  else if (m[1].trim() !== 'model.mtl') {
    const fixed = head.replace(/^mtllib\s+.+$/m, 'mtllib model.mtl');
    objBuf = Buffer.concat([Buffer.from(fixed, 'utf8'), objBuf.subarray(Buffer.byteLength(head, 'utf8'))]);
  }

  const entries = [
    { name: 'model.obj', data: objBuf },
    { name: 'model.mtl', data: Buffer.from(mtl, 'utf8') },
    ...texEntries,
  ];
  const zip = makeZip(entries);
  const saved = await putBuffer(`assets/${ownerId}/${version.id}/model_obj.zip`, zip);
  const assetId = id('ast');
  run('INSERT INTO assets (id, version_id, owner_id, kind, format, storage_key, size_bytes, checksum, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    assetId, version.id, ownerId, 'bundle', 'objzip', saved.key, saved.size, saved.checksum, now());
  const files = entries.map((e) => ({ name: e.name, sizeBytes: e.data.length }));
  audit(ownerId, 'bundle.created', version.id, { assetId, textures: textures.length });
  return { asset: one('SELECT * FROM assets WHERE id = ?', assetId), files, texturesIncluded: textures.length > 0 };
}
