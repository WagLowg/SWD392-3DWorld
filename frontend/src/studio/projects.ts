import type { PrintRequestReceipt, SceneNode, Snapshot } from './types';
import { TEMPLATES } from './scene';
import { CAPABILITIES } from './config';
import { renderThumbnail } from './thumbnail';
import { goLogin } from '../shared/auth';

/**
 * API dự án 3D Studio (backend Spring Boot: /api/studio/**).
 * Metadata + URL nằm ở Supabase (Postgres), nội dung scene (JSON), thumbnail và STL snapshot nằm ở Cloudinary.
 * Server kiểm tra quyền sở hữu, revision (409 khi xung đột) và idempotency của yêu cầu in.
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
  let res: Response;
  try {
    res = await fetch(`/api/studio${path}`, {
      method: opts.method || (opts.body ? 'POST' : 'GET'),
      headers: { ...(opts.body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...opts.headers },
      body: opts.body ? (isForm ? (opts.body as FormData) : JSON.stringify(opts.body)) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new StudioApiError(0, 'NETWORK', 'Không thể kết nối máy chủ');
  }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) {
    const err = data?.error || {};
    if (res.status === 401) goLogin();
    throw new StudioApiError(res.status, err.code || `HTTP_${res.status}`, err.message || `Lỗi ${res.status}`, err);
  }
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

export async function listProjects(): Promise<ProjectMeta[]> {
  if (sim().has('load-fail') || !navigator.onLine) throw new Error('Không thể kết nối');
  return (await call<{ projects: ProjectMeta[] }>('/projects')).projects;
}

/** Nội dung dự án (scene) — null nếu không tồn tại hoặc không có quyền. */
export async function fetchProject(id: string): Promise<(StoredProject & { meta: ProjectMeta }) | null> {
  try {
    return await call<StoredProject & { meta: ProjectMeta }>(`/projects/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof StudioApiError && e.status === 404) return null;
    throw e;
  }
}

export async function createProject(input: { name: string; templateId?: string; preset?: string }): Promise<ProjectMeta> {
  const err = validateProjectName(input.name);
  if (err) throw new Error(err);
  const tpl = TEMPLATES.find((t) => t.id === input.templateId);
  const nodes = tpl ? tpl.build() : [];
  const r = await call<{ project: ProjectMeta }>('/projects', {
    body: { name: input.name.trim(), templateId: tpl?.id, preset: input.preset, icon: tpl?.icon ?? 'box', nodes, thumbnail: thumbOf(nodes) },
  });
  return r.project;
}

export async function renameProject(id: string, name: string): Promise<void> {
  const err = validateProjectName(name);
  if (err) throw new Error(err);
  await call(`/projects/${encodeURIComponent(id)}`, { method: 'PATCH', body: { name: name.trim() } });
}

/** Nhân bản tạo bản sao độc lập (id mới, file scene mới); lỗi không để lại dự án rỗng. */
export async function duplicateProject(id: string): Promise<ProjectMeta> {
  return (await call<{ project: ProjectMeta }>(`/projects/${encodeURIComponent(id)}/duplicate`, { method: 'POST' })).project;
}

/** Xóa dự án khỏi danh sách. Snapshot đã gửi POD và lịch sử yêu cầu in vẫn được giữ. */
export async function deleteProject(id: string): Promise<void> {
  if (sim().has('delete-fail') || !navigator.onLine) throw new Error('Không thể kết nối');
  await call(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Lưu nội dung theo baseRevision. Server trả 409 REVISION_CONFLICT nếu đã có revision mới hơn. */
export async function saveProjectContent(id: string, input: { baseRevision: number; name: string; nodes: SceneNode[] }) {
  return call<{ revision: number; savedAt: string; project: ProjectMeta }>(`/projects/${encodeURIComponent(id)}/content`, {
    method: 'PUT', body: { ...input, thumbnail: thumbOf(input.nodes) },
  });
}

// ---------- snapshot & yêu cầu in ----------
export async function listSnapshots(projectId: string) {
  return call<{ snapshots: Snapshot[]; requests: PrintRequestReceipt[] }>(`/projects/${encodeURIComponent(projectId)}/snapshots`);
}

/** Upload STL đã bake (mm) của snapshot lên Cloudinary qua backend. */
export async function uploadSnapshot(projectId: string, snap: Snapshot, stl: Blob) {
  const fd = new FormData();
  fd.append('meta', new Blob([JSON.stringify(snap)], { type: 'application/json' }));
  fd.append('file', stl, `${snap.id}.stl`);
  return (await call<{ snapshot: Snapshot }>(`/projects/${encodeURIComponent(projectId)}/snapshots`, { body: fd })).snapshot;
}

export async function patchSnapshot(projectId: string, snapshotId: string, patch: Partial<Snapshot>) {
  return (await call<{ snapshot: Snapshot }>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}`, { method: 'PATCH', body: patch })).snapshot;
}

export async function createPrintRequest(input: Omit<PrintRequestReceipt, 'id' | 'stage' | 'observedAt' | 'createdAt'> & { consentVersion: string }) {
  return (await call<{ request: PrintRequestReceipt }>('/print-requests', {
    body: input, headers: { 'Idempotency-Key': input.idempotencyKey },
  })).request;
}

export async function getPrintRequest(id: string) {
  return (await call<{ request: PrintRequestReceipt }>(`/print-requests/${encodeURIComponent(id)}`)).request;
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
