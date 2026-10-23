import { StrictMode, useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { Box, ArrowRight } from 'lucide-react';
import '../ai/styles/global.css';
import { api, ApiError, type User } from '../ai/lib/api';
import { TextField, Segmented } from '../ai/components/ui';
import { fetchMe } from '../shared/auth';
import { safeNext, MODULES } from '../shared/modules';

/** Trang đăng nhập / đăng ký dùng chung cho mọi module (cookie phiên do Spring Boot cấp). */
function LoginPage() {
  const next = safeNext(new URLSearchParams(location.search).get('next'));
  const [mode, setMode] = useState<'login' | 'register'>(() => (new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login'));
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  // Đã đăng nhập rồi thì quay lại luôn
  useEffect(() => {
    fetchMe().then((u) => (u ? location.replace(next) : setChecking(false)));
  }, [next]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api<{ user: User }>(`/api/auth/${mode}`, { body: form });
      location.replace(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra.');
      setBusy(false);
    }
  };
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  if (checking) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="auth">
      <section className="auth-hero">
        <a href="/" className="brand"><Box size={28} color="var(--primary)" strokeWidth={1.8} /><span>3DWorld<small>FROM IMAGINATION TO REALITY</small></span></a>
        <div>
          <h1>Một tài khoản cho <em>cả thế giới 3D</em> của bạn.</h1>
          <p>Tạo mô hình bằng AI từ ảnh, tự dựng mô hình trong 3D Studio, mua sản phẩm in sẵn và đặt in theo yêu cầu — tất cả dùng chung một tài khoản.</p>
        </div>
        <div className="auth-steps">
          {MODULES.map((m, i) => <span key={m.id}>{String(i + 1).padStart(2, '0')} · {m.label}</span>)}
        </div>
      </section>
      <section className="auth-form">
        <form onSubmit={submit} noValidate>
          <div>
            <h2>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>Đăng nhập để tạo mô hình, lưu dự án và đặt in.</p>
          </div>
          <Segmented value={mode} onChange={(m) => { setMode(m); setError(''); }} label="Chế độ" options={[{ value: 'login', label: 'Đăng nhập' }, { value: 'register', label: 'Đăng ký' }]} />
          {mode === 'register' && <TextField label="Tên hiển thị" value={form.name} onChange={set('name')} autoComplete="name" required />}
          <TextField label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
          <TextField label="Mật khẩu" type="password" value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} hint={mode === 'register' ? 'Tối thiểu 8 ký tự.' : undefined} required />
          {error && <div className="banner danger" role="alert">{error}</div>}
          <button className="btn primary block" disabled={busy}>
            {busy ? <span className="spinner" /> : <>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}<ArrowRight size={16} /></>}
          </button>
          <a href="/" className="muted small" style={{ textAlign: 'center' }}>← Về trang chủ 3DWorld</a>
        </form>
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><LoginPage /></StrictMode>);
