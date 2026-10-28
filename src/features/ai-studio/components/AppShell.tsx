import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Box, Sparkles, LayoutGrid, Download, Printer, Wallet, HelpCircle, LogOut } from 'lucide-react';
import { useAuth, useOnline } from '../lib/app-state';
import { initials, num } from '../lib/format';
import { ModuleSwitcher } from '../../../shared/ui/ModuleSwitcher';

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
  const { user, wallet, logout, provider } = useAuth();
  const [crumb, setCrumb] = useState<ReactNode>(null);
  const [menu, setMenu] = useState(false);
  const online = useOnline();
  const nav = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  setCrumbGlobal = setCrumb;

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="shell">
      {!online && <div className="offline" role="alert">Mất kết nối mạng — các thao tác sẽ được thử lại khi có mạng. Dữ liệu dự án không bị mất.</div>}
      <header className="header">
        <NavLink to="/studio" className="brand" aria-label="3DWorld AI Studio">
          <Box size={26} color="var(--primary)" strokeWidth={1.8} />
          <span>3DWorld<small>AI STUDIO</small></span>
        </NavLink>
        <div className="hide-sm" style={{ marginLeft: 8 }}><ModuleSwitcher current="ai" compact /></div>
        <div className="crumbs">{crumb}</div>
        <div className="header-right">
          {provider === 'mock' && (
            <span className="badge warning hide-sm" title="Chưa cấu hình MESHY_API_KEY: kết quả là mô hình mô phỏng, không gọi Meshy.">
              <i className="dot" />Chế độ mô phỏng
            </span>
          )}
          <NavLink to="/credits" className="credit-pill" title="Số dư tín dụng AI">
            <i className="dot" />{num(wallet?.balance)} tín dụng
          </NavLink>
          <a className="icon-btn hide-sm" href="https://docs.meshy.ai/en/api/image-to-3d" target="_blank" rel="noreferrer" aria-label="Trợ giúp"><HelpCircle size={18} /></a>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button className="avatar" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Tài khoản">
              {initials(user?.name || '')}
            </button>
            {menu && (
              <div className="menu" role="menu" style={{ right: 0, top: 42 }}>
                <div style={{ padding: '8px 10px 10px' }}>
                  <b style={{ display: 'block' }}>{user?.name}</b>
                  <span className="muted small">{user?.email}</span>
                </div>
                <button role="menuitem" onClick={() => { setMenu(false); nav('/credits'); }}><Wallet size={16} />Tín dụng & lịch sử</button>
                <button role="menuitem" className="danger" onClick={() => logout()}><LogOut size={16} />Đăng xuất</button>
              </div>
            )}
          </div>
        </div>
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
