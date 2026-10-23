import type { SceneNode } from './types';
import { TEMPLATES, keychainTemplate, uid } from './scene';
import { CAPABILITIES } from './config';

/**
 * Mock project API. Production: BE endpoints with server-side ownership checks (FR-001, FR-022, FR-035).
 * Demo flags via URL query `?sim=load-fail,delete-fail,slow` reproduce DASH-08/09 error states.
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
  thumbnail?: string; // data URL rendered on save
  icon?: string;
}

export interface StoredProject { revision: number; name: string; nodes: SceneNode[]; savedAt: string }

const META_KEY = '3dw.server.projects';
export const projectKey = (id: string) => `3dw.server.project.${id}`;
export const draftKey = (id: string) => `3dw.draft.project.${id}`;
export const snapshotKey = (id: string) => `3dw.server.snapshots.${id}`;

const sim = () => new Set((new URLSearchParams(location.search).get('sim') ?? '').split(',').filter(Boolean));
const delay = (ms: number) => new Promise((r) => setTimeout(r, sim().has('slow') ? ms * 6 : ms));

function readMeta(): ProjectMeta[] {
  try { return JSON.parse(localStorage.getItem(META_KEY) ?? 'null') ?? seed(); } catch { return seed(); }
}
function writeMeta(list: ProjectMeta[]) { localStorage.setItem(META_KEY, JSON.stringify(list)); }

function hoursAgo(h: number) { return new Date(Date.now() - h * 3600_000).toISOString(); }

function seed(): ProjectMeta[] {
  const defs: { id: string; name: string; tpl: string; h: number; status: ProjectStatus }[] = [
    { id: 'prj_keychain_demo', name: 'Móc khóa Studio', tpl: 'tpl-keychain', h: 1, status: 'saved' },
    { id: 'prj_tray', name: 'Khay bút bàn học', tpl: 'tpl-tray', h: 2, status: 'draft' },
    { id: 'prj_nameplate', name: 'Biển tên MINH', tpl: 'tpl-nameplate', h: 3, status: 'draft' },
    { id: 'prj_lidbox', name: 'Hộp nhỏ có nắp', tpl: 'tpl-lidbox', h: 1.2, status: 'saved' },
    { id: 'prj_phone', name: 'Đế điện thoại', tpl: 'tpl-phone', h: 2.2, status: 'draft' },
    { id: 'prj_calib', name: 'Khối thử kích thước', tpl: 'tpl-calib', h: 3.2, status: 'draft' },
  ];
  const list = defs.map((d) => {
    const t = TEMPLATES.find((x) => x.id === d.tpl)!;
    // keep any content saved by the earlier single-project demo
    if (!localStorage.getItem(projectKey(d.id))) {
      const nodes = d.id === 'prj_keychain_demo' ? keychainTemplate() : t.build();
      localStorage.setItem(projectKey(d.id), JSON.stringify({ revision: 1, name: d.name, nodes, savedAt: hoursAgo(d.h) }));
    }
    return { id: d.id, name: d.name, createdAt: hoursAgo(d.h + 24), updatedAt: hoursAgo(d.h), status: d.status, unit: 'mm' as const, templateId: t.id, icon: t.icon };
  });
  writeMeta(list);
  return list;
}

export function validateProjectName(name: string): string | null {
  const t = name.trim();
  if (!t) return `Tên dự án là bắt buộc. 1–${CAPABILITIES.maxProjectNameChars} ký tự.`;
  if (Array.from(t).length > CAPABILITIES.maxProjectNameChars) return `Tối đa ${CAPABILITIES.maxProjectNameChars} ký tự.`;
  return null;
}

export async function listProjects(): Promise<ProjectMeta[]> {
  await delay(550);
  if (sim().has('load-fail') || !navigator.onLine) throw new Error('Không thể kết nối');
  return readMeta();
}

export function getProjectMeta(id: string): ProjectMeta | undefined {
  return readMeta().find((p) => p.id === id);
}

export function readProject(id: string): StoredProject | null {
  try { const s = localStorage.getItem(projectKey(id)); return s ? JSON.parse(s) : null; } catch { return null; }
}

export async function createProject(input: { name: string; templateId?: string; preset?: string }): Promise<ProjectMeta> {
  const err = validateProjectName(input.name);
  if (err) throw new Error(err);
  await delay(300);
  const tpl = TEMPLATES.find((t) => t.id === input.templateId);
  const now = new Date().toISOString();
  const meta: ProjectMeta = {
    id: uid('prj'), name: input.name.trim(), createdAt: now, updatedAt: now, status: 'draft', unit: 'mm',
    preset: input.preset, templateId: tpl?.id, icon: tpl?.icon ?? 'box',
  };
  localStorage.setItem(projectKey(meta.id), JSON.stringify({ revision: 1, name: meta.name, nodes: tpl ? tpl.build() : [], savedAt: now }));
  writeMeta([meta, ...readMeta()]);
  return meta;
}

export async function renameProject(id: string, name: string): Promise<void> {
  const err = validateProjectName(name);
  if (err) throw new Error(err);
  await delay(250);
  const list = readMeta();
  const p = list.find((x) => x.id === id);
  if (!p) throw new Error('Không tìm thấy dự án');
  p.name = name.trim(); p.updatedAt = new Date().toISOString();
  writeMeta(list);
  const content = readProject(id);
  if (content) localStorage.setItem(projectKey(id), JSON.stringify({ ...content, name: p.name }));
}

/** Duplicate creates an independent copy with a new ID; failure never leaves an empty project. */
export async function duplicateProject(id: string): Promise<ProjectMeta> {
  await delay(350);
  const src = readMeta().find((x) => x.id === id);
  const content = readProject(id);
  if (!src || !content) throw new Error('Không tìm thấy dự án nguồn');
  const now = new Date().toISOString();
  // remap node ids so the copy shares nothing with the source
  const map = new Map(content.nodes.map((n) => [n.id, uid()]));
  const nodes = content.nodes.map((n) => ({ ...structuredClone(n), id: map.get(n.id)!, parentId: n.parentId ? map.get(n.parentId) ?? null : null }));
  const meta: ProjectMeta = { ...src, id: uid('prj'), name: `${src.name} (bản sao)`.slice(0, CAPABILITIES.maxProjectNameChars), createdAt: now, updatedAt: now, status: 'draft' };
  localStorage.setItem(projectKey(meta.id), JSON.stringify({ revision: 1, name: meta.name, nodes, savedAt: now }));
  writeMeta([meta, ...readMeta()]);
  return meta;
}

/** Removes the project from the owner's list. Snapshots already sent to POD and request history are kept. */
export async function deleteProject(id: string): Promise<void> {
  await delay(900);
  if (sim().has('delete-fail') || !navigator.onLine) throw new Error('Không thể kết nối');
  writeMeta(readMeta().filter((p) => p.id !== id));
  localStorage.removeItem(projectKey(id));
  localStorage.removeItem(draftKey(id));
}

/** Called by the editor after a successful save. */
export function touchProject(id: string, patch: Partial<ProjectMeta>) {
  const list = readMeta();
  const p = list.find((x) => x.id === id);
  if (!p) return;
  Object.assign(p, patch, { updatedAt: new Date().toISOString() });
  try { writeMeta(list); } catch { delete p.thumbnail; writeMeta(list); }
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
