import {
  Bell,
  Box,
  ChevronDown,
  CircleUserRound,
  Menu,
  Printer,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { useState, type PropsWithChildren } from 'react'
import { Link, NavLink } from 'react-router-dom'

const links = [
  ['/', 'In Theo Yêu Cầu'],
  ['/how-it-works', 'Quy Trình'],
  ['/materials', 'Vật Liệu'],
  ['/orders', 'Đơn In Của Tôi'],
] as const

export function PodShell({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false)

  return (
    <div className="pod-app">
      <div className="pod-notice">
        <Sparkles size={14} /> Xưởng in SLA/FDM/SLS đang hoạt động · Phản hồi kỹ thuật trong 2 giờ
      </div>
      <header className="pod-header">
        <Link className="pod-brand" to="/" aria-label="3DWorld POD">
          <span className="pod-brand-mark"><Box size={22} /></span>
          <span>3D World</span>
          <small>Studio POD</small>
        </Link>
        <nav className={open ? 'pod-nav is-open' : 'pod-nav'} aria-label="Điều hướng POD">
          <button type="button" className="pod-nav-close" onClick={() => setOpen(false)} aria-label="Đóng menu"><X /></button>
          <a href="/ai/">AI Studio</a>
          <a href="/studio/">3D Studio</a>
          <a href="/marketplace/">Chợ Mô Hình</a>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>{label}</NavLink>
          ))}
        </nav>
        <div className="pod-header-actions">
          <button type="button" className="pod-icon-btn" aria-label="Tìm kiếm"><Search size={19} /></button>
          <Link className="pod-icon-btn" to="/notifications" aria-label="Thông báo"><Bell size={19} /></Link>
          <a className="pod-user" href="/login/">
            <CircleUserRound size={20} /> <span>Tài khoản</span> <ChevronDown size={14} />
          </a>
          <Link className="pod-primary pod-header-cta" to="/"><Printer size={17} /> Gửi File In 3D</Link>
          <button type="button" className="pod-menu" onClick={() => setOpen(true)} aria-label="Mở menu"><Menu /></button>
        </div>
      </header>
      <main>{children}</main>
      <footer className="pod-footer">
        <div>
          <div className="pod-brand pod-brand-footer"><span className="pod-brand-mark"><Box size={20} /></span><span>3D World POD</span></div>
          <p>Xưởng chế tác mô hình 3D theo yêu cầu, báo giá có snapshot và kiểm định Micro-QC.</p>
        </div>
        <div><strong>Dịch vụ</strong><Link to="/">Đặt in 3D</Link><Link to="/materials">Vật liệu</Link><Link to="/how-it-works">Quy trình</Link></div>
        <div><strong>Tài khoản</strong><Link to="/requests">Yêu cầu in</Link><Link to="/payments">Thanh toán</Link><Link to="/claims">Khiếu nại</Link></div>
        <div><strong>Hỗ trợ</strong><Link to="/help">Chính sách POD</Link><Link to="/reports/new">Báo cáo vi phạm</Link><span>© 2026 3DWorld</span></div>
      </footer>
    </div>
  )
}
