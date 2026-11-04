import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Box, Sparkles, LayoutGrid, Download, Printer, Wallet, LogOut, Type, Image as ImageIcon, Home, Cuboid, Store, Star } from 'lucide-react';
import { useAuth, useOnline } from '../lib/app-state';
import { initials } from '../lib/format';
import { aiStudio } from '../lib/backend';
import type { ProjectSummary } from '../lib/api';
import { ModuleSwitcher } from '../../../shared/ui/ModuleSwitcher';
import { CommandPalette, CommandTrigger, useCommandPalette, type Command } from '../../../shared/ui/CommandPalette';

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
  const nav = useNavigate();
  const location = useLocation();
  const palette = useCommandPalette();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  setCrumbGlobal = setCrumb;

  // Danh sách mô hình chỉ tải khi mở thanh lệnh (không làm chậm trang)
  useEffect(() => {
    if (!palette.open) return;
    aiStudio.projects({}).then((r) => setProjects(r.items)).catch(() => undefined);
  }, [palette.open]);

  const commands = useMemo<Command[]>(() => [
    { id: 'new-image', group: 'Tạo mới', label: 'Tạo mô hình từ ảnh', hint: 'Tải một ảnh vật thể → mô hình 3D', icon: <ImageIcon size={16} />, keywords: 'image upload anh moi new', run: () => nav('/studio', { state: { mode: 'single' } }) },
    { id: 'new-text', group: 'Tạo mới', label: 'Tạo mô hình từ mô tả', hint: 'Gõ vài câu mô tả → mô hình 3D', icon: <Type size={16} />, keywords: 'text prompt van ban', run: () => nav('/studio', { state: { mode: 'text' } }) },
    { id: 'go-models', group: 'Đi tới', label: 'Mô hình của tôi', icon: <LayoutGrid size={16} />, keywords: 'library thu vien', run: () => nav('/models') },
    { id: 'go-favorites', group: 'Đi tới', label: 'Mô hình yêu thích', icon: <Star size={16} />, keywords: 'favorite', run: () => nav('/models', { state: { tab: 'favorites' } }) },
    { id: 'go-export', group: 'Đi tới', label: 'Xuất mô hình', hint: 'GLB · STL · OBJ · FBX', icon: <Download size={16} />, keywords: 'export download tai', run: () => nav('/export') },
    { id: 'go-print', group: 'Đi tới', label: 'In 3D theo yêu cầu', icon: <Printer size={16} />, keywords: 'print pod', run: () => nav('/print') },
    { id: 'go-credits', group: 'Đi tới', label: 'Tín dụng & bảng giá', icon: <Wallet size={16} />, keywords: 'credit wallet vi gia', run: () => nav('/credits') },
    ...projects.slice(0, 12).map<Command>((p) => ({
      id: `p-${p.id}`, group: 'Mô hình gần đây', label: p.title, hint: `${p.versionCount} phiên bản · ${p.formats.join(', ').toUpperCase() || 'chưa có tệp'}`,
      icon: <Cuboid size={16} />, run: () => nav(`/studio/${p.id}`),
    })),
    { id: 'mod-home', group: 'Chuyển module', label: 'Trang chủ 3DWorld', icon: <Home size={16} />, keywords: 'landing home', run: () => { window.location.href = '/'; } },
    { id: 'mod-studio', group: 'Chuyển module', label: '3D Studio', hint: 'Tự dựng mô hình để in', icon: <Box size={16} />, keywords: 'editor', run: () => { window.location.href = '/studio/'; } },
    { id: 'mod-market', group: 'Chuyển module', label: 'Marketplace', icon: <Store size={16} />, keywords: 'cho shop', run: () => { window.location.href = '/marketplace/'; } },
    { id: 'logout', group: 'Tài khoản', label: 'Đăng xuất', icon: <LogOut size={16} />, keywords: 'logout sign out', run: () => logout() },
  ], [nav, projects, logout]);

  return (
    <div className="shell">
      {!online && <div className="offline" role="alert">Mất kết nối mạng — các thao tác sẽ được thử lại khi có mạng. Dữ liệu dự án không bị mất.</div>}
      <header className="header">
        <NavLink to="/studio" className="brand" aria-label="3DWorld AI Studio">
          <span className="brand-logo"><Box size={20} /></span>
          <span className="brand-copy"><span>3D<em>World</em></span><small>AI STUDIO</small></span>
        </NavLink>
        <div className="header-modules"><ModuleSwitcher current="ai" theme="light" /></div>
        <div className="header-account">
          <CommandTrigger onOpen={palette.openPalette} />
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
        {/* key theo trang (không theo id dự án) → hiệu ứng hiện dần khi chuyển trang, không nháy khi đổi dự án */}
        <div className="route-fade" key={location.pathname.split('/')[1]}>
          <Outlet />
        </div>
      </main>
      <CommandPalette open={palette.open} onClose={() => palette.setOpen(false)} commands={commands} accent="#7955ff" />
    </div>
  );
}
