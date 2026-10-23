import { create } from 'zustand';
import * as THREE from 'three';
import type {
  NodeKind, NodeParams, PrintReport, PrintRequestReceipt, SaveState, SceneNode, Snapshot, Vec3,
} from './types';
import {
  bakedGeometry, decompose, descendants, encodeFloat32, hashFloats, localMatrix, validateParams, worldBox, worldMatrix,
} from './geometry';
import { analyzeTopology } from './printCheck';
import { runBoolean, type BoolOp } from './csg';
import { CAPABILITIES } from './config';
import { DEFAULT_PARAMS, makeNode, uid } from './scene';
import {
  createPrintRequest, draftKey, fetchProject, getPrintRequest, listSnapshots, patchSnapshot, saveProjectContent, StudioApiError, uploadSnapshot,
} from './projects';

export type Tool = 'select' | 'move' | 'rotate' | 'scale' | 'measure';
export type Modal = null | 'import' | 'export' | 'check' | 'send' | 'shortcuts' | 'onboarding' | 'boolean';
export type ViewPreset = 'perspective' | 'top' | 'front' | 'right';

export interface Toast { id: number; kind: 'info' | 'success' | 'warning' | 'error'; title: string; text?: string }

export { uid, makeNode, keychainTemplate, TEMPLATES, DEFAULT_PARAMS } from './scene';

let PID = '';
const DRAFT_KEY = () => draftKey(PID);

interface HistoryEntry { nodes: SceneNode[]; selection: string[]; label: string }

interface State {
  projectName: string;
  nodes: SceneNode[];
  selection: string[];
  tool: Tool;
  space: 'world' | 'local';
  past: HistoryEntry[];
  future: HistoryEntry[];
  saveState: SaveState;
  revision: number;
  lastSavedAt: string | null;
  saveError: string | null;
  lastEditAt: number;
  grid: { size: number; angle: number; snap: boolean; show: boolean };
  projection: 'perspective' | 'orthographic';
  viewRequest: { preset: ViewPreset | 'fit' | 'home'; n: number };
  report: PrintReport | null;
  snapshots: Snapshot[];
  requests: PrintRequestReceipt[];
  modal: Modal;
  toasts: Toast[];
  measure: THREE.Vector3[];
  lockRatio: boolean;

  projectId: string;
  init(projectId: string): Promise<boolean>;
  leave(): void;
  toast(t: Omit<Toast, 'id'>): void;
  dismissToast(id: number): void;
  setModal(m: Modal): void;
  setTool(t: Tool): void;
  setSpace(s: 'world' | 'local'): void;
  setGrid(p: Partial<State['grid']>): void;
  setProjection(p: State['projection']): void;
  requestView(p: ViewPreset | 'fit' | 'home'): void;
  setLockRatio(v: boolean): void;
  rename(name: string): string | null;

  commit(nodes: SceneNode[], label: string, selection?: string[]): void;
  select(id: string | null, mode?: 'replace' | 'toggle' | 'add'): void;
  selectAll(): void;
  addNode(kind: NodeKind, params?: NodeParams): string | null;
  insertNodes(nodes: SceneNode[], label: string): void;
  updateNode(id: string, patch: Partial<SceneNode>, label?: string): void;
  updateParams(id: string, params: NodeParams): string | null;
  setTransform(id: string, t: { position?: Vec3; rotation?: Vec3; scale?: Vec3 }): void;
  deleteSelected(): void;
  duplicateSelected(): void;
  groupSelected(): void;
  ungroupSelected(): void;
  reparent(id: string, parentId: string | null): void;
  toggleFlag(id: string, flag: 'visible' | 'locked' | 'includedForPrint'): void;
  align(axis: 0 | 1 | 2, mode: 'min' | 'center' | 'max'): void;
  distribute(axis: 0 | 1 | 2): void;
  booleanOp(op: BoolOp, aId: string, bId: string, keepSource: boolean): { ok: boolean; error?: string };
  importMesh(name: string, positions: Float32Array, sourceHash: string, unitLabel: string): void;
  undo(): void;
  redo(): void;
  save(): Promise<void>;
  reloadFromServer(): Promise<void>;
  saveAsCopy(): Promise<void>;
  setReport(r: PrintReport | null): void;
  addSnapshot(s: Snapshot): void;
  updateSnapshot(id: string, patch: Partial<Snapshot>): void;
  uploadSnapshot(s: Snapshot, stl: Blob): Promise<void>;
  submitPrintRequest(input: Omit<PrintRequestReceipt, 'id' | 'stage' | 'observedAt' | 'createdAt'>): Promise<PrintRequestReceipt>;
  refreshRequest(id: string): Promise<void>;
  addMeasurePoint(p: THREE.Vector3 | null): void;
}

let toastSeq = 1;
/** Snapshot đã có trên server (đã upload STL) — chỉ những snapshot này mới đồng bộ trạng thái. */
const uploaded = new Set<string>();
let initialized: string | null = null;

export const useStudio = create<State>((set, get) => ({
  projectId: '',
  projectName: '',
  nodes: [],
  selection: [],
  tool: 'move',
  space: 'world',
  past: [],
  future: [],
  saveState: 'clean',
  revision: 0,
  lastSavedAt: null,
  saveError: null,
  lastEditAt: 0,
  grid: { size: 1, angle: 15, snap: true, show: true },
  projection: 'perspective',
  viewRequest: { preset: 'home', n: 0 },
  report: null,
  snapshots: [],
  requests: [],
  modal: null,
  toasts: [],
  measure: [],
  lockRatio: true,

  async init(projectId) {
    if (initialized === projectId) return true;
    const server = await fetchProject(projectId);
    if (!server) return false;
    initialized = projectId;
    PID = projectId;
    let snapshots: Snapshot[] = [];
    let requests: PrintRequestReceipt[] = [];
    try { ({ snapshots, requests } = await listSnapshots(projectId)); } catch { /* hiển thị rỗng, không chặn editor */ }
    snapshots.forEach((x) => uploaded.add(`${projectId}/${x.id}`));
    set({
      projectId, projectName: server.name, nodes: server.nodes, revision: server.revision, lastSavedAt: server.savedAt,
      saveState: 'clean', saveError: null, snapshots, past: [], future: [], selection: [], report: null, modal: null, measure: [],
      tool: 'move', viewRequest: { preset: 'home', n: 0 }, requests,
    });
    // Bản nháp phục hồi cục bộ (FR-002): chỉ dùng nếu dựa trên đúng revision hiện tại của server.
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY()) ?? 'null');
      if (d && d.baseRevision === server.revision && d.dirty) {
        set({ nodes: d.nodes, saveState: 'dirty', lastEditAt: Date.now() });
        get().toast({ kind: 'info', title: 'Đã khôi phục bản nháp chưa lưu', text: `Dựa trên revision ${server.revision}. Bấm Lưu để ghi lên server.` });
      }
    } catch { /* ignore */ }
    if (!localStorage.getItem('3dw.onboarded')) set({ modal: 'onboarding' });
    return true;
  },

  leave() { initialized = null; },

  toast(t) {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => get().dismissToast(id), t.kind === 'error' ? 8000 : 4500);
  },
  dismissToast(id) { set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })); },
  setModal(modal) { set({ modal }); },
  setTool(tool) { set({ tool, measure: [] }); },
  setSpace(space) { set({ space }); },
  setGrid(p) { set((s) => ({ grid: { ...s.grid, ...p } })); },
  setProjection(projection) { set({ projection }); },
  requestView(preset) { set((s) => ({ viewRequest: { preset, n: s.viewRequest.n + 1 } })); },
  setLockRatio(lockRatio) { set({ lockRatio }); },
  rename(name) {
    const t = name.trim();
    if (!t) return 'Tên không được rỗng';
    if (Array.from(t).length > CAPABILITIES.maxProjectNameChars) return `Tối đa ${CAPABILITIES.maxProjectNameChars} ký tự`;
    set({ projectName: t, saveState: 'dirty', lastEditAt: Date.now() });
    return null;
  },

  commit(nodes, label, selection) {
    const s = get();
    if (nodes.length > CAPABILITIES.maxSceneNodes) {
      s.toast({ kind: 'error', title: 'Vượt giới hạn node', text: `Tối đa ${CAPABILITIES.maxSceneNodes} node trong scene.` });
      return;
    }
    const past = [...s.past, { nodes: s.nodes, selection: s.selection, label }].slice(-CAPABILITIES.undoCommands);
    const sel = (selection ?? s.selection).filter((id) => nodes.some((n) => n.id === id));
    set({ nodes, past, future: [], selection: sel, saveState: s.saveState === 'conflict' ? 'conflict' : 'dirty', lastEditAt: Date.now() });
    try { localStorage.setItem(DRAFT_KEY(), JSON.stringify({ baseRevision: s.revision, nodes, dirty: true })); } catch { /* quota */ }
  },

  select(id, mode = 'replace') {
    if (id === null) { set({ selection: [] }); return; }
    const s = get();
    if (mode === 'toggle') set({ selection: s.selection.includes(id) ? s.selection.filter((x) => x !== id) : [...s.selection, id] });
    else if (mode === 'add') set({ selection: s.selection.includes(id) ? s.selection : [...s.selection, id] });
    else set({ selection: [id] });
  },
  selectAll() { set((s) => ({ selection: s.nodes.filter((n) => n.parentId === null).map((n) => n.id) })); },

  addNode(kind, params) {
    const node = makeNode(kind, params ? { params: { ...(DEFAULT_PARAMS as any)[kind], ...params } } : {});
    const err = validateParams(kind, node.params);
    if (err) { get().toast({ kind: 'error', title: 'Không thể tạo hình', text: err }); return null; }
    const count = get().nodes.filter((n) => n.kind === kind).length;
    if (count) node.name = `${node.name} ${count + 1}`;
    get().commit([...get().nodes, node], `Thêm ${node.name}`, [node.id]);
    return node.id;
  },

  insertNodes(nodes, label) {
    get().commit([...get().nodes, ...nodes], label, nodes.filter((n) => !n.parentId).map((n) => n.id));
  },

  updateNode(id, patch, label = 'Sửa thuộc tính') {
    const nodes = get().nodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
    get().commit(nodes, label);
  },

  updateParams(id, params) {
    const n = get().nodes.find((x) => x.id === id);
    if (!n) return 'Không tìm thấy node';
    if (n.locked) return 'Node đang khóa';
    const next = { ...n.params, ...params };
    const err = validateParams(n.kind, next);
    if (err) return err;
    get().updateNode(id, { params: next }, 'Sửa tham số');
    return null;
  },

  setTransform(id, t) {
    const n = get().nodes.find((x) => x.id === id);
    if (!n || n.locked) return;
    const all = [...(t.position ?? []), ...(t.rotation ?? []), ...(t.scale ?? [])];
    if (all.some((v) => !Number.isFinite(v))) return;
    if (t.scale && t.scale.some((v) => v === 0)) return;
    get().updateNode(id, t, 'Biến đổi');
  },

  deleteSelected() {
    const s = get();
    const ids = new Set<string>();
    s.selection.forEach((id) => {
      const n = s.nodes.find((x) => x.id === id);
      if (n && !n.locked) { ids.add(id); descendants(id, s.nodes).forEach((d) => ids.add(d.id)); }
    });
    if (!ids.size) return;
    s.commit(s.nodes.filter((n) => !ids.has(n.id)), 'Xóa', []);
  },

  duplicateSelected() {
    const s = get();
    const roots = s.selection.filter((id) => !s.selection.includes(s.nodes.find((n) => n.id === id)?.parentId ?? ''));
    const clones: SceneNode[] = [];
    const newRoots: string[] = [];
    const cloneTree = (n: SceneNode, parentId: string | null, isRoot: boolean) => {
      const c: SceneNode = { ...structuredClone(n), id: uid(), parentId, name: isRoot ? `${n.name} (bản sao)` : n.name, locked: false };
      if (isRoot) { c.position = [n.position[0] + 10, n.position[1], n.position[2] + 10]; newRoots.push(c.id); }
      clones.push(c);
      s.nodes.filter((x) => x.parentId === n.id).forEach((ch) => cloneTree(ch, c.id, false));
    };
    roots.forEach((id) => { const n = s.nodes.find((x) => x.id === id); if (n) cloneTree(n, n.parentId, true); });
    if (clones.length) s.commit([...s.nodes, ...clones], 'Nhân bản', newRoots);
  },

  groupSelected() {
    const s = get();
    const sel = s.selection.filter((id) => s.nodes.find((n) => n.id === id && !n.locked));
    if (sel.length < 1) return;
    const parents = new Set(sel.map((id) => s.nodes.find((n) => n.id === id)!.parentId));
    const parentId = parents.size === 1 ? [...parents][0] : null;
    const group = makeNode('group', { name: `Nhóm ${s.nodes.filter((n) => n.kind === 'group').length + 1}`, parentId });
    const byId = new Map(s.nodes.map((n) => [n.id, n]));
    const groupWorldInv = worldMatrix(parentId, byId).invert(); // group is identity relative to its parent
    const nodes = s.nodes.map((n) => {
      if (!sel.includes(n.id)) return n;
      // keep world transform when reparenting
      const local = groupWorldInv.clone().multiply(worldMatrix(n.id, byId));
      return { ...n, parentId: group.id, ...decompose(local) };
    });
    s.commit([...nodes, group], 'Group', [group.id]);
  },

  ungroupSelected() {
    const s = get();
    const groups = s.selection.map((id) => s.nodes.find((n) => n.id === id)).filter((n): n is SceneNode => !!n && n.kind === 'group' && !n.locked);
    if (!groups.length) return;
    const byId = new Map(s.nodes.map((n) => [n.id, n]));
    let nodes = s.nodes;
    const newSel: string[] = [];
    for (const g of groups) {
      const gLocal = localMatrix(g);
      nodes = nodes.map((n) => {
        if (n.parentId !== g.id) return n;
        newSel.push(n.id);
        return { ...n, parentId: g.parentId, ...decompose(gLocal.clone().multiply(localMatrix(n))) };
      }).filter((n) => n.id !== g.id);
    }
    void byId;
    s.commit(nodes, 'Ungroup', newSel);
  },

  reparent(id, parentId) {
    const s = get();
    if (id === parentId) return;
    if (parentId && descendants(id, s.nodes).some((d) => d.id === parentId)) {
      s.toast({ kind: 'warning', title: 'Không thể kéo vào node con', text: 'Cây đối tượng không được có chu trình.' });
      return;
    }
    const n = s.nodes.find((x) => x.id === id);
    if (!n || n.locked || n.parentId === parentId) return;
    if (parentId && s.nodes.find((x) => x.id === parentId)?.kind !== 'group') return;
    const byId = new Map(s.nodes.map((x) => [x.id, x]));
    const local = worldMatrix(parentId, byId).invert().multiply(worldMatrix(id, byId));
    s.commit(s.nodes.map((x) => (x.id === id ? { ...x, parentId, ...decompose(local) } : x)), 'Reparent');
  },

  toggleFlag(id, flag) {
    const n = get().nodes.find((x) => x.id === id);
    if (!n) return;
    const label = flag === 'visible' ? (n.visible ? 'Ẩn' : 'Hiện') : flag === 'locked' ? (n.locked ? 'Mở khóa' : 'Khóa') : 'Đổi chọn in';
    const ids = new Set([id, ...(flag === 'includedForPrint' ? descendants(id, get().nodes).map((d) => d.id) : [])]);
    const value = !n[flag];
    get().commit(get().nodes.map((x) => (ids.has(x.id) ? { ...x, [flag]: value } : x)), label);
  },

  align(axis, mode) {
    const s = get();
    const ids = s.selection.filter((id) => !s.nodes.find((n) => n.id === id)?.locked);
    if (ids.length < 2) return;
    const all = worldBox(ids, s.nodes);
    const target = mode === 'min' ? all.min.getComponent(axis) : mode === 'max' ? all.max.getComponent(axis) : (all.min.getComponent(axis) + all.max.getComponent(axis)) / 2;
    const nodes = s.nodes.map((n) => {
      if (!ids.includes(n.id)) return n;
      const b = worldBox([n.id], s.nodes);
      const cur = mode === 'min' ? b.min.getComponent(axis) : mode === 'max' ? b.max.getComponent(axis) : (b.min.getComponent(axis) + b.max.getComponent(axis)) / 2;
      const p = [...n.position] as Vec3;
      p[axis] += target - cur; // assumes parent has no rotation/scale on this axis (common case)
      return { ...n, position: p };
    });
    s.commit(nodes, 'Căn chỉnh');
  },

  distribute(axis) {
    const s = get();
    const ids = s.selection.filter((id) => !s.nodes.find((n) => n.id === id)?.locked);
    if (ids.length < 3) return;
    const centers = ids.map((id) => { const b = worldBox([id], s.nodes); return { id, c: (b.min.getComponent(axis) + b.max.getComponent(axis)) / 2 }; }).sort((a, b) => a.c - b.c);
    const first = centers[0].c, last = centers[centers.length - 1].c, step = (last - first) / (centers.length - 1);
    const delta = new Map(centers.map((c, i) => [c.id, first + step * i - c.c]));
    s.commit(s.nodes.map((n) => {
      if (!delta.has(n.id)) return n;
      const p = [...n.position] as Vec3; p[axis] += delta.get(n.id)!; return { ...n, position: p };
    }), 'Phân bố đều');
  },

  booleanOp(op, aId, bId, keepSource) {
    const s = get();
    const byId = new Map(s.nodes.map((n) => [n.id, n]));
    const a = byId.get(aId), b = byId.get(bId);
    if (!a || !b || a.kind === 'group' || b.kind === 'group') return { ok: false, error: 'Chọn 2 mesh (không phải group). Group không phải union.' };
    if (a.locked || b.locked) return { ok: false, error: 'Một trong hai đối tượng đang khóa.' };
    const ga = bakedGeometry(a, byId), gb = bakedGeometry(b, byId);
    if (!ga || !gb) return { ok: false, error: 'Không dựng được geometry nguồn.' };
    for (const [n, g] of [[a, ga], [b, gb]] as const) {
      const t = analyzeTopology(g);
      if (t.boundaryEdges || t.nonManifoldEdges) return { ok: false, error: `Mesh hở hoặc non-manifold: ${n.name}. Boolean cần mesh kín.` };
    }
    let positions: Float32Array;
    try {
      const t0 = performance.now();
      positions = runBoolean(ga, gb, op);
      if (performance.now() - t0 > 30_000) return { ok: false, error: 'Quá thời gian xử lý (30 s). Nguồn được giữ nguyên.' };
    } catch (e) {
      return { ok: false, error: `Lỗi geometry: ${(e as Error).message}. Nguồn được giữ nguyên.` };
    }
    if (positions.length < 9) return { ok: false, error: 'Kết quả rỗng — hai vật thể có thể không giao nhau.' };
    const opName = op === 'union' ? 'Union' : op === 'subtract' ? 'Subtract' : 'Intersect';
    const result = makeNode('mesh', {
      name: `${opName} (${a.name} ${op === 'subtract' ? '−' : op === 'union' ? '+' : '∩'} ${b.name})`,
      mesh: { positions: encodeFloat32(positions), sourceHash: hashFloats([positions]), provenance: `boolean:${op}:${a.id}:${b.id}` },
      appearance: { ...a.appearance },
    });
    const nodes = keepSource
      ? s.nodes.map((n) => (n.id === aId || n.id === bId ? { ...n, visible: false, includedForPrint: false, name: n.name.endsWith('(nguồn)') ? n.name : `${n.name} (nguồn)` } : n))
      : s.nodes.filter((n) => n.id !== aId && n.id !== bId);
    s.commit([...nodes, result], `Boolean ${opName}`, [result.id]);
    return { ok: true };
  },

  importMesh(name, positions, sourceHash, unitLabel) {
    const node = makeNode('mesh', {
      name,
      mesh: { positions: encodeFloat32(positions), sourceHash, provenance: `import:stl:${unitLabel}` },
    });
    get().commit([...get().nodes, node], `Import ${name}`, [node.id]);
  },

  undo() {
    const s = get();
    const prev = s.past[s.past.length - 1];
    if (!prev) return;
    set({
      nodes: prev.nodes, selection: prev.selection, past: s.past.slice(0, -1),
      future: [{ nodes: s.nodes, selection: s.selection, label: prev.label }, ...s.future],
      saveState: 'dirty', lastEditAt: Date.now(),
    });
  },
  redo() {
    const s = get();
    const next = s.future[0];
    if (!next) return;
    set({
      nodes: next.nodes, selection: next.selection, future: s.future.slice(1),
      past: [...s.past, { nodes: s.nodes, selection: s.selection, label: next.label }],
      saveState: 'dirty', lastEditAt: Date.now(),
    });
  },

  async save() {
    const s = get();
    if (s.saveState === 'saving' || s.saveState === 'conflict') return;
    if (!navigator.onLine) { set({ saveState: 'offline' }); return; }
    // capture the project: the user may leave the editor while the request is in flight
    const pid = PID;
    const name = s.projectName;
    const baseRevision = s.revision;
    const nodesAtSave = s.nodes;
    const stillHere = () => PID === pid && initialized === pid;
    set({ saveState: 'saving', saveError: null });
    try {
      const r = await saveProjectContent(pid, { baseRevision, name, nodes: nodesAtSave });
      if (!stillHere()) { localStorage.removeItem(draftKey(pid)); return; }
      const stillSame = get().nodes === nodesAtSave;
      try { localStorage.setItem(draftKey(pid), JSON.stringify({ baseRevision: r.revision, nodes: get().nodes, dirty: !stillSame })); } catch { /* quota */ }
      set({ revision: r.revision, lastSavedAt: r.savedAt, saveState: stillSame ? 'clean' : 'dirty' });
    } catch (e) {
      if (!stillHere()) return;
      if (e instanceof StudioApiError && e.code === 'REVISION_CONFLICT') {
        set({ saveState: 'conflict' });
        get().toast({ kind: 'error', title: 'Xung đột revision (409)', text: `Server đã ở revision ${String(e.data?.currentRevision ?? '?')}. Tải lại hoặc lưu bản sao.` });
        return;
      }
      if (e instanceof StudioApiError && e.status === 0) { set({ saveState: 'offline' }); return; }
      set({ saveState: 'error', saveError: (e as Error).message || 'Lưu thất bại' });
    }
  },

  async reloadFromServer() {
    const server = await fetchProject(PID);
    if (!server) return;
    localStorage.removeItem(DRAFT_KEY());
    set({ nodes: server.nodes, projectName: server.name, revision: server.revision, lastSavedAt: server.savedAt, saveState: 'clean', past: [], future: [], selection: [], report: null });
  },
  async saveAsCopy() {
    // Giữ thay đổi cục bộ nhưng rebase lên revision mới nhất của server như một revision mới (người dùng chủ động chọn).
    const server = await fetchProject(PID);
    if (!server) return;
    set({ revision: server.revision, saveState: 'dirty', projectName: `${get().projectName} (bản sao)` });
    void get().save();
  },

  setReport(report) { set({ report }); },
  addSnapshot(snap) {
    set({ snapshots: [...get().snapshots.filter((x) => x.id !== snap.id), snap] });
  },
  updateSnapshot(id, patch) {
    set({ snapshots: get().snapshots.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
    // Đồng bộ trạng thái lên server (snapshot chỉ tồn tại ở server sau khi đã upload STL)
    if (uploaded.has(`${PID}/${id}`) && (patch.state || patch.consentVersion)) void patchSnapshot(PID, id, patch).catch(() => { /* server giữ trạng thái cũ */ });
  },
  async uploadSnapshot(snap, stl) {
    const saved = await uploadSnapshot(PID, snap, stl);
    uploaded.add(`${PID}/${snap.id}`);
    set({ snapshots: get().snapshots.map((x) => (x.id === snap.id ? { ...x, ...saved } : x)) });
  },

  async submitPrintRequest(input) {
    const snap = get().snapshots.find((x) => x.id === input.snapshotId);
    if (!snap || snap.state !== 'READY') throw new Error('Snapshot chưa READY');
    // Idempotency: thử lại với cùng khóa trả về đúng yêu cầu ban đầu (server kiểm tra)
    const receipt = await createPrintRequest({ ...input, projectId: PID, consentVersion: CAPABILITIES.consentVersion });
    set((s) => ({ requests: [...s.requests.filter((r) => r.id !== receipt.id), receipt] }));
    return receipt;
  },
  async refreshRequest(id) {
    try {
      const r = await getPrintRequest(id);
      set((s) => ({ requests: s.requests.map((x) => (x.id === id ? r : x)) }));
    } catch (e) {
      get().toast({ kind: 'error', title: 'Không làm mới được', text: (e as Error).message });
    }
  },

  addMeasurePoint(p) {
    if (!p) { set({ measure: [] }); return; }
    const m = get().measure;
    set({ measure: m.length >= 2 ? [p] : [...m, p] });
  },
}));

export const selectSelectedNodes = (s: State) => s.nodes.filter((n) => s.selection.includes(n.id));

if (import.meta.env.DEV) (window as unknown as { studio: typeof useStudio }).studio = useStudio;
