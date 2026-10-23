import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { one } from './lib/db.js';
import { loadUser } from './lib/auth.js';
import { errorHandler, ah } from './lib/http.js';
import authRoutes from './routes/auth.js';
import studioRoutes from './routes/studio.js';
import { syncTask, startPoller } from './services/tasks.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(loadUser);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, provider: config.providerMode });
});

app.use('/api/auth', authRoutes);
app.use('/api/ai-studio', studioRoutes);

/**
 * Webhook Meshy. Payload chỉ được dùng như tín hiệu: server luôn đọc lại trạng thái từ API Meshy
 * (không tin dữ liệu trong body), nên webhook giả/lặp/sai thứ tự không ghi đè được trạng thái (BR-09).
 */
app.post('/api/webhooks/meshy', ah(async (req, res) => {
  if (config.webhookSecret) {
    const got = Buffer.from(String(req.query.secret || ''));
    const want = Buffer.from(config.webhookSecret);
    if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return res.status(401).json({ ok: false });
  }
  const providerTaskId = String(req.body?.id || '');
  const task = providerTaskId ? one('SELECT id FROM tasks WHERE provider_task_id = ?', providerTaskId) : null;
  if (task) syncTask(task.id).catch((e) => console.error('[webhook]', e));
  res.json({ ok: true });
}));

app.use('/api', (req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API không tồn tại.' } }));

// Phục vụ bản build frontend (production)
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`3DWorld AI Studio API → http://localhost:${config.port}`);
  console.log(config.providerMode === 'meshy'
    ? 'Provider: Meshy API (thật – sẽ tiêu credit Meshy)'
    : 'Provider: MOCK (chưa có MESHY_API_KEY – không gọi Meshy)');
  startPoller();
});
