import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { SceneNode } from './types';
import { bakedGeometry, hashFloats } from './geometry';
import { CAPABILITIES } from './config';

export const UNIT_TO_MM = { mm: 1, cm: 10, m: 1000, inch: 25.4 } as const;
export type ImportUnit = keyof typeof UNIT_TO_MM;

export interface ParsedStl {
  positions: Float32Array; // raw, in source units
  triangles: number;
  sourceHash: string;
  rawSize: THREE.Vector3;
}

/** Verifies content (not just extension) and parses STL binary/ASCII. */
export function parseStl(buf: ArrayBuffer): ParsedStl {
  if (buf.byteLength > CAPABILITIES.maxUploadMiB * 1048576) throw new Error(`Tệp vượt ${CAPABILITIES.maxUploadMiB} MiB`);
  if (buf.byteLength < 84) throw new Error('Tệp quá nhỏ, không phải STL hợp lệ');
  const view = new DataView(buf);
  const n = view.getUint32(80, true);
  const isBinary = 84 + n * 50 === buf.byteLength;
  if (!isBinary) {
    const head = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(1024, buf.byteLength))).trimStart().toLowerCase();
    if (!head.startsWith('solid') || !/facet|endsolid/.test(new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(4096, buf.byteLength))).toLowerCase())) {
      throw new Error('Nội dung không phải STL (binary hoặc ASCII)');
    }
  }
  const g = new STLLoader().parse(buf);
  const pos = g.getAttribute('position');
  if (!pos || pos.count < 3) throw new Error('STL không có tam giác nào');
  const arr = new Float32Array(pos.array as ArrayLike<number>);
  for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) throw new Error('STL chứa toạ độ không hữu hạn (triangle hỏng)');
  const triangles = arr.length / 9;
  if (triangles > CAPABILITIES.maxSceneTriangles) throw new Error(`Vượt ngân sách ${CAPABILITIES.maxSceneTriangles.toLocaleString()} tam giác`);
  g.computeBoundingBox();
  const rawSize = new THREE.Vector3();
  g.boundingBox!.getSize(rawSize);
  return { positions: arr, triangles, sourceHash: hashFloats([arr]), rawSize };
}

/** Convert to mm and re-centre so the part sits on the grid (Y-up). STL is usually Z-up → rotate. */
export function normalizeImported(p: ParsedStl, unit: ImportUnit, zUp: boolean): Float32Array {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p.positions.slice(), 3));
  g.scale(UNIT_TO_MM[unit], UNIT_TO_MM[unit], UNIT_TO_MM[unit]);
  if (zUp) g.rotateX(-Math.PI / 2);
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
  return g.getAttribute('position').array as Float32Array;
}

/** Bake world transforms and write binary STL (mm). Shells are NOT unioned. Y-up → Z-up for slicers. */
export function exportStl(nodes: SceneNode[], ids: string[]): { blob: Blob; triangles: number; size: THREE.Vector3 } {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const geos: THREE.BufferGeometry[] = [];
  for (const id of ids) {
    const n = byId.get(id);
    if (!n || n.kind === 'group') continue;
    const g = bakedGeometry(n, byId);
    if (g) { g.rotateX(Math.PI / 2); geos.push(g); }
  }
  const triangles = geos.reduce((a, g) => a + g.getAttribute('position').count / 3, 0);
  if (!triangles) throw new Error('Không có mesh để xuất');
  const buf = new ArrayBuffer(84 + triangles * 50);
  const dv = new DataView(buf);
  const header = 'Binary STL · 3DWorld Studio · unit=mm';
  for (let i = 0; i < header.length; i++) dv.setUint8(i, header.charCodeAt(i));
  dv.setUint32(80, triangles, true);
  let off = 84;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nrm = new THREE.Vector3();
  const box = new THREE.Box3();
  for (const g of geos) {
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
      if (![a, b, c].every((v) => Number.isFinite(v.x + v.y + v.z))) throw new Error('Mesh có toạ độ không hữu hạn');
      nrm.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
      for (const v of [nrm, a, b, c]) { dv.setFloat32(off, v.x, true); dv.setFloat32(off + 4, v.y, true); dv.setFloat32(off + 8, v.z, true); off += 12; }
      dv.setUint16(off, 0, true); off += 2;
      box.expandByPoint(a); box.expandByPoint(b); box.expandByPoint(c);
    }
  }
  const size = new THREE.Vector3();
  box.getSize(size);
  return { blob: new Blob([buf], { type: 'model/stl' }), triangles, size };
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
