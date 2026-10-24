import * as THREE from 'three';
import type { CheckItem, CheckLevel, PrintReport, SceneNode, Vec3 } from './types';
import { bakedGeometry, buildGeometry, hashFloats, validateParams, weldedForTopology } from './geometry';
import { CAPABILITIES } from './config';

export const ENGINE_VERSION = 'studio-precheck 0.1 (browser)';

export interface Topology {
  triangles: number;
  boundaryEdges: number;
  nonManifoldEdges: number;
  flippedEdges: number;
  degenerate: number;
  nonFinite: boolean;
  shells: number;
}

export function analyzeTopology(g: THREE.BufferGeometry): Topology {
  const raw = g.getAttribute('position') as THREE.BufferAttribute;
  let nonFinite = false;
  for (let i = 0; i < raw.array.length; i++) if (!Number.isFinite(raw.array[i])) { nonFinite = true; break; }
  const w = weldedForTopology(g);
  const idx = w.index!;
  const pos = w.getAttribute('position') as THREE.BufferAttribute;
  const edges = new Map<string, { count: number; dir: number }>();
  const parent = new Int32Array(pos.count).map((_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const unite = (a: number, b: number) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };
  let degenerate = 0;
  const tri = new THREE.Triangle();
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  const used = new Uint8Array(pos.count);
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
    va.fromBufferAttribute(pos, a); vb.fromBufferAttribute(pos, b); vc.fromBufferAttribute(pos, c);
    tri.set(va, vb, vc);
    if (a === b || b === c || a === c || tri.getArea() < 1e-10) { degenerate++; continue; }
    used[a] = used[b] = used[c] = 1;
    unite(a, b); unite(b, c);
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      const key = u < v ? `${u}_${v}` : `${v}_${u}`;
      const e = edges.get(key) ?? { count: 0, dir: 0 };
      e.count++;
      e.dir += u < v ? 1 : -1;
      edges.set(key, e);
    }
  }
  let boundaryEdges = 0, nonManifoldEdges = 0, flippedEdges = 0;
  const open: number[][] = [];
  edges.forEach((e, key) => {
    if (e.count === 1) {
      const [s, t] = key.split('_').map(Number);
      const [u, v] = e.dir > 0 ? [s, t] : [t, s];
      open.push([pos.getX(u), pos.getY(u), pos.getZ(u), pos.getX(v), pos.getY(v), pos.getZ(v)]);
    } else if (e.count > 2) nonManifoldEdges++;
    else if (e.dir !== 0) flippedEdges++;
  });
  boundaryEdges = resolveTJunctions(open);
  const roots = new Set<number>();
  for (let i = 0; i < pos.count; i++) if (used[i]) roots.add(find(i));
  return {
    triangles: raw.count / 3,
    boundaryEdges, nonManifoldEdges, flippedEdges, degenerate, nonFinite, shells: roots.size,
  };
}

/**
 * Boolean (CSG) output often contains T-junctions: a long edge on one side meets several shorter
 * collinear edges on the other. The surface is still closed, so a boundary edge counts as open only
 * if it is not fully covered by opposite-direction collinear boundary edges.
 */
function resolveTJunctions(edges: number[][]): number {
  if (edges.length === 0) return 0;
  if (edges.length > 4000) return edges.length; // too many to verify in the browser
  let unresolved = 0;
  const tol = 2e-3;
  for (let i = 0; i < edges.length; i++) {
    const [ax, ay, az, bx, by, bz] = edges[i];
    let dx = bx - ax, dy = by - ay, dz = bz - az;
    const L = Math.hypot(dx, dy, dz);
    if (L < 1e-9) continue;
    dx /= L; dy /= L; dz /= L;
    let covered = 0;
    for (let j = 0; j < edges.length && covered < L - 1e-5; j++) {
      if (i === j) continue;
      const [cx, cy, cz, ex, ey, ez] = edges[j];
      let fx = ex - cx, fy = ey - cy, fz = ez - cz;
      const M = Math.hypot(fx, fy, fz);
      if (M < 1e-9) continue;
      fx /= M; fy /= M; fz /= M;
      if (fx * dx + fy * dy + fz * dz > -0.999) continue; // must run opposite
      const tc = (cx - ax) * dx + (cy - ay) * dy + (cz - az) * dz;
      const te = (ex - ax) * dx + (ey - ay) * dy + (ez - az) * dz;
      // perpendicular distance of c from line
      const pcx = cx - ax - tc * dx, pcy = cy - ay - tc * dy, pcz = cz - az - tc * dz;
      if (Math.hypot(pcx, pcy, pcz) > tol) continue;
      const lo = Math.max(0, Math.min(tc, te)), hi = Math.min(L, Math.max(tc, te));
      if (hi > lo) covered += hi - lo;
    }
    if (covered < L - Math.max(1e-3, L * 1e-4)) unresolved++;
  }
  return unresolved;
}

const rank: Record<CheckLevel, number> = { PASS: 0, UNKNOWN: 1, WARNING: 2, BLOCK: 3 };

export function printableNodes(nodes: SceneNode[]) {
  return nodes.filter((n) => n.kind !== 'group' && n.includedForPrint);
}

export function sceneHash(nodes: SceneNode[]): string {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const arrays: Float32Array[] = [];
  for (const n of printableNodes(nodes)) {
    const g = bakedGeometry(n, byId);
    if (g) arrays.push(g.getAttribute('position').array as Float32Array);
  }
  return hashFloats(arrays);
}

export function runPrintCheck(nodes: SceneNode[]): PrintReport {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const targets = printableNodes(nodes);
  const items: CheckItem[] = [];
  const box = new THREE.Box3();
  const partBoxes: { id: string; box: THREE.Box3 }[] = [];
  let triangles = 0, shells = 0;
  const open: string[] = [], nonManifold: string[] = [], flipped: string[] = [], degenerate: string[] = [], nonFinite: string[] = [], invalid: string[] = [], planes: string[] = [];
  const arrays: Float32Array[] = [];

  for (const n of targets) {
    if (validateParams(n.kind, n.params) || !buildGeometry(n)) { invalid.push(n.id); continue; }
    const g = bakedGeometry(n, byId)!;
    arrays.push(g.getAttribute('position').array as Float32Array);
    g.computeBoundingBox();
    box.union(g.boundingBox!);
    partBoxes.push({ id: n.id, box: g.boundingBox!.clone() });
    const t = analyzeTopology(g);
    triangles += t.triangles;
    shells += t.shells;
    if (t.nonFinite) nonFinite.push(n.id);
    if (t.boundaryEdges) open.push(n.id);
    if (t.nonManifoldEdges) nonManifold.push(n.id);
    if (t.flippedEdges) flipped.push(n.id);
    if (t.degenerate) degenerate.push(n.id);
    if (n.kind === 'plane') planes.push(n.id);
  }
  const name = (ids: string[]) => ids.map((id) => byId.get(id)?.name).join(', ');

  items.push(invalid.length
    ? { id: 'readable', label: 'Đọc được geometry', level: 'BLOCK', detail: `Không dựng được: ${name(invalid)}`, nodeIds: invalid }
    : { id: 'readable', label: 'Đọc được geometry', level: 'PASS', detail: 'Tất cả phần chọn in dựng được mesh' });
  items.push(targets.length === 0 || arrays.length === 0
    ? { id: 'empty', label: 'Geometry rỗng', level: 'BLOCK', detail: 'Không có vật thể nào được chọn in (includedForPrint)' }
    : { id: 'empty', label: 'Geometry rỗng', level: 'PASS', detail: `${arrays.length} phần có mesh` });
  items.push(nonFinite.length
    ? { id: 'finite', label: 'Toạ độ hữu hạn', level: 'BLOCK', detail: `NaN/Infinity tại ${name(nonFinite)}`, nodeIds: nonFinite }
    : { id: 'finite', label: 'Toạ độ hữu hạn', level: 'PASS', detail: 'Mọi vertex hữu hạn' });
  items.push(triangles > CAPABILITIES.maxSceneTriangles
    ? { id: 'budget', label: 'Ngân sách tam giác', level: 'BLOCK', detail: `${triangles.toLocaleString()} > ${CAPABILITIES.maxSceneTriangles.toLocaleString()}` }
    : { id: 'budget', label: 'Ngân sách tam giác', level: 'PASS', detail: `${triangles.toLocaleString()} / ${CAPABILITIES.maxSceneTriangles.toLocaleString()}` });
  items.push(open.length
    ? { id: 'boundary', label: 'Mesh kín (boundary edges)', level: 'WARNING', detail: `Mesh hở: ${name(open)}${planes.length ? ' — plane không có thể tích' : ''}`, nodeIds: open }
    : { id: 'boundary', label: 'Mesh kín (boundary edges)', level: 'PASS', detail: 'Không có cạnh biên' });
  items.push(nonManifold.length
    ? { id: 'manifold', label: 'Non-manifold edges', level: 'WARNING', detail: name(nonManifold), nodeIds: nonManifold }
    : { id: 'manifold', label: 'Non-manifold edges', level: 'PASS', detail: 'Không phát hiện' });
  items.push(flipped.length
    ? { id: 'normals', label: 'Hướng normals', level: 'WARNING', detail: `Không nhất quán: ${name(flipped)}`, nodeIds: flipped }
    : { id: 'normals', label: 'Hướng normals', level: 'PASS', detail: 'Nhất quán' });
  items.push(degenerate.length
    ? { id: 'degenerate', label: 'Mặt suy biến', level: 'WARNING', detail: name(degenerate), nodeIds: degenerate }
    : { id: 'degenerate', label: 'Mặt suy biến', level: 'PASS', detail: 'Không có' });

  const isolated = partBoxes.filter((p) => partBoxes.length > 1 && !partBoxes.some((o) => o !== p && o.box.clone().expandByScalar(0.01).intersectsBox(p.box)));
  items.push(isolated.length
    ? { id: 'parts', label: 'Phần rời', level: 'WARNING', detail: `${isolated.length} phần không chạm phần khác: ${name(isolated.map((p) => p.id))}`, nodeIds: isolated.map((p) => p.id) }
    : { id: 'parts', label: 'Phần rời', level: 'PASS', detail: `${partBoxes.length} phần · ${shells} shell` });

  const size = new THREE.Vector3();
  if (!box.isEmpty()) box.getSize(size);
  const dims: Vec3 = [size.x, size.y, size.z];
  items.push({ id: 'bbox', label: 'Kích thước tổng', level: !box.isEmpty() && Math.min(...dims) < 0.5 ? 'WARNING' : 'PASS', detail: `${dims.map((d) => d.toFixed(2)).join(' × ')} mm` });
  items.push({ id: 'thickness', label: 'Độ dày thành', level: 'UNKNOWN', detail: 'Chưa hỗ trợ trong MVP · V2' });
  items.push({ id: 'machine', label: 'Vừa máy in', level: 'UNKNOWN', detail: 'Chưa có profile máy — staff POD xác nhận' });

  const overall = items.reduce<CheckLevel>((acc, it) => (rank[it.level] > rank[acc] ? it.level : acc), 'PASS');
  return {
    sceneHash: hashFloats(arrays),
    createdAt: new Date().toISOString(),
    engine: ENGINE_VERSION,
    items,
    overall,
    dims,
    shells,
    parts: arrays.length,
    triangles,
  };
}
