import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';

const root = path.join(config.dataDir, 'storage');
fs.mkdirSync(root, { recursive: true });

/** Đường dẫn tuyệt đối của storageKey; chặn path traversal. */
export function resolveKey(key) {
  const p = path.resolve(root, key);
  if (!p.startsWith(root + path.sep)) throw new Error('Invalid storage key');
  return p;
}

export async function putBuffer(key, buf) {
  const p = resolveKey(key);
  await fsp.mkdir(path.dirname(p), { recursive: true });
  await fsp.writeFile(p, buf);
  return { key, size: buf.length, checksum: sha256(buf) };
}

export const readBuffer = (key) => fsp.readFile(resolveKey(key));
export const exists = (key) => fs.existsSync(resolveKey(key));
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
