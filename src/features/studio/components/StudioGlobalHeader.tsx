import { Bell, Box, LogOut } from 'lucide-react';
import { ModuleSwitcher } from '../../../shared/ui/ModuleSwitcher';
import { logout } from '../../../shared/session/session';
import { href } from '../router';
import { sessionUser } from '../session';

export default function StudioGlobalHeader() {
  const user = sessionUser();
  const initial = user?.name?.trim().charAt(0).toUpperCase() || 'K';

  return (
    <header className="studio-global-header">
      <a className="studio-global-brand" href={href({ name: 'welcome' })} aria-label="Trang chủ 3D Studio">
        <span className="studio-global-logo"><Box size={20} /></span>
        <span>3DWorld<small>3D STUDIO</small></span>
      </a>

      <div className="studio-global-modules">
        <ModuleSwitcher current="studio" theme="dark" />
      </div>

      <div className="studio-global-user">
        <button type="button" className="studio-header-icon" aria-label="Thông báo" title="Thông báo">
          <Bell size={18} />
        </button>
        <a href="/portal/profile" className="studio-user-link" title={user?.email ?? 'Tài khoản'}>
          <span className="avatar" aria-hidden>{initial}</span>
          <span className="studio-user-copy">
            <b>{user?.name ?? 'Khách'}</b>
            <small>{user?.email ?? 'Chưa đăng nhập'}</small>
          </span>
        </a>
        <button
          type="button"
          className="studio-header-icon"
          aria-label="Đăng xuất"
          title="Đăng xuất"
          onClick={() => void logout('/')}
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
