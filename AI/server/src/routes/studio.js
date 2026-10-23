import { Router } from 'express';
import multer from 'multer';
import { imageSize } from 'image-size';
import { one, all, run, id, now, tx, audit } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { ah, bad, notFound, HttpError } from '../lib/http.js';
import { putBuffer, resolveKey, exists } from '../lib/storage.js';
import { config } from '../config.js';
import { MODELS, PRESETS, PRICE_VERSION, normalizeConfig, estimate } from '../services/pricing.js';
import { balanceOf, entryOnce, history, addEntry } from '../services/wallet.js';
import { submitTask, syncTask, cancelTask, ACTIVE } from '../services/tasks.js';
import { ensureObjBundle } from '../services/objbundle.js';

const r = Router();
r.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.upload.maxBytes, files: 1 } });

// ---------- serializers ----------
const imageDto = (i) => ({
  id: i.id, name: i.original_name, mime: i.mime, sizeBytes: i.size_bytes, width: i.width, height: i.height,
  url: `/api/ai-studio/uploads/${i.id}/file`, createdAt: i.created_at,
});
const taskDto = (t) => ({
  id: t.id, projectId: t.project_id, provider: t.provider, providerTaskId: t.provider_task_id, type: t.type,
  status: t.status, providerStatus: t.provider_status, progress: t.progress, errorCode: t.error_code,
  errorMessage: t.error_message, variantIndex: t.variant_index, credits: t.credits,
  config: JSON.parse(t.config_json), imageIds: JSON.parse(t.image_ids_json),
  createdAt: t.created_at, updatedAt: t.updated_at, finishedAt: t.finished_at,
});
const assetDto = (a) => ({
  id: a.id, kind: a.kind, format: a.format, sizeBytes: a.size_bytes, checksum: a.checksum,
  url: `/api/ai-studio/assets/${a.id}/file`,
});
function versionDto(v) {
  const assets = all('SELECT * FROM assets WHERE version_id = ? ORDER BY created_at', v.id).map(assetDto);
  return {
    id: v.id, projectId: v.project_id, label: v.label, sourceTaskId: v.source_task_id,
    metadata: JSON.parse(v.metadata_json || '{}'), dimensions: v.dims_json ? JSON.parse(v.dims_json) : null,
    createdAt: v.created_at, assets,
    glbUrl: assets.find((a) => a.format === 'glb')?.url || null,
    thumbnailUrl: assets.find((a) => a.kind === 'thumbnail')?.url || null,
  };
}
function projectStatus(p) {
  const active = one(`SELECT COUNT(*) AS c FROM tasks WHERE project_id = ? AND status IN ('SUBMITTED','QUEUED','RUNNING','SUCCEEDED','INGESTING','NEEDS_RECONCILIATION')`, p.id).c;
  if (active) return 'PROCESSING';
  const versions = one('SELECT COUNT(*) AS c FROM versions WHERE project_id = ?', p.id).c;
  if (versions) return 'READY';
  const failed = one(`SELECT COUNT(*) AS c FROM tasks WHERE project_id = ? AND status IN ('FAILED','ASSET_ERROR')`, p.id).c;
  return failed ? 'FAILED' : 'DRAFT';
}
function projectSummary(p) {
  const v = p.active_version_id ? one('SELECT * FROM versions WHERE id = ?', p.active_version_id) : null;
  const vd = v ? versionDto(v) : null;
  const firstTask = one('SELECT image_ids_json FROM tasks WHERE project_id = ? ORDER BY created_at LIMIT 1', p.id);
  const srcId = firstTask ? JSON.parse(firstTask.image_ids_json)[0] : null;
  return {
    id: p.id, title: p.title, sourceMode: p.source_mode, favorite: !!p.favorite, archived: !!p.archived,
    visibility: p.visibility, status: projectStatus(p), activeVersionId: p.active_version_id,
    versionCount: one('SELECT COUNT(*) AS c FROM versions WHERE project_id = ?', p.id).c,
    formats: vd ? vd.assets.filter((a) => a.kind === 'model' && a.format !== 'mtl').map((a) => a.format) : [],
    thumbnailUrl: vd?.thumbnailUrl || (srcId ? `/api/ai-studio/uploads/${srcId}/file` : null),
    stats: vd?.metadata?.stats || null,
    createdAt: p.created_at, updatedAt: p.updated_at,
  };
}
const ownProject = (req, pid) => {
  const p = one('SELECT * FROM projects WHERE id = ? AND owner_id = ?', pid, req.user.id);
  if (!p) throw notFound('Dự án');
  return p;
};
const ownVersion = (req, vid) => {
  const v = one('SELECT v.* FROM versions v JOIN projects p ON p.id = v.project_id WHERE v.id = ? AND p.owner_id = ?', vid, req.user.id);
  if (!v) throw notFound('Phiên bản');
  return v;
};
const ownTask = (req, tid) => {
  const t = one('SELECT * FROM tasks WHERE id = ? AND owner_id = ?', tid, req.user.id);
  if (!t) throw notFound('Tác vụ');
  return t;
};

// ---------- cấu hình / giá ----------
r.get('/config-options', (req, res) => {
  res.json({
    provider: config.providerMode,
    priceVersion: PRICE_VERSION,
    models: Object.entries(MODELS).map(([k, m]) => ({
      id: k, label: m.label, textureResolutions: Object.keys(m.tex), geometryResolutions: m.geo,
    })),
    presets: PRESETS,
    upload: { maxBytes: config.upload.maxBytes, mimes: config.upload.mimes, minSide: config.upload.minSide },
  });
});

r.post('/estimates', ah(async (req, res) => {
  const mode = req.body?.mode === 'multi' ? 'multi' : 'single';
  const variants = Math.min(3, Math.max(1, Number(req.body?.variants || 1)));
  const cfg = normalizeConfig(req.body?.config, mode);
  const est = estimate(cfg, variants);
  const bal = balanceOf(req.user.id);
  res.json({ ...est, balance: bal.available, sufficient: bal.available >= est.total, config: cfg });
}));

// ---------- upload ảnh ----------
function sniffMime(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

r.post('/uploads', upload.single('file'), ah(async (req, res) => {
  const f = req.file;
  if (!f) throw bad('NO_FILE', 'Chưa chọn tệp ảnh.');
  const mime = sniffMime(f.buffer); // kiểm tra MIME thực, không tin extension/Content-Type
  if (!mime) throw bad('INVALID_TYPE', 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.');
  let dim;
  try { dim = imageSize(f.buffer); } catch { throw bad('CORRUPT_IMAGE', 'Không đọc được ảnh, tệp có thể bị hỏng.'); }
  const { minSide, maxSide } = config.upload;
  if (Math.min(dim.width, dim.height) < minSide) throw bad('IMAGE_TOO_SMALL', `Ảnh quá nhỏ (tối thiểu ${minSide}px mỗi cạnh).`);
  if (Math.max(dim.width, dim.height) > maxSide) throw bad('IMAGE_TOO_LARGE', `Ảnh quá lớn (tối đa ${maxSide}px mỗi cạnh).`);
  const imgId = id('img');
  const ext = mime.split('/')[1];
  const saved = await putBuffer(`images/${req.user.id}/${imgId}.${ext}`, f.buffer);
  const name = String(f.originalname || `image.${ext}`).replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120);
  run('INSERT INTO source_images (id, owner_id, storage_key, mime, size_bytes, width, height, original_name, checksum, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    imgId, req.user.id, saved.key, mime, saved.size, dim.width, dim.height, name, saved.checksum, now());
  audit(req.user.id, 'image.upload', imgId, { size: saved.size });
  res.status(201).json({ image: imageDto(one('SELECT * FROM source_images WHERE id = ?', imgId)) });
}));

r.get('/uploads', (req, res) => {
  const rows = all('SELECT * FROM source_images WHERE owner_id = ? ORDER BY created_at DESC LIMIT 12', req.user.id);
  res.json({ images: rows.map(imageDto) });
});

r.get('/uploads/:id/file', (req, res, next) => {
  const img = one('SELECT * FROM source_images WHERE id = ? AND owner_id = ?', req.params.id, req.user.id);
  if (!img || !exists(img.storage_key)) return next(notFound('Ảnh'));
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.type(img.mime).sendFile(resolveKey(img.storage_key));
});

// ---------- tác vụ ----------
r.post('/tasks', ah(async (req, res) => {
  const key = String(req.get('Idempotency-Key') || '').trim();
  if (!/^[\w-]{8,80}$/.test(key)) throw bad('IDEMPOTENCY_KEY_REQUIRED', 'Thiếu Idempotency-Key hợp lệ.');
  const b = req.body || {};
  if (b.consent !== true) throw bad('CONSENT_REQUIRED', 'Bạn cần xác nhận có quyền sử dụng ảnh trước khi Generate.');
  const mode = b.mode === 'multi' ? 'multi' : 'single';
  const imageIds = Array.isArray(b.imageIds) ? [...new Set(b.imageIds.map(String))] : [];
  if (mode === 'single' && imageIds.length !== 1) throw bad('INVALID_IMAGES', 'Chế độ Một ảnh cần đúng 1 ảnh.');
  if (mode === 'multi' && (imageIds.length < 1 || imageIds.length > 4)) throw bad('INVALID_IMAGES', 'Multi-View cần từ 1 đến 4 ảnh.');
  for (const iid of imageIds) {
    if (!one('SELECT 1 FROM source_images WHERE id = ? AND owner_id = ?', iid, req.user.id)) throw notFound('Ảnh nguồn');
  }
  const variants = Math.min(3, Math.max(1, Number(b.variants || 1)));
  const cfg = normalizeConfig(b.config, mode);
  const est = estimate(cfg, variants);
  if (b.priceVersion !== PRICE_VERSION || Number(b.quotedCredits) !== est.total) {
    throw new HttpError(409, 'PRICE_CHANGED', 'Chi phí đã thay đổi, vui lòng xác nhận lại.', { estimate: est });
  }

  const provider = config.providerMode;
  const created = tx(() => {
    const existing = all('SELECT * FROM tasks WHERE owner_id = ? AND request_key = ? ORDER BY variant_index', req.user.id, key);
    if (existing.length) return { tasks: existing, replay: true };

    const bal = balanceOf(req.user.id);
    if (bal.available < est.total) {
      throw new HttpError(402, 'INSUFFICIENT_CREDITS', `Không đủ credit: cần ${est.total}, hiện có ${bal.available}.`, { required: est.total, balance: bal.available });
    }
    let projectId = b.projectId ? String(b.projectId) : null;
    if (projectId) {
      ownProject(req, projectId);
      run('UPDATE projects SET updated_at = ?, archived = 0 WHERE id = ?', now(), projectId);
    } else {
      projectId = id('prj');
      const title = String(b.title || '').trim().slice(0, 80) || 'Mô hình chưa đặt tên';
      run('INSERT INTO projects (id, owner_id, title, source_mode, created_at, updated_at) VALUES (?,?,?,?,?,?)',
        projectId, req.user.id, title, mode, now(), now());
    }
    const tasks = [];
    for (let i = 0; i < variants; i++) {
      const tid = id('tsk');
      run(`INSERT INTO tasks (id, owner_id, project_id, provider, type, status, request_key, variant_index, config_json, image_ids_json, credits, price_version, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        tid, req.user.id, projectId, provider, mode === 'multi' ? 'multi-image-to-3d' : 'image-to-3d', 'SUBMITTED', key, i,
        JSON.stringify(cfg), JSON.stringify(imageIds), est.perVariant, PRICE_VERSION, now(), now());
      entryOnce(req.user.id, -est.perVariant, 'HOLD', tid, 'Giữ credit cho tác vụ AI');
      tasks.push(one('SELECT * FROM tasks WHERE id = ?', tid));
    }
    for (const iid of imageIds) run('UPDATE source_images SET project_id = COALESCE(project_id, ?) WHERE id = ?', projectId, iid);
    return { tasks, replay: false };
  });

  if (!created.replay) {
    audit(req.user.id, 'task.create', created.tasks[0].project_id, { tasks: created.tasks.map((t) => t.id), credits: est.total });
    for (const t of created.tasks) setImmediate(() => submitTask(t.id).catch((e) => console.error('[submit]', e)));
  }
  res.status(created.replay ? 200 : 201).json({
    projectId: created.tasks[0].project_id,
    tasks: created.tasks.map(taskDto),
    replay: created.replay,
  });
}));

r.get('/tasks', (req, res) => {
  let rows;
  if (req.query.projectId) {
    ownProject(req, String(req.query.projectId));
    rows = all('SELECT * FROM tasks WHERE owner_id = ? AND project_id = ? ORDER BY created_at DESC LIMIT 50', req.user.id, String(req.query.projectId));
  } else if (req.query.active) {
    rows = all(`SELECT * FROM tasks WHERE owner_id = ? AND status IN (${[...ACTIVE, 'SUCCEEDED', 'INGESTING'].map(() => '?').join(',')}) ORDER BY created_at DESC`,
      req.user.id, ...ACTIVE, 'SUCCEEDED', 'INGESTING');
  } else {
    rows = all('SELECT * FROM tasks WHERE owner_id = ? ORDER BY created_at DESC LIMIT 30', req.user.id);
  }
  res.json({ tasks: rows.map(taskDto) });
});

r.get('/tasks/:id', (req, res) => res.json({ task: taskDto(ownTask(req, req.params.id)) }));

r.post('/tasks/:id/refresh', ah(async (req, res) => {
  const t = ownTask(req, req.params.id);
  await syncTask(t.id);
  res.json({ task: taskDto(one('SELECT * FROM tasks WHERE id = ?', t.id)) });
}));

r.post('/tasks/:id/cancel', ah(async (req, res) => {
  const t = ownTask(req, req.params.id);
  try {
    await cancelTask(t);
  } catch (e) {
    throw new HttpError(409, e.code || 'CANNOT_CANCEL', e.code === 'PROVIDER_CONFLICT' ? 'Tác vụ đã bắt đầu xử lý, không thể hủy.' : e.message);
  }
  res.json({ task: taskDto(one('SELECT * FROM tasks WHERE id = ?', t.id)) });
}));

// ---------- dự án / thư viện ----------
r.get('/projects', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const tab = String(req.query.tab || 'all');
  const mode = String(req.query.mode || '');
  const status = String(req.query.status || '');
  const sort = String(req.query.sort || 'newest');
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(48, Math.max(1, Number(req.query.pageSize || 9)));
  const where = ['owner_id = ?'];
  const params = [req.user.id];
  where.push(tab === 'archived' ? 'archived = 1' : 'archived = 0');
  if (tab === 'favorites') where.push('favorite = 1');
  if (tab === 'recent') { where.push('updated_at > ?'); params.push(now() - 7 * 24 * 3600 * 1000); }
  if (q) { where.push('LOWER(title) LIKE ?'); params.push(`%${q}%`); }
  if (mode === 'single' || mode === 'multi') { where.push('source_mode = ?'); params.push(mode); }
  const order = { newest: 'updated_at DESC', oldest: 'updated_at ASC', name: 'title COLLATE NOCASE ASC' }[sort] || 'updated_at DESC';
  let items = all(`SELECT * FROM projects WHERE ${where.join(' AND ')} ORDER BY ${order}`, ...params).map(projectSummary);
  if (status) items = items.filter((p) => p.status === status);
  const total = items.length;
  res.json({ items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize });
});

r.get('/projects/:id', (req, res) => {
  const p = ownProject(req, req.params.id);
  const versions = all('SELECT * FROM versions WHERE project_id = ? ORDER BY created_at', p.id).map(versionDto);
  const tasks = all('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC', p.id).map(taskDto);
  const imageIds = [...new Set(tasks.flatMap((t) => t.imageIds))];
  const images = imageIds.map((iid) => one('SELECT * FROM source_images WHERE id = ?', iid)).filter(Boolean).map(imageDto);
  res.json({ project: projectSummary(p), versions, tasks, images });
});

r.patch('/projects/:id', ah(async (req, res) => {
  const p = ownProject(req, req.params.id);
  const b = req.body || {};
  if (b.title !== undefined) {
    const title = String(b.title).trim().slice(0, 80);
    if (!title) throw bad('INVALID_TITLE', 'Tên dự án không được để trống.');
    run('UPDATE projects SET title = ? WHERE id = ?', title, p.id);
  }
  if (b.favorite !== undefined) run('UPDATE projects SET favorite = ? WHERE id = ?', b.favorite ? 1 : 0, p.id);
  if (b.archived !== undefined) run('UPDATE projects SET archived = ? WHERE id = ?', b.archived ? 1 : 0, p.id);
  if (b.activeVersionId !== undefined) {
    if (!one('SELECT 1 FROM versions WHERE id = ? AND project_id = ?', String(b.activeVersionId), p.id)) throw notFound('Phiên bản');
    run('UPDATE projects SET active_version_id = ? WHERE id = ?', String(b.activeVersionId), p.id);
  }
  run('UPDATE projects SET updated_at = ? WHERE id = ?', now(), p.id);
  audit(req.user.id, 'project.update', p.id, b);
  res.json({ project: projectSummary(one('SELECT * FROM projects WHERE id = ?', p.id)) });
}));

// ---------- phiên bản / xuất / kích thước ----------
r.get('/versions/:id', (req, res) => res.json({ version: versionDto(ownVersion(req, req.params.id)) }));

r.put('/versions/:id/dimensions', ah(async (req, res) => {
  const v = ownVersion(req, req.params.id);
  const d = req.body || {};
  const dims = ['lengthMm', 'widthMm', 'heightMm'].map((k) => Number(d[k]));
  if (dims.some((x) => !Number.isFinite(x) || x <= 0)) throw bad('INVALID_DIMENSIONS', 'Kích thước phải là số dương.');
  if (dims.some((x) => x < 5)) throw bad('DIMENSION_TOO_SMALL', 'Mỗi chiều tối thiểu 5 mm.');
  if (dims.some((x) => x > 1000)) throw bad('DIMENSION_TOO_LARGE', 'Mỗi chiều tối đa 1000 mm (giới hạn máy in).');
  const value = { lengthMm: dims[0], widthMm: dims[1], heightMm: dims[2], keepRatio: d.keepRatio !== false, confirmedAt: now() };
  run('UPDATE versions SET dims_json = ? WHERE id = ?', JSON.stringify(value), v.id);
  audit(req.user.id, 'version.dimensions', v.id, value);
  res.json({ version: versionDto(one('SELECT * FROM versions WHERE id = ?', v.id)) });
}));

r.post('/versions/:id/exports', ah(async (req, res) => {
  const v = ownVersion(req, req.params.id);
  const format = String(req.body?.format || '').toLowerCase();
  if (format === 'obj') {
    // OBJ luôn xuất dạng ZIP: model.obj + model.mtl + ảnh texture
    const bundle = await ensureObjBundle(v, req.user.id);
    if (!bundle) throw new HttpError(409, 'FORMAT_UNAVAILABLE', 'Định dạng OBJ chưa có cho phiên bản này.');
    audit(req.user.id, 'version.export', v.id, { format: 'obj-zip', texturesIncluded: bundle.texturesIncluded });
    return res.json({
      downloadUrl: `/api/ai-studio/assets/${bundle.asset.id}/file?download=1`, format: 'obj', packaging: 'zip',
      sizeBytes: bundle.asset.size_bytes, files: bundle.files, texturesIncluded: bundle.texturesIncluded,
    });
  }
  const a = one("SELECT * FROM assets WHERE version_id = ? AND kind = 'model' AND format = ?", v.id, format);
  if (!a) throw new HttpError(409, 'FORMAT_UNAVAILABLE', `Định dạng ${format.toUpperCase()} chưa có cho phiên bản này.`);
  audit(req.user.id, 'version.export', v.id, { format });
  res.json({ downloadUrl: `/api/ai-studio/assets/${a.id}/file?download=1`, format, sizeBytes: a.size_bytes });
}));

r.get('/assets/:id/file', (req, res, next) => {
  const a = one('SELECT * FROM assets WHERE id = ? AND owner_id = ?', req.params.id, req.user.id);
  if (!a || !exists(a.storage_key)) return next(notFound('Tệp'));
  const types = { glb: 'model/gltf-binary', stl: 'model/stl', obj: 'text/plain', mtl: 'text/plain', fbx: 'application/octet-stream', usdz: 'model/vnd.usdz+zip', '3mf': 'model/3mf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', objzip: 'application/zip' };
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.type(types[a.format] || 'application/octet-stream');
  if (req.query.download) {
    const v = one('SELECT v.label, p.title FROM versions v JOIN projects p ON p.id = v.project_id WHERE v.id = ?', a.version_id);
    const base = `${v.title}_${v.label.split(' ')[0]}`.replace(/[^\p{L}\p{N}_-]+/gu, '_');
    res.attachment(a.format === 'objzip' ? `${base}_OBJ.zip` : `${base}.${a.format}`);
  }
  res.sendFile(resolveKey(a.storage_key));
});

// ---------- bàn giao In 3D (POD) ----------
const POD_OPTIONS = {
  FDM: { materials: ['PLA', 'PETG', 'ABS'], qualities: ['0.28 mm · Nháp', '0.20 mm · Tiêu chuẩn', '0.12 mm · Chi tiết'] },
  RESIN: { materials: ['Standard Resin', 'Tough Resin'], qualities: ['50 µm · Tiêu chuẩn', '25 µm · Chi tiết cao'] },
};
r.get('/pod-options', (req, res) => res.json({ options: POD_OPTIONS }));

r.post('/versions/:id/pod-handoffs', ah(async (req, res) => {
  const key = String(req.get('Idempotency-Key') || '').trim();
  if (!/^[\w-]{8,80}$/.test(key)) throw bad('IDEMPOTENCY_KEY_REQUIRED', 'Thiếu Idempotency-Key hợp lệ.');
  const v = ownVersion(req, req.params.id);
  const prev = one('SELECT * FROM pod_handoffs WHERE owner_id = ? AND request_key = ?', req.user.id, key);
  if (prev) return res.json({ handoff: handoffDto(prev), replay: true });
  const b = req.body || {};
  if (b.confirm !== true) throw bad('CONFIRM_REQUIRED', 'Bạn cần xác nhận thông tin trước khi gửi.');
  if (!v.dims_json) throw bad('DIMENSIONS_REQUIRED', 'Hãy xác nhận kích thước thật trước khi gửi yêu cầu in.');
  const tech = POD_OPTIONS[b.technology];
  if (!tech) throw bad('INVALID_TECHNOLOGY', 'Công nghệ in không hợp lệ.');
  if (!tech.materials.includes(b.material) || !tech.qualities.includes(b.quality)) throw bad('INVALID_POD_CONFIG', 'Tổ hợp vật liệu/chất lượng không được phép.');
  const quantity = Math.round(Number(b.quantity || 1));
  if (quantity < 1 || quantity > 100) throw bad('INVALID_QUANTITY', 'Số lượng từ 1 đến 100.');
  const files = all("SELECT id, format, checksum, size_bytes FROM assets WHERE version_id = ? AND kind = 'model'", v.id);
  if (!files.some((f) => ['stl', 'glb', '3mf', 'obj'].includes(f.format))) throw bad('NO_PRINTABLE_FILE', 'Phiên bản chưa có tệp phù hợp để in.');
  const cfg = { technology: b.technology, material: b.material, quality: b.quality, color: String(b.color || '').slice(0, 40), quantity, note: String(b.note || '').slice(0, 1000), dimensions: JSON.parse(v.dims_json) };
  const hid = id('pod');
  const prId = `PR-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  // Luôn tạo PrintRequest mới + snapshot bất biến (BR-17). Báo giá & thanh toán do module POD xử lý (BR-18).
  run('INSERT INTO pod_handoffs (id, owner_id, version_id, print_request_id, request_key, config_json, file_snapshot_json, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    hid, req.user.id, v.id, prId, key, JSON.stringify(cfg), JSON.stringify(files), 'AWAITING_STAFF_REVIEW', now());
  audit(req.user.id, 'pod.handoff', v.id, { printRequestId: prId });
  res.status(201).json({ handoff: handoffDto(one('SELECT * FROM pod_handoffs WHERE id = ?', hid)) });
}));

function handoffDto(h) {
  const v = one('SELECT v.label, p.title, p.id AS pid FROM versions v JOIN projects p ON p.id = v.project_id WHERE v.id = ?', h.version_id);
  return {
    id: h.id, printRequestId: h.print_request_id, versionId: h.version_id, versionLabel: v?.label, projectTitle: v?.title, projectId: v?.pid,
    config: JSON.parse(h.config_json), files: JSON.parse(h.file_snapshot_json), status: h.status, createdAt: h.created_at,
  };
}
r.get('/pod-handoffs', (req, res) => {
  res.json({ handoffs: all('SELECT * FROM pod_handoffs WHERE owner_id = ? ORDER BY created_at DESC', req.user.id).map(handoffDto) });
});

// ---------- ví credit ----------
r.get('/wallet', (req, res) => {
  const b = balanceOf(req.user.id);
  const spent = one("SELECT COALESCE(SUM(t.credits),0) AS s FROM ledger l JOIN tasks t ON t.id = l.task_id WHERE l.owner_id = ? AND l.type = 'SETTLE'", req.user.id).s;
  res.json({ balance: b.available, held: b.held, spent, ledger: history(req.user.id) });
});

// Nạp credit DEMO: chưa tích hợp cổng thanh toán (FRD-AI-026 là M1)
r.post('/wallet/topup', ah(async (req, res) => {
  const amount = Number(req.body?.amount);
  if (![100, 500, 1000].includes(amount)) throw bad('INVALID_AMOUNT', 'Gói nạp không hợp lệ.');
  if (config.isProd) throw new HttpError(403, 'TOPUP_DISABLED', 'Nạp credit demo bị tắt trên môi trường production.');
  addEntry(req.user.id, amount, 'TOPUP', null, `Nạp demo ${amount} credit`);
  audit(req.user.id, 'wallet.topup_demo', req.user.id, { amount });
  res.json({ balance: balanceOf(req.user.id).available });
}));

export default r;
