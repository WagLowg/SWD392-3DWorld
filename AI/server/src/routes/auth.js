import { Router } from 'express';
import { one, run, id, now, tx, audit } from '../lib/db.js';
import { hashPassword, verifyPassword, setSession, clearSession } from '../lib/auth.js';
import { ah, bad, HttpError } from '../lib/http.js';
import { addEntry } from '../services/wallet.js';
import { config } from '../config.js';

const r = Router();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

r.post('/register', ah(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim().slice(0, 80);
  const password = String(req.body?.password || '');
  if (!EMAIL.test(email)) throw bad('INVALID_EMAIL', 'Email không hợp lệ.');
  if (name.length < 2) throw bad('INVALID_NAME', 'Tên hiển thị tối thiểu 2 ký tự.');
  if (password.length < 8) throw bad('WEAK_PASSWORD', 'Mật khẩu tối thiểu 8 ký tự.');
  if (one('SELECT 1 FROM users WHERE email = ?', email)) throw new HttpError(409, 'EMAIL_TAKEN', 'Email đã được đăng ký.');
  const uid = id('usr');
  tx(() => {
    run('INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?,?,?,?,?,?)',
      uid, email, name, hashPassword(password), 'customer', now());
    if (config.signupBonus > 0) addEntry(uid, config.signupBonus, 'GRANT', null, 'Credit chào mừng');
  });
  audit(uid, 'user.register', uid);
  setSession(res, uid);
  res.status(201).json({ user: { id: uid, email, name, role: 'customer' } });
}));

r.post('/login', ah(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const u = one('SELECT * FROM users WHERE email = ?', email);
  if (!u || !verifyPassword(String(req.body?.password || ''), u.password_hash)) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
  }
  setSession(res, u.id);
  audit(u.id, 'user.login', u.id);
  res.json({ user: { id: u.id, email: u.email, name: u.name, role: u.role } });
}));

r.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

r.get('/me', (req, res) => {
  res.json({ user: req.user || null });
});

export default r;
