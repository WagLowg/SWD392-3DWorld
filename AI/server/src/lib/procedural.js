/**
 * Sinh model 3D thủ tục (GLB + STL) cho chế độ MOCK, để demo end-to-end mà không gọi Meshy.
 * Hình dạng: bình tiện (lathe) có profile biến đổi theo seed.
 */

function rng(seedStr) {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function buildGeometry(seed) {
  const r = rng(seed);
  const rows = 48;
  const segs = 72;
  const height = 1.2;
  const a = 0.15 + r() * 0.2;
  const b = 1.5 + r() * 2.5;
  const neck = 0.08 + r() * 0.08;
  const profile = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const y = t * height;
    let rad = 0.18 + a * Math.sin(Math.PI * Math.pow(t, 0.8)) + 0.05 * Math.sin(t * b * Math.PI);
    if (t > 0.82) rad = neck + (rad - neck) * (1 - (t - 0.82) / 0.18) + 0.03 * (t - 0.82) / 0.18;
    profile.push([Math.max(0.03, rad), y]);
  }
  const pos = [];
  const nrm = [];
  for (let i = 0; i <= rows; i++) {
    const [rad, y] = profile[i];
    const [r0, y0] = profile[Math.max(0, i - 1)];
    const [r1, y1] = profile[Math.min(rows, i + 1)];
    const dr = r1 - r0;
    const dy = y1 - y0 || 1e-6;
    for (let j = 0; j <= segs; j++) {
      const th = (j / segs) * Math.PI * 2;
      const c = Math.cos(th);
      const s = Math.sin(th);
      pos.push(rad * c, y, rad * s);
      const nx = dy * c;
      const ny = -dr;
      const nz = dy * s;
      const l = Math.hypot(nx, ny, nz) || 1;
      nrm.push(nx / l, ny / l, nz / l);
    }
  }
  const idx = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < segs; j++) {
      const p = i * (segs + 1) + j;
      const q = p + segs + 1;
      idx.push(p, q, p + 1, p + 1, q, q + 1);
    }
  }
  // nắp đáy
  const center = pos.length / 3;
  pos.push(0, 0, 0);
  nrm.push(0, -1, 0);
  for (let j = 0; j < segs; j++) idx.push(center, j, j + 1);
  const color = [0.55 + r() * 0.4, 0.35 + r() * 0.4, 0.3 + r() * 0.5, 1];
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: new Uint32Array(idx), color };
}

const pad4 = (n) => (n + 3) & ~3;

export function makeGlb(seed) {
  const g = buildGeometry(seed);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < g.pos.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], g.pos[i + k]);
      max[k] = Math.max(max[k], g.pos[i + k]);
    }
  }
  const pb = Buffer.from(g.pos.buffer);
  const nb = Buffer.from(g.nrm.buffer);
  const ib = Buffer.from(g.idx.buffer);
  const bin = Buffer.concat([pb, nb, ib]);
  const json = {
    asset: { version: '2.0', generator: '3DWorld AI Studio mock' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'MockModel' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
    materials: [{ name: 'Clay', pbrMetallicRoughness: { baseColorFactor: g.color, metallicFactor: 0.05, roughnessFactor: 0.6 } }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: pb.length, target: 34962 },
      { buffer: 0, byteOffset: pb.length, byteLength: nb.length, target: 34962 },
      { buffer: 0, byteOffset: pb.length + nb.length, byteLength: ib.length, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: g.pos.length / 3, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5126, count: g.nrm.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5125, count: g.idx.length, type: 'SCALAR' },
    ],
  };
  let jsonBuf = Buffer.from(JSON.stringify(json));
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(pad4(jsonBuf.length) - jsonBuf.length, 0x20)]);
  const binBuf = Buffer.concat([bin, Buffer.alloc(pad4(bin.length) - bin.length)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binBuf.length, 8);
  const ch = (len, type) => {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(len, 0);
    b.writeUInt32LE(type, 4);
    return b;
  };
  return Buffer.concat([header, ch(jsonBuf.length, 0x4e4f534a), jsonBuf, ch(binBuf.length, 0x004e4942), binBuf]);
}

export function makeStl(seed) {
  const g = buildGeometry(seed);
  const tris = g.idx.length / 3;
  const buf = Buffer.alloc(84 + tris * 50);
  buf.write('3DWorld AI Studio mock', 0);
  buf.writeUInt32LE(tris, 80);
  let o = 84;
  for (let t = 0; t < tris; t++) {
    const v = [0, 1, 2].map((k) => {
      const i = g.idx[t * 3 + k] * 3;
      return [g.pos[i], g.pos[i + 1], g.pos[i + 2]];
    });
    const u = v[1].map((x, k) => x - v[0][k]);
    const w = v[2].map((x, k) => x - v[0][k]);
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const l = Math.hypot(...n) || 1;
    for (const x of n) { buf.writeFloatLE(x / l, o); o += 4; }
    // STL dùng mm; model mock cao 1.2 đơn vị → 120 mm
    for (const p of v) for (const x of p) { buf.writeFloatLE(x * 100, o); o += 4; }
    o += 2;
  }
  return buf;
}
