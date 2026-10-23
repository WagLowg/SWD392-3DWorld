import { StrictMode, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Orbit, ShieldCheck, UserRound } from 'lucide-react'
import './auth.css'
import { ApiClientError } from '../../shared/api'
import { safeNext } from '../../shared/modules'
import { authService } from './services/auth.service'
import { fetchMe } from './services/session'

type Mode = 'login' | 'register'

function destination(mode: Mode, next: string) {
  return mode === 'login' ? `/register/?next=${encodeURIComponent(next)}` : `/login/?next=${encodeURIComponent(next)}`
}

function AuthPage({ mode }: { mode: Mode }) {
  const next = safeNext(new URLSearchParams(location.search).get('next'))
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    fetchMe().then((user) => (user ? location.replace(next) : setChecking(false)))
  }, [next])

  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (mode === 'register' && !accepted) {
      setError('Vui lòng chấp thuận Điều khoản dịch vụ và Chính sách bảo mật.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await authService.login({ email: form.email, password: form.password })
      } else {
        await authService.register({ name: form.name, email: form.email, password: form.password })
      }
      location.replace(next)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.')
      setBusy(false)
    }
  }

  if (checking) {
    return <div className="auth-sample-loading"><span className="spinner" /></div>
  }

  const isLogin = mode === 'login'

  return (
    <main className="auth-sample">
      <header className="auth-sample-header">
        <a className="auth-sample-logo" href="/">
          <span className="auth-sample-logo-mark"><Orbit size={21} /></span>
          <span><b>3D</b><strong>World</strong></span>
        </a>
        <div className="auth-sample-env"><span>●</span> MÔI TRƯỜNG GIẢ LẬP SWD</div>
      </header>
      <div className="auth-sample-layout">
        <section className="auth-sample-copy">
          <span className="auth-sample-kicker">FROM IMAGINATION TO REALITY</span>
          <h1>{isLogin ? <>Chào mừng trở lại<br /><em>thế giới 3D.</em></> : <>Một tài khoản cho<br /><em>cả thế giới 3D.</em></>}</h1>
          <p>{isLogin
            ? 'Đăng nhập để tiếp tục tạo mô hình, lưu dự án và khám phá những sản phẩm độc đáo.'
            : 'Tạo mô hình bằng AI, tự dựng mô hình 3D và khám phá sản phẩm in — tất cả trong một tài khoản.'}</p>
          <div className="auth-sample-pills"><span>01 · AI Studio</span><span>02 · 3D Studio</span><span>03 · Marketplace</span></div>
        </section>
        <section className="auth-sample-card">
          <div className="auth-sample-card-heading">
            <span className="auth-sample-icon">{isLogin ? <LockKeyhole size={20} /> : <UserRound size={20} />}</span>
            <div><h2>{isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}</h2><p>{isLogin ? 'Truy cập không gian sáng tạo của bạn.' : 'Bắt đầu hành trình sáng tạo cùng 3DWorld.'}</p></div>
          </div>
          <form onSubmit={submit} noValidate>
            {!isLogin && <label>Họ và tên<div className="auth-sample-field"><UserRound size={18} /><input value={form.name} onChange={update('name')} placeholder="Ví dụ: Nguyễn Văn An" autoComplete="name" required /></div></label>}
            <label>Địa chỉ Email<div className="auth-sample-field"><Mail size={18} /><input type="email" value={form.email} onChange={update('email')} placeholder="tenban@example.com" autoComplete="email" required /></div></label>
            <label>Mật khẩu<div className="auth-sample-field"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} placeholder="Tối thiểu 8 ký tự" autoComplete={isLogin ? 'current-password' : 'new-password'} minLength={8} required /><button type="button" aria-label="Hiện hoặc ẩn mật khẩu" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{!isLogin && <small>Tối thiểu 8 ký tự an toàn.</small>}</label>
            {!isLogin && <label>Số điện thoại <span className="optional">(không bắt buộc)</span><div className="auth-sample-field"><span className="auth-sample-phone">☎</span><input type="tel" value={form.phone} onChange={update('phone')} placeholder="0912 345 678" autoComplete="tel" /></div></label>}
            {isLogin ? <div className="auth-sample-options"><label className="auth-sample-check"><input type="checkbox" /> Ghi nhớ phiên đăng nhập</label><a href="/khoiPhucMatKhau.html">Quên mật khẩu?</a></div> : <label className="auth-sample-check"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.</label>}
            {error && <div className="auth-sample-error" role="alert">{error}</div>}
            <button type="submit" className="auth-sample-submit" disabled={busy}>{busy ? <span className="spinner" /> : <><span>{isLogin ? 'Đăng Nhập Vào Hệ Thống' : 'Tạo Tài Khoản Ngay'}</span><ArrowRight size={20} /></>}</button>
          </form>
          <div className="auth-sample-switch">{isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'} <a href={destination(mode, next)}>{isLogin ? 'Đăng ký ngay' : 'Đăng nhập ngay'}</a></div>
          <div className="auth-sample-security"><ShieldCheck size={16} /> Bảo mật thông tin bằng phiên đăng nhập cookie HttpOnly.</div>
        </section>
      </div>
    </main>
  )
}

const mode: Mode = location.pathname.startsWith('/register') ? 'register' : 'login'
const rootElement = document.getElementById('root')

if (!rootElement) throw new Error('Missing #root element for Auth.')

createRoot(rootElement).render(<StrictMode><AuthPage mode={mode} /></StrictMode>)
