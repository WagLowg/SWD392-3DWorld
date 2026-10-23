import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, ArrowRight } from 'lucide-react';
import { api, ApiError, type User } from '../lib/api';
import { useAuth } from '../lib/app-state';
import { TextField, Segmented } from '../components/ui';

export default function Login() {
  const { user, setUser } = useAuth();
  const loc = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={(loc.state as { from?: string })?.from || '/studio'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api<{ user: User }>(`/api/auth/${mode}`, { body: form });
      setUser(r.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setBusy(false);
    }
  };
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="auth">
      <section className="auth-hero">
        <div className="brand"><Box size={28} color="var(--primary)" strokeWidth={1.8} /><span>3DWorld<small>AI STUDIO</small></span></div>
        <div>
          <h1>Từ một bức ảnh đến <em>mô hình 3D</em> sẵn sàng in.</h1>
          <p>Tải ảnh vật thể, chọn cấu hình AI, theo dõi tiến trình và xem kết quả trong trình xem 3D. Xuất GLB/STL hoặc gửi thẳng sang dịch vụ In 3D theo yêu cầu.</p>
        </div>
        <div className="auth-steps">
          <span>01 · Tải ảnh</span><span>02 · Cấu hình AI</span><span>03 · Generate</span><span>04 · Xem & xuất</span>
        </div>
      </section>
      <section className="auth-form">
        <form onSubmit={submit} noValidate>
          <div>
            <h2>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>Khách cần đăng nhập để tạo mô hình và lưu dự án.</p>
          </div>
          <Segmented value={mode} onChange={(m) => { setMode(m); setError(''); }} label="Chế độ" options={[{ value: 'login', label: 'Đăng nhập' }, { value: 'register', label: 'Đăng ký' }]} />
          {mode === 'register' && <TextField label="Tên hiển thị" value={form.name} onChange={set('name')} autoComplete="name" required />}
          <TextField label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
          <TextField label="Mật khẩu" type="password" value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} hint={mode === 'register' ? 'Tối thiểu 8 ký tự.' : undefined} required />
          {error && <div className="banner danger" role="alert">{error}</div>}
          <button className="btn primary block" disabled={busy}>
            {busy ? <span className="spinner" /> : <>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}<ArrowRight size={16} /></>}
          </button>
        </form>
      </section>
    </div>
  );
}
