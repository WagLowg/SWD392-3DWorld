// Smoke test end-to-end cho API (chế độ mock)
import zlib from 'node:zlib';
const B = process.argv[2] || 'http://localhost:8799';
let cookie = '';
async function api(path, opts = {}) {
  const res = await fetch(B + path, { ...opts, headers: { ...(opts.headers || {}), cookie } });
  const sc = res.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  const ct = res.headers.get('content-type') || '';
  return { status: res.status, body: ct.includes('json') ? await res.json() : await res.arrayBuffer() };
}
const json = (b) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

function png(w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = x; raw[o + 1] = y; raw[o + 2] = 128; }
  const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const ch = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]);
}
const ok = (cond, msg) => { console.log(cond ? 'PASS' : 'FAIL', msg); if (!cond) process.exitCode = 1; };

const email = `u${Date.now()}@example.com`;
let r = await api('/api/auth/register', json({ email, name: 'Tester', password: 'password123' }));
ok(r.status === 201, 'register');

const fd = new FormData();
fd.append('file', new Blob([png(512, 512)], { type: 'image/png' }), 'robot.png');
r = await api('/api/ai-studio/uploads', { method: 'POST', body: fd });
ok(r.status === 201, 'upload png'); const iid = r.body.image.id;

const bad = new FormData();
bad.append('file', new Blob([Buffer.from('not an image')], { type: 'image/png' }), 'x.png');
r = await api('/api/ai-studio/uploads', { method: 'POST', body: bad });
ok(r.status === 400 && r.body.error.code === 'INVALID_TYPE', 'reject fake png');

const small = new FormData();
small.append('file', new Blob([png(64, 64)], { type: 'image/png' }), 's.png');
r = await api('/api/ai-studio/uploads', { method: 'POST', body: small });
ok(r.body.error?.code === 'IMAGE_TOO_SMALL', 'reject small image');

const cfg = { aiModel: 'latest', shouldTexture: true, enablePbr: true };
r = await api('/api/ai-studio/estimates', json({ mode: 'single', variants: 2, config: cfg }));
ok(r.body.total === 60, `estimate 60 (got ${r.body.total})`);

const body = { mode: 'single', imageIds: [iid], variants: 2, config: cfg, quotedCredits: 60, priceVersion: r.body.priceVersion, consent: true, title: 'Robot thử' };
r = await api('/api/ai-studio/tasks', { ...json({ ...body, consent: false }), headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'k-consent-1' } });
ok(r.body.error?.code === 'CONSENT_REQUIRED', 'consent required');
r = await api('/api/ai-studio/tasks', { ...json({ ...body, quotedCredits: 10 }), headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'k-price-1' } });
ok(r.status === 409, 'price mismatch 409');

const h = { 'Content-Type': 'application/json', 'Idempotency-Key': 'k-gen-000001' };
r = await api('/api/ai-studio/tasks', { ...json(body), headers: h });
ok(r.status === 201 && r.body.tasks.length === 2, 'create 2 tasks');
const pid = r.body.projectId;
r = await api('/api/ai-studio/tasks', { ...json(body), headers: h });
ok(r.body.replay === true && r.body.tasks.length === 2, 'idempotent replay');
r = await api('/api/ai-studio/wallet');
ok(r.body.balance === 140 && r.body.held === 60, `wallet hold (bal ${r.body.balance}, held ${r.body.held})`);

for (let i = 0; i < 40; i++) {
  await new Promise((s) => setTimeout(s, 1000));
  r = await api(`/api/ai-studio/projects/${pid}`);
  const st = r.body.tasks.map((t) => `${t.status}:${t.progress}`).join(',');
  if (i % 4 === 0) console.log('  ', st);
  if (r.body.tasks.every((t) => t.status === 'AVAILABLE' || t.status === 'FAILED')) break;
}
ok(r.body.versions.length === 2, `2 versions (${r.body.versions.length})`);
const v = r.body.versions[0];
console.log('  version', v.label, JSON.stringify(v.metadata.stats), v.assets.map((a) => a.format).join(','));
const glb = await api(v.glbUrl);
ok(glb.status === 200 && Buffer.from(glb.body).readUInt32LE(0) === 0x46546c67, 'download glb');
r = await api('/api/ai-studio/wallet');
ok(r.body.balance === 140 && r.body.held === 0 && r.body.spent === 60, `wallet settled (bal ${r.body.balance}, held ${r.body.held}, spent ${r.body.spent})`);

r = await api(`/api/ai-studio/versions/${v.id}/exports`, json({ format: 'stl' }));
ok(r.status === 200 && r.body.downloadUrl, 'export stl');
r = await api(`/api/ai-studio/versions/${v.id}/exports`, json({ format: 'fbx' }));
ok(r.status === 409, 'export fbx unavailable');

const podH = { 'Content-Type': 'application/json', 'Idempotency-Key': 'k-pod-000001' };
const pod = { technology: 'FDM', material: 'PLA', quality: '0.20 mm · Tiêu chuẩn', quantity: 1, confirm: true };
r = await api(`/api/ai-studio/versions/${v.id}/pod-handoffs`, { ...json(pod), headers: podH });
ok(r.body.error?.code === 'DIMENSIONS_REQUIRED', 'pod needs dims');
r = await api(`/api/ai-studio/versions/${v.id}/dimensions`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lengthMm: 80, widthMm: 80, heightMm: 120 }) });
ok(r.status === 200, 'set dims');
r = await api(`/api/ai-studio/versions/${v.id}/pod-handoffs`, { ...json(pod), headers: podH });
ok(r.status === 201, `pod handoff ${r.body.handoff?.printRequestId}`);
const pr = r.body.handoff.printRequestId;
r = await api(`/api/ai-studio/versions/${v.id}/pod-handoffs`, { ...json(pod), headers: podH });
ok(r.body.replay && r.body.handoff.printRequestId === pr, 'pod idempotent');

// IDOR: user khác không đọc được
cookie = '';
await api('/api/auth/register', json({ email: `o${Date.now()}@example.com`, name: 'Other', password: 'password123' }));
r = await api(`/api/ai-studio/projects/${pid}`);
ok(r.status === 404, 'other user 404 project');
r = await api(v.glbUrl);
ok(r.status === 404, 'other user 404 asset');
