import type { PodStage, PrintRequestReceipt, SceneNode, Snapshot } from '../types';
import { TEMPLATES } from '../lib/scene';
import { CAPABILITIES, POD_CATALOG } from '../config';
import { renderThumbnail } from '../lib/thumbnail';
import { goLogin } from '../../../shared/session/session';
import { tokenStore } from '../../../shared/session/token';
import { sessionStillValid } from '../../../shared/session/verify';
import { podService } from '../../pod/services/pod.service';

/**
 * API dự án 3D Studio — Backend chính (3DWorld-SWD-BE), prefix /api/studio (OpenAPI "3D Studio").
 * Scene lưu dạng JSON tự do, revision = currentVersion (409 khi xung đột). Yêu cầu in đi qua module POD.
 */
export type ProjectStatus = 'saved' | 'draft';

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  unit: 'mm';
  preset?: string;
  templateId?: string;
  thumbnail?: string; // URL Cloudinary
  icon?: string;
  revision?: number;
}

export interface StoredProject { revision: number; name: string; nodes: SceneNode[]; savedAt: string }

export const draftKey = (id: string) => `3dw.draft.project.${id}`;

export class StudioApiError extends Error {
  constructor(public status: number, public code: string, message: string, public data?: Record<string, unknown>) { super(message); }
}

async function call<T>(path: string, opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const isForm = opts.body instanceof FormData;
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`/api/studio${path}`, {
      method: opts.method || (opts.body ? 'POST' : 'GET'),
      headers: {
        ...(opts.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        // Cùng JWT với các module khác (đăng nhập một lần cho cả web).
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
      body: opts.body ? (isForm ? (opts.body as FormData) : JSON.stringify(opts.body)) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new StudioApiError(0, 'NETWORK', 'Không thể kết nối máy chủ');
  }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) {
    // Backend trả { status, message, data }
    const message: string = data?.message || data?.error?.message || `Lỗi ${res.status}`;
    const extra = data?.data && typeof data.data === 'object' ? (data.data as Record<string, unknown>) : {};
    const code = res.status === 409 ? 'REVISION_CONFLICT' : (data?.error?.code as string) || `HTTP_${res.status}`;
    if (res.status === 401) {
      // Phiên chung còn hợp lệ → lỗi phía máy chủ Studio (Spring trả 401 khi xử lý lỗi nội bộ); không đẩy về đăng nhập.
      if (await sessionStillValid()) {
        throw new StudioApiError(
          401,
          'STUDIO_SERVICE_UNAUTHORIZED',
          'Máy chủ 3D Studio từ chối yêu cầu (lỗi nội bộ phía Backend). Phiên đăng nhập của bạn vẫn hợp lệ.',
          extra,
        );
      }
      goLogin();
    }
    throw new StudioApiError(res.status, code, message, extra);
  }
  // Bóc envelope { status, message, data, timestamp }
  if (data && typeof data === 'object' && 'data' in data && 'status' in data && 'message' in data) return data.data as T;
  return data as T;
}

const sim = () => new Set((new URLSearchParams(location.search).get('sim') ?? '').split(',').filter(Boolean));

export function validateProjectName(name: string): string | null {
  const t = name.trim();
  if (!t) return `Tên dự án là bắt buộc. 1–${CAPABILITIES.maxProjectNameChars} ký tự.`;
  if (Array.from(t).length > CAPABILITIES.maxProjectNameChars) return `Tối đa ${CAPABILITIES.maxProjectNameChars} ký tự.`;
  return null;
}

const thumbOf = (nodes: SceneNode[]) => (nodes.length ? renderThumbnail(nodes, { width: 576, height: 240, background: '#10141d' }) : null);

/* ---------------------------------------------------- dạng dữ liệu Backend */

type BSummary = {
  modelId: number;
  name: string;
  latestVersion?: number | null;
  createdAt?: string;
  updatedAt?: string;
  status?: string | null;
  unit?: string | null;
  preset?: string | null;
  templateId?: string | null;
  icon?: string | null;
  revision?: number | null;
  thumbnailUrl?: string | null;
  thumbnail?: string | null;
};
type BDetail = BSummary & { currentVersion?: number | null; scene?: unknown };
type BSnapshot = {
  snapshotCode: string;
  modelId: number;
  versionNumber?: number;
  changeNote?: string | null;
  fileFormat?: string;
  fileSize?: number;
  createdAt?: string;
  downloadUrl?: string | null;
  // Trường metadata mới (CreateStudioSnapshotRequest / StudioSnapshotResponse)
  id?: string | null;
  revision?: number | null;
  meshHash?: string | null;
  dims?: number[] | null;
  parts?: number | null;
  triangles?: number | null;
  state?: string | null;
  unit?: string | null;
  bytes?: number | null;
  acknowledgedWarnings?: string[] | null;
  consentVersion?: string | null;
};

/** Scene lưu ở Backend dưới dạng JSON tự do: { nodes, templateId, preset, icon, thumbnail }. */
type SceneDoc = { nodes: SceneNode[]; templateId?: string; preset?: string; icon?: string; thumbnail?: string | null };

function readScene(scene: unknown): SceneDoc {
  if (Array.isArray(scene)) return { nodes: scene as SceneNode[] };
  if (scene && typeof scene === 'object') {
    const s = scene as Partial<SceneDoc>;
    return { ...s, nodes: Array.isArray(s.nodes) ? s.nodes : [] };
  }
  return { nodes: [] };
}

const iso = (v?: string | null) => v ?? new Date().toISOString();

/** Chỉ dùng ảnh mà <img> tải được không cần token: data URL hoặc URL tuyệt đối (Cloudinary). */
const usableImg = (u?: string | null) => (u && /^(data:image\/|https?:\/\/)/.test(u) ? u : undefined);

const revisionOf = (p: BDetail) => p.revision ?? p.currentVersion ?? p.latestVersion ?? undefined;

function toMeta(p: BDetail, scene?: SceneDoc): ProjectMeta {
  return {
    id: String(p.modelId),
    name: p.name,
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt ?? p.createdAt),
    status: (p.status ?? '').toUpperCase() === 'DRAFT' ? 'draft' : 'saved',
    unit: 'mm',
    templateId: p.templateId ?? scene?.templateId,
    preset: p.preset ?? scene?.preset,
    icon: p.icon ?? scene?.icon,
    thumbnail: usableImg(p.thumbnail) ?? usableImg(p.thumbnailUrl) ?? scene?.thumbnail ?? undefined,
    revision: revisionOf(p),
  };
}

/* ------------------------------------------------------------ dự án */

/**
 * Danh sách đã có icon / thumbnail từ Backend. Bộ nhớ cục bộ chỉ dùng dự phòng cho dự án cũ
 * (lưu trước khi Backend có các trường này) hoặc khi thumbnail là đường dẫn cần token.
 */
const THUMBS_KEY = '3dw.studio.thumbs';
function rememberThumb(id: string, scene: SceneDoc) {
  try {
    const all = JSON.parse(localStorage.getItem(THUMBS_KEY) ?? '{}') as Record<string, { icon?: string; thumbnail?: string | null }>;
    all[id] = { icon: scene.icon, thumbnail: scene.thumbnail };
    localStorage.setItem(THUMBS_KEY, JSON.stringify(all));
  } catch { /* quota */ }
}
function recallThumb(id: string): { icon?: string; thumbnail?: string } {
  try {
    const hit = (JSON.parse(localStorage.getItem(THUMBS_KEY) ?? '{}') as Record<string, { icon?: string; thumbnail?: string | null }>)[id];
    return { icon: hit?.icon, thumbnail: hit?.thumbnail ?? undefined };
  } catch { return {}; }
}

export async function listProjects(): Promise<ProjectMeta[]> {
  if (sim().has('load-fail') || !navigator.onLine) throw new Error('Không thể kết nối');
  const rows = await call<BSummary[]>('/projects');
  return rows.map((p) => {
    const meta = toMeta(p);
    const local = recallThumb(meta.id);
    return { ...meta, icon: meta.icon ?? local.icon, thumbnail: meta.thumbnail ?? local.thumbnail };
  });
}

/** Nội dung dự án (scene) — null nếu không tồn tại hoặc không có quyền. */
export async function fetchProject(id: string): Promise<(StoredProject & { meta: ProjectMeta }) | null> {
  try {
    const d = await call<BDetail>(`/projects/${encodeURIComponent(id)}`);
    const scene = readScene(d.scene);
    rememberThumb(String(d.modelId), scene);
    return { revision: revisionOf(d) ?? 1, name: d.name, nodes: scene.nodes, savedAt: iso(d.updatedAt), meta: toMeta(d, scene) };
  } catch (e) {
    if (e instanceof StudioApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
}

export async function createProject(input: { name: string; templateId?: string; preset?: string }): Promise<ProjectMeta> {
  const err = validateProjectName(input.name);
  if (err) throw new Error(err);
  const tpl = TEMPLATES.find((t) => t.id === input.templateId);
  const nodes = tpl ? tpl.build() : [];
  const scene: SceneDoc = { nodes, templateId: tpl?.id, preset: input.preset, icon: tpl?.icon ?? 'box', thumbnail: thumbOf(nodes) };
  const d = await call<BDetail>('/projects', {
    body: {
      name: input.name.trim(),
      scene,
      unit: 'mm',
      preset: scene.preset,
      templateId: scene.templateId,
      icon: scene.icon,
      thumbnail: scene.thumbnail ?? undefined,
    },
  });
  rememberThumb(String(d.modelId), scene);
  return toMeta(d, scene);
}

export async function renameProject(id: string, name: string): Promise<void> {
  const err = validateProjectName(name);
  if (err) throw new Error(err);
  await call(`/projects/${encodeURIComponent(id)}`, { method: 'PATCH', body: { name: name.trim() } });
}

/** Nhân bản tạo bản sao độc lập (id mới, file scene mới); lỗi không để lại dự án rỗng. */
export async function duplicateProject(id: string): Promise<ProjectMeta> {
  const d = await call<BDetail>(`/projects/${encodeURIComponent(id)}/duplicate`, { method: 'POST' });
  const scene = readScene(d.scene);
  rememberThumb(String(d.modelId), { ...scene, ...recallThumb(id) });
  return { ...toMeta(d, scene), ...recallThumb(id) };
}

/** Xóa (mềm) dự án. Yêu cầu in đã gửi POD vẫn được giữ ở module POD. */
export async function deleteProject(id: string): Promise<void> {
  if (sim().has('delete-fail') || !navigator.onLine) throw new Error('Không thể kết nối');
  await call(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Lưu nội dung theo baseRevision. Backend trả 409 nếu đã có revision mới hơn. */
export async function saveProjectContent(id: string, input: { baseRevision: number; name: string; nodes: SceneNode[] }) {
  const prev = recallThumb(id);
  const thumbnail = thumbOf(input.nodes);
  const scene: SceneDoc = { nodes: input.nodes, icon: prev.icon, thumbnail };
  const name = input.name.trim();
  // SaveStudioContentRequest nhận cả name / nodes / thumbnail → một lần gọi, không cần PATCH đổi tên riêng.
  const d = await call<BDetail>(`/projects/${encodeURIComponent(id)}/content`, {
    method: 'PUT',
    body: { baseRevision: input.baseRevision, scene, nodes: input.nodes, name: name || undefined, thumbnail: thumbnail ?? undefined, note: 'Lưu từ 3D Studio' },
  });
  // Backend cũ bỏ qua `name` trong body → đổi tên bằng PATCH như trước.
  if (name && name !== d.name) await renameProject(id, name).catch(() => undefined);
  rememberThumb(id, scene);
  return { revision: revisionOf(d) ?? input.baseRevision + 1, savedAt: iso(d.updatedAt), project: toMeta({ ...d, name: name || d.name }, scene) };
}

/* ------------------------------------------------- snapshot & yêu cầu in */

/**
 * Snapshot: POST /snapshots dạng multipart (`meta` JSON + `file` STL do trình duyệt bake), Backend lưu tệp
 * và trả metadata (revision, meshHash, dims, parts, triangles, cảnh báo, consentVersion).
 * PATCH chỉ sửa `note`, nên trạng thái / đồng ý thay đổi sau khi tạo vẫn ghi trong `note` dạng JSON.
 * Snapshot cũ (trước khi có các trường mới) cũng đọc metadata từ `note`.
 */
const NOTE_TAG = '3dw-snapshot@1';
const stlCache = new Map<string, Blob>();

const SNAP_STATES: Snapshot['state'][] = ['CREATING', 'VALIDATING', 'READY', 'FAILED'];

function snapshotFromServer(s: BSnapshot): Snapshot {
  let meta: Partial<Snapshot> = {};
  try {
    const parsed = JSON.parse(s.changeNote ?? '');
    if (parsed?.tag === NOTE_TAG) meta = parsed.snap ?? {};
  } catch { /* ghi chú tự do */ }
  const dims = s.dims && s.dims.length === 3 ? (s.dims as Snapshot['dims']) : undefined;
  const serverState = SNAP_STATES.find((x) => x === (s.state ?? '').toUpperCase());
  return {
    id: meta.id ?? s.id ?? s.snapshotCode,
    revision: meta.revision ?? s.revision ?? s.versionNumber ?? 0,
    meshHash: meta.meshHash ?? s.meshHash ?? '',
    dims: meta.dims ?? dims ?? [0, 0, 0],
    parts: meta.parts ?? s.parts ?? 0,
    triangles: meta.triangles ?? s.triangles ?? 0,
    // Trạng thái trong note là bản mới nhất (PATCH chỉ cập nhật note).
    state: meta.state ?? serverState ?? 'READY',
    createdAt: meta.createdAt ?? iso(s.createdAt),
    acknowledgedWarnings: meta.acknowledgedWarnings ?? s.acknowledgedWarnings ?? [],
    unit: 'mm',
    consentVersion: meta.consentVersion ?? s.consentVersion ?? undefined,
    bytes: meta.bytes ?? s.bytes ?? s.fileSize ?? 0,
    serverCode: s.snapshotCode,
    downloadUrl: s.downloadUrl ?? undefined,
  };
}

const noteOf = (snap: Snapshot) => {
  const { serverCode: _c, downloadUrl: _d, ...rest } = snap;
  return JSON.stringify({ tag: NOTE_TAG, snap: rest });
};

const REQ_KEY = (pid: string) => `3dw.studio.requests.${pid}`;
function readReceipts(pid: string): PrintRequestReceipt[] {
  try { return JSON.parse(localStorage.getItem(REQ_KEY(pid)) ?? '[]') as PrintRequestReceipt[]; } catch { return []; }
}
function writeReceipt(pid: string, r: PrintRequestReceipt) {
  try {
    const all = readReceipts(pid).filter((x) => x.id !== r.id);
    localStorage.setItem(REQ_KEY(pid), JSON.stringify([...all, r]));
  } catch { /* quota */ }
}

export async function listSnapshots(projectId: string) {
  const rows = await call<BSnapshot[]>(`/projects/${encodeURIComponent(projectId)}/snapshots`);
  // Backend chưa có API liên kết dự án Studio ↔ yêu cầu in → lấy từ bộ nhớ trình duyệt
  return { snapshots: rows.map(snapshotFromServer), requests: readReceipts(projectId) };
}

/** Ghi nhận snapshot ở Backend (bất biến) kèm tệp STL đã bake, để mở lại / gửi in từ máy khác. */
/**
 * Lưu ý: Backend tạo snapshot bằng một phiên bản mô hình mới (versionNumber + 1), nên revision của dự án
 * tăng theo. Trả `serverRevision` để editor lấy làm baseRevision cho lần Lưu kế tiếp, tránh 409.
 */
export async function uploadSnapshot(projectId: string, snap: Snapshot, stl: Blob): Promise<{ snapshot: Snapshot; serverRevision?: number }> {
  const meta = {
    note: noteOf(snap),
    format: 'stl',
    revision: snap.revision,
    meshHash: snap.meshHash,
    dims: snap.dims,
    parts: snap.parts,
    triangles: snap.triangles,
    acknowledgedWarnings: snap.acknowledgedWarnings,
    consentVersion: snap.consentVersion,
    unit: snap.unit,
  };
  const form = new FormData();
  // Phần `meta` phải mang Content-Type application/json để Spring đọc @RequestPart.
  form.append('meta', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', new File([stl], `${snap.id}.stl`, { type: 'model/stl' }));
  const saved = await call<BSnapshot>(`/projects/${encodeURIComponent(projectId)}/snapshots`, { body: form });
  stlCache.set(`${projectId}/${snap.id}`, stl);
  return {
    snapshot: { ...snap, serverCode: saved.snapshotCode, downloadUrl: saved.downloadUrl ?? undefined },
    serverRevision: saved.versionNumber ?? undefined,
  };
}

/** Cập nhật trạng thái/đồng ý của snapshot (lưu trong ghi chú JSON). */
export async function patchSnapshot(projectId: string, snap: Snapshot): Promise<Snapshot> {
  if (!snap.serverCode) return snap;
  const saved = await call<BSnapshot>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snap.serverCode)}`, {
    method: 'PATCH',
    body: { note: noteOf(snap) },
  });
  return { ...snap, downloadUrl: saved.downloadUrl ?? snap.downloadUrl };
}

const STAGE: [RegExp, PodStage][] = [
  [/SHIP|DELIVER/i, 'SHIPPED'],
  [/PRODUCTION|PRINT/i, 'IN_PRODUCTION'],
  [/PAID/i, 'PAID_100'],
  [/ACCEPT/i, 'ACCEPTED'],
  [/QUOTE/i, 'QUOTED'],
];
const stageOf = (status: string): PodStage => STAGE.find(([re]) => re.test(status))?.[1] ?? 'STAFF_REVIEW';

/** Vật liệu Studio (pla/petg/resin…) → materialId thật của POD theo tên & công nghệ. */
async function resolveMaterial(tech: string, material: string): Promise<number> {
  const list = await podService.listMaterials();
  const label = POD_CATALOG.materials.find((m) => m.id === material)?.label ?? material;
  const techCode = tech.toUpperCase() === 'SLA' ? ['SLA', 'RESIN'] : [tech.toUpperCase()];
  const sameTech = list.filter((m) => techCode.includes(m.technologyCode.toUpperCase()));
  const word = label.split(' ')[0].toLowerCase();
  const hit = sameTech.find((m) => m.materialName.toLowerCase().includes(word)) ?? sameTech[0] ?? list[0];
  if (!hit) throw new Error('Chưa có vật liệu in nào đang hoạt động.');
  return hit.materialId;
}

/**
 * Gửi in: tạo yêu cầu ở module POD bằng STL của snapshot (POST /api/print/requests/create),
 * cập nhật số lượng / ghi chú / kích thước rồi gửi thẩm định. Backend chưa có API in riêng cho Studio.
 */
export async function createPrintRequest(
  input: Omit<PrintRequestReceipt, 'id' | 'stage' | 'observedAt' | 'createdAt'> & { consentVersion: string; snapshot: Snapshot },
): Promise<PrintRequestReceipt> {
  const pid = input.projectId ?? '';
  const existing = readReceipts(pid).find((r) => r.idempotencyKey === input.idempotencyKey);
  if (existing) return existing; // thử lại cùng khóa → không tạo trùng
  let stl = stlCache.get(`${pid}/${input.snapshot.id}`);
  if (!stl && input.snapshot.downloadUrl) {
    const token = tokenStore.get();
    const res = await fetch(input.snapshot.downloadUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (res.ok) stl = await res.blob();
  }
  if (!stl) throw new Error('Không còn tệp STL của snapshot này — hãy tạo snapshot mới rồi gửi lại');
  const materialId = await resolveMaterial(input.technology, input.material);
  const [x, y, z] = input.snapshot.dims;
  const request = await podService.createFromFile(
    new File([stl], `${input.snapshot.id}.stl`, { type: 'model/stl' }),
    materialId,
    {
      quantity: input.quantity,
      widthMm: x,
      heightMm: z,
      depthMm: y,
      notes: [input.note, `Nguồn: 3D Studio · dự án ${pid} · ${input.snapshot.id}`].filter(Boolean).join('\n'),
    },
    { submit: true },
  );
  const now = new Date().toISOString();
  const receipt: PrintRequestReceipt = {
    id: String(request.printRequestId),
    snapshotId: input.snapshot.id,
    projectId: pid,
    idempotencyKey: input.idempotencyKey,
    quantity: input.quantity,
    technology: input.technology,
    material: input.material,
    note: input.note,
    stage: stageOf(request.status),
    observedAt: now,
    createdAt: request.createdAt ?? now,
  };
  writeReceipt(pid, receipt);
  return receipt;
}

export async function getPrintRequest(id: string, projectId?: string): Promise<PrintRequestReceipt> {
  const request = await podService.getRequest(id);
  const local = projectId ? readReceipts(projectId).find((r) => r.id === id) : undefined;
  const receipt: PrintRequestReceipt = {
    ...(local ?? { id, snapshotId: '', idempotencyKey: '', quantity: 1, technology: '', material: '', note: '', createdAt: request.createdAt ?? '' }),
    id,
    stage: stageOf(request.status),
    observedAt: new Date().toISOString(),
  } as PrintRequestReceipt;
  if (projectId) writeReceipt(projectId, receipt);
  return receipt;
}

export function relativeTime(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return 'Vừa xong';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function normalizeSearch(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}
