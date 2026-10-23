import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
// .env đặt ở thư mục gốc dự án
dotenv.config({ path: path.resolve(here, '../../.env') });

const key = (process.env.MESHY_API_KEY || '').trim();

export const config = {
  port: Number(process.env.API_PORT || 8787),
  dataDir: path.resolve(here, '../data'),
  meshyApiKey: key,
  meshyBaseUrl: process.env.MESHY_BASE_URL || 'https://api.meshy.ai',
  providerMode: key && key !== 'mock' ? 'meshy' : 'mock',
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
  webhookSecret: process.env.MESHY_WEBHOOK_SECRET || '',
  signupBonus: Number(process.env.SIGNUP_BONUS_CREDITS || 200),
  isProd: process.env.NODE_ENV === 'production',
  upload: {
    maxBytes: 20 * 1024 * 1024, // giới hạn Meshy: 20 MB/ảnh
    minSide: 256,
    maxSide: 8192,
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  maxAssetBytes: 300 * 1024 * 1024,
};
