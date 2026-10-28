import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Bell, Box, Sparkles, LayoutGrid, Download, Printer, Wallet, LogOut } from 'lucide-react';
import { useAuth, useOnline } from '../lib/app-state';
import { initials } from '../lib/format';
import { ModuleSwitcher } from '../../../shared/ModuleSwitcher';

/** Breadcrumb do từng trang đặt qua context đơn giản */
let setCrumbGlobal: ((c: ReactNode) => void) | null = null;
export function useCrumb(c: ReactNode, deps: unknown[] = []) {
  useEffect(() => {
    setCrumbGlobal?.(c);
    return () => setCrumbGlobal?.(null);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

const NAV = [
  { to: '/studio', icon: Sparkles, tip: 'AI Studio' },
  { to: '/models', icon: LayoutGrid, tip: 'Mô hình của tôi' },
  { to: '/export', icon: Download, tip: 'Xuất mô hình', desk: true },
  { to: '/print', icon: Printer, tip: 'In 3D theo yêu cầu' },
  { to: '/credits', icon: Wallet, tip: 'Tín dụng' },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const [crumb, setCrumb] = useState<ReactNode>(null);
  const online = useOnline();
  setCrumbGlobal = setCrumb;

  return (
    <div className="shell">
      {!online && <div className="offline" role="alert">Mất kết nối mạng — các thao tác sẽ được thử lại khi có mạng. Dữ liệu dự án không bị mất.</div>}
      <header className="header">
        <NavLink to="/studio" className="brand" aria-label="3DWorld AI Studio">
          <span className="brand-logo"><Box size={20} /></span>
          <span className="brand-copy">3DWorld<small>AI STUDIO</small></span>
        </NavLink>
        <div className="header-modules"><ModuleSwitcher current="ai" theme="dark" /></div>
        <div className="header-account">
          <button type="button" className="header-icon" aria-label="Thông báo" title="Thông báo"><Bell size={18} /></button>
          <a className="header-user" href="/portal/profile" title={user?.email ?? 'Tài khoản'}>
            <span className="avatar" aria-hidden>{initials(user?.name || '') || 'K'}</span>
            <span className="header-user-copy"><b>{user?.name ?? 'Khách'}</b><small>{user?.email ?? 'Chưa đăng nhập'}</small></span>
          </a>
          <button type="button" className="header-icon" onClick={() => logout()} aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={17} /></button>
        </div>
        <div className="sr-only" aria-live="polite">{crumb}</div>
      </header>
      <nav className="rail" aria-label="Điều hướng chính">
        {NAV.map(({ to, icon: I, tip, desk }) => (
          <NavLink key={to} to={to} data-tip={tip} aria-label={tip} className={({ isActive }) => `${isActive ? 'active' : ''}${desk ? ' desk' : ''}`}>
            <I size={20} strokeWidth={1.8} />
          </NavLink>
        ))}
        <div className="spacer" />
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
