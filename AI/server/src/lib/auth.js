import crypto from 'node:crypto';
import { config } from '../config.js';
import { one } from './db.js';
import { HttpError } from './http.js';

const COOKIE = 'sid';
const TTL_MS = 7 * 24 * 3600 * 1000;

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(pw, stored) {
  const [, s, h] = stored.split('$');
  const hash = crypto.scryptSync(pw, Buffer.from(s, 'base64'), 64);
  return crypto.timingSafeEqual(hash, Buffer.from(h, 'base64'));
}

const sign = (data) => crypto.createHmac('sha256', config.sessionSecret).update(data).digest('base64url');

export function setSession(res, userId) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + TTL_MS })).toString('base64url');
  res.cookie(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: TTL_MS, path: '/',
  });
}

export const clearSession = (res) => res.clearCookie(COOKIE, { path: '/' });

function readSession(req) {
  const raw = req.cookies?.[COOKIE];
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return exp > Date.now() ? uid : null;
  } catch {
    return null;
  }
}

/** Gắn req.user nếu session hợp lệ. */
export function loadUser(req, _res, next) {
  const uid = readSession(req);
  if (uid) {
    const u = one('SELECT id, email, name, role FROM users WHERE id = ?', uid);
    if (u) req.user = u;
  }
  next();
}

export function requireAuth(req, _res, next) {
  if (!req.user) {
    return next(new HttpError(401, 'UNAUTHENTICATED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'));
  }
  next();
}
