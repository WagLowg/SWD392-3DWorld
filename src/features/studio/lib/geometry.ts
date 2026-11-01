import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { NodeParams, SceneNode, Vec3 } from '../types';
import { layoutText } from './fonts';
import { CAPABILITIES } from '../config';

const DEG = Math.PI / 180;

/* ---------- base64 helpers for mesh payloads ---------- */
export function encodeFloat32(arr: Float32Array): string {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function decodeFloat32(b64: string): Float32Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

/* ---------- parameter validation (FR-004..006) ---------- */
const pos = (v: number | undefined) => typeof v === 'number' && Number.isFinite(v) && v > 0;

export function validateParams(kind: SceneNode['kind'], p: NodeParams): string | null {
  switch (kind) {
    case 'box':
      return pos(p.width) && pos(p.height) && pos(p.depth) ? null : 'Kích thước phải > 0 mm';
    case 'plane':
      return pos(p.width) && pos(p.height) ? null : 'Kích thước phải > 0 mm';
    case 'sphere':
      return pos(p.radius) ? null : 'Bán kính phải > 0 mm';
    case 'cylinder':
    case 'cone':
      return pos(p.radius) && pos(p.height) ? null : 'Bán kính và chiều cao phải > 0 mm';
    case 'torus':
      if (!pos(p.radius) || !pos(p.tube)) return 'Bán kính phải > 0 mm';
      return p.tube! < p.radius! ? null : 'Bán kính ống phải nhỏ hơn bán kính vòng';
    case 'text': {
      const t = (p.text ?? '').trim();
      if (!t) return 'Văn bản rỗng không sinh mesh';
      if (Array.from(t).length > CAPABILITIES.maxTextChars) return `Tối đa ${CAPABILITIES.maxTextChars} ký tự`;
      return pos(p.fontSize) && pos(p.depth) ? null : 'Cỡ chữ và độ đùn phải > 0 mm';
    }
    case 'extrude': {
      if (!pos(p.depth)) return 'Độ đùn phải > 0 mm';
      if (p.profile === 'circle') {
        if (!pos(p.radius)) return 'Bán kính phải > 0 mm';
      } else if (p.profile === 'polygon') {
        if (!pos(p.radius)) return 'Bán kính phải > 0 mm';
        if (!Number.isInteger(p.sides) || (p.sides ?? 0) < 3) return 'Polygon cần ít nhất 3 cạnh';
      } else {
        if (!pos(p.width) || !pos(p.height)) return 'Kích thước phải > 0 mm';
        const r = p.cornerRadius ?? 0;
        if (r < 0 || r * 2 > Math.min(p.width!, p.height!)) return 'Bo góc vượt quá kích thước';
      }
      if (p.holeRadius && p.holeRadius > 0) {
        const outer = profileHalfExtent(p);
        if (Math.abs(p.holeOffsetX ?? 0) + p.holeRadius >= outer) return 'Lỗ nằm ngoài hoặc chạm đường bao';
      }
      return null;
    }
    default:
      return null;
  }
}

function profileHalfExtent(p: NodeParams) {
  if (p.profile === 'circle' || p.profile === 'polygon') return (p.radius ?? 0) * (p.profile === 'polygon' ? Math.cos(Math.PI / (p.sides ?? 3)) : 1);
  return Math.min(p.width ?? 0, p.height ?? 0) / 2 + Math.max(0, (p.width ?? 0) - (p.height ?? 0)) / 2;
}

/* ---------- geometry builders ---------- */
function stripToPN(g: THREE.BufferGeometry): THREE.BufferGeometry {
  let out = g.index ? g.toNonIndexed() : g;
  // remove degenerate triangles (e.g. cone apex) so checks only flag real issues
  const p = out.getAttribute('position') as THREE.BufferAttribute;
  const keep: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const tri = new THREE.Triangle();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    tri.set(a, b, c);
    if (tri.getArea() > 1e-12) keep.push(i);
  }
  if (keep.length * 3 !== p.count) {
    const arr = new Float32Array(keep.length * 9);
    keep.forEach((i, k) => {
      for (let j = 0; j < 9; j++) arr[k * 9 + j] = p.array[i * 3 + j];
    });
    out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  }
  out.deleteAttribute('uv');
  out.deleteAttribute('normal');
  out.computeVertexNormals();
  return out;
}

function profileShape(p: NodeParams): THREE.Shape {
  const shape = new THREE.Shape();
  if (p.profile === 'circle') {
    shape.absarc(0, 0, p.radius!, 0, Math.PI * 2, false);
  } else if (p.profile === 'polygon') {
    const n = p.sides!;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2 + Math.PI / 2;
      const x = Math.cos(t) * p.radius!, y = Math.sin(t) * p.radius!;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
  } else {
    const w = p.width!, h = p.height!, r = Math.min(p.cornerRadius ?? 0, w / 2, h / 2);
    const x = -w / 2, y = -h / 2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    if (r) shape.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    shape.lineTo(x + w, y + h - r);
    if (r) shape.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    shape.lineTo(x + r, y + h);
    if (r) shape.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(x, y + r);
    if (r) shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  }
  if (p.holeRadius && p.holeRadius > 0) {
    const hole = new THREE.Path();
    hole.absarc(p.holeOffsetX ?? 0, 0, p.holeRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return shape;
}

/** Sample curves to points and drop near-duplicate points so extrusion yields a watertight mesh. */
function cleanPoints(pts: THREE.Vector2[]): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (const p of pts) if (!out.length || out[out.length - 1].distanceTo(p) > 1e-3) out.push(p);
  while (out.length > 1 && out[0].distanceTo(out[out.length - 1]) <= 1e-3) out.pop();
  return out;
}

function cleanShape(s: THREE.Shape): THREE.Shape {
  const shape = new THREE.Shape(cleanPoints(s.getPoints(6)));
  shape.holes = s.holes.map((h) => new THREE.Path(cleanPoints(h.getPoints(6))));
  return shape;
}

export interface TextBuild {
  geometry: THREE.BufferGeometry;
  missing: string[];
}

function buildText(p: NodeParams): TextBuild {
  const { commands, missing } = layoutText(p.text ?? '', p.fontSize!);
  const sp = new THREE.ShapePath();
  for (const c of commands) {
    // opentype paths are y-down; flip to y-up
    if (c.type === 'M') sp.moveTo(c.x, -c.y);
    else if (c.type === 'L') sp.lineTo(c.x, -c.y);
    else if (c.type === 'Q') sp.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y);
    else if (c.type === 'C') sp.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
  }
  // three ≥ r18x: toShapes() tự phân biệt contour ngoài / lỗ theo quan hệ bao chứa (không phụ thuộc chiều vẽ).
  const shapes = sp.toShapes().map(cleanShape);
  const g = new THREE.ExtrudeGeometry(shapes, { depth: p.depth!, bevelEnabled: false, curveSegments: 6 });
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  g.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0);
  return { geometry: stripToPN(g), missing };
}

const cache = new Map<string, { geometry: THREE.BufferGeometry; missing: string[] }>();

export function nodeGeometryKey(n: SceneNode) {
  if (n.kind === 'mesh') return `mesh:${n.id}:${n.mesh?.positions.length}:${n.mesh?.sourceHash}`;
  return `${n.kind}:${JSON.stringify(n.params)}`;
}

/** Local-space geometry of a node (mm). Returns null for groups or invalid params. */
export function buildGeometry(n: SceneNode): { geometry: THREE.BufferGeometry; missing: string[] } | null {
  if (n.kind === 'group') return null;
  if (validateParams(n.kind, n.params)) return null;
  const key = nodeGeometryKey(n);
  const hit = cache.get(key);
  if (hit) return hit;
  const p = n.params;
  const seg = Math.max(8, Math.min(128, p.segments ?? 48));
  let g: THREE.BufferGeometry;
  let missing: string[] = [];
  switch (n.kind) {
    case 'box': g = new THREE.BoxGeometry(p.width, p.height, p.depth); break;
    case 'plane': g = new THREE.PlaneGeometry(p.width, p.height); break;
    case 'sphere': g = new THREE.SphereGeometry(p.radius, seg, Math.round(seg / 2)); break;
    case 'cylinder': g = new THREE.CylinderGeometry(p.radius, p.radius, p.height, seg); break;
    case 'cone': g = new THREE.ConeGeometry(p.radius, p.height, seg); break;
    case 'torus': g = new THREE.TorusGeometry(p.radius, p.tube, Math.round(seg / 2), seg); break;
    case 'extrude':
      g = new THREE.ExtrudeGeometry(profileShape(p), { depth: p.depth, bevelEnabled: false, curveSegments: 24 });
      break;
    case 'text': {
      const t = buildText(p);
      g = t.geometry; missing = t.missing;
      break;
    }
    case 'mesh': {
      g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(decodeFloat32(n.mesh!.positions), 3));
      break;
    }
    default: return null;
  }
  const out = { geometry: n.kind === 'text' ? g : stripToPN(g), missing };
  out.geometry.computeBoundingBox();
  if (cache.size > 300) cache.delete(cache.keys().next().value!);
  cache.set(key, out);
  return out;
}

/* ---------- transforms ---------- */
export function localMatrix(n: SceneNode): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(n.rotation[0] * DEG, n.rotation[1] * DEG, n.rotation[2] * DEG, 'XYZ'),
  );
  return new THREE.Matrix4().compose(new THREE.Vector3(...n.position), q, new THREE.Vector3(...n.scale));
}

export function worldMatrix(id: string | null, byId: Map<string, SceneNode>): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  let cur = id ? byId.get(id) : undefined;
  const chain: SceneNode[] = [];
  while (cur) { chain.unshift(cur); cur = cur.parentId ? byId.get(cur.parentId) : undefined; }
  for (const c of chain) m.multiply(localMatrix(c));
  return m;
}

export function decompose(m: THREE.Matrix4): { position: Vec3; rotation: Vec3; scale: Vec3 } {
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  m.decompose(p, q, s);
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  const r = (v: number) => Math.round(v * 1e6) / 1e6;
  return {
    position: [r(p.x), r(p.y), r(p.z)],
    rotation: [r(e.x / DEG), r(e.y / DEG), r(e.z / DEG)],
    scale: [r(s.x), r(s.y), r(s.z)],
  };
}

/** World-space (baked) geometry for a node, or null. */
export function bakedGeometry(n: SceneNode, byId: Map<string, SceneNode>): THREE.BufferGeometry | null {
  const b = buildGeometry(n);
  if (!b) return null;
  const g = b.geometry.clone();
  g.applyMatrix4(worldMatrix(n.id, byId));
  return g;
}

export function descendants(id: string, nodes: SceneNode[]): SceneNode[] {
  const out: SceneNode[] = [];
  const walk = (pid: string) => nodes.filter((n) => n.parentId === pid).forEach((c) => { out.push(c); walk(c.id); });
  walk(id);
  return out;
}

/** World bounding box of a set of nodes (including group descendants). */
export function worldBox(ids: string[], nodes: SceneNode[]): THREE.Box3 {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const box = new THREE.Box3();
  const set = new Set<string>();
  ids.forEach((id) => { set.add(id); descendants(id, nodes).forEach((d) => set.add(d.id)); });
  set.forEach((id) => {
    const n = byId.get(id);
    if (!n) return;
    const b = buildGeometry(n);
    if (!b) return;
    const bb = b.geometry.boundingBox!.clone().applyMatrix4(worldMatrix(id, byId));
    box.union(bb);
  });
  return box;
}

export function localSize(n: SceneNode): Vec3 | null {
  const b = buildGeometry(n);
  if (!b) return null;
  const s = new THREE.Vector3();
  b.geometry.boundingBox!.getSize(s);
  return [s.x * Math.abs(n.scale[0]), s.y * Math.abs(n.scale[1]), s.z * Math.abs(n.scale[2])];
}

export function baseSize(n: SceneNode): Vec3 | null {
  const b = buildGeometry(n);
  if (!b) return null;
  const s = new THREE.Vector3();
  b.geometry.boundingBox!.getSize(s);
  return [s.x, s.y, s.z];
}

export function triangleCount(n: SceneNode): number {
  const b = buildGeometry(n);
  return b ? b.geometry.getAttribute('position').count / 3 : 0;
}

/* ---------- hashing ---------- */
export function hashFloats(arrays: Float32Array[]): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (const arr of arrays) {
    for (let i = 0; i < arr.length; i++) {
      // round to tolerance so hash is stable across float noise
      const v = Math.round(arr[i] * 1000) | 0;
      h1 = Math.imul(h1 ^ v, 16777619) >>> 0;
      h2 = Math.imul(h2 ^ (v >>> 3), 2246822519) >>> 0;
    }
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

export function weldedForTopology(g: THREE.BufferGeometry) {
  const only = new THREE.BufferGeometry();
  only.setAttribute('position', g.getAttribute('position'));
  return mergeVertices(only, 1e-4);
}
