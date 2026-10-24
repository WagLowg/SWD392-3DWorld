import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type BoolOp = 'union' | 'subtract' | 'intersect';

/** Runs CSG on two world-space closed meshes. Returns non-indexed world-space positions. */
export function runBoolean(a: THREE.BufferGeometry, b: THREE.BufferGeometry, op: BoolOp): Float32Array {
  const prep = (g: THREE.BufferGeometry) => {
    const out = (g.index ? g.toNonIndexed() : g.clone());
    out.deleteAttribute('uv');
    out.computeVertexNormals();
    return out;
  };
  const ba = new Brush(prep(a));
  const bb = new Brush(prep(b));
  ba.updateMatrixWorld();
  bb.updateMatrixWorld();
  const ev = new Evaluator();
  ev.attributes = ['position', 'normal'];
  ev.useGroups = false;
  const mode = op === 'union' ? ADDITION : op === 'subtract' ? SUBTRACTION : INTERSECTION;
  const res = ev.evaluate(ba, bb, mode);
  return dropSlivers(res.geometry);
}

/** Weld near-identical vertices and drop the zero-area sliver triangles CSG tends to leave behind. */
function dropSlivers(src: THREE.BufferGeometry): Float32Array {
  const only = new THREE.BufferGeometry();
  only.setAttribute('position', (src.index ? src.toNonIndexed() : src).getAttribute('position'));
  const w = mergeVertices(only, 1e-4);
  const idx = w.index!, p = w.getAttribute('position') as THREE.BufferAttribute;
  const out: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), tri = new THREE.Triangle();
  for (let i = 0; i < idx.count; i += 3) {
    const ia = idx.getX(i), ib = idx.getX(i + 1), ic = idx.getX(i + 2);
    if (ia === ib || ib === ic || ia === ic) continue;
    a.fromBufferAttribute(p, ia); b.fromBufferAttribute(p, ib); c.fromBufferAttribute(p, ic);
    if (tri.set(a, b, c).getArea() < 1e-10) continue;
    out.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }
  return new Float32Array(out);
}
