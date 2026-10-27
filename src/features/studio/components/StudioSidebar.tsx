import { BookOpen, CircleHelp, FolderKanban, LayoutTemplate } from 'lucide-react';
import { href } from '../router';

export type StudioSection = 'projects' | 'templates';

export default function StudioSidebar({ active, compact = false, onSoon }: {
  active: StudioSection;
  compact?: boolean;
  onSoon?: (name: string) => void;
}) {
  const item = (current: boolean) => `studio-nav-item${current ? ' on' : ''}`;
  return (
    <aside className={`studio-sidebar${compact ? ' compact' : ''}`} aria-label="Điều hướng 3D Studio">
      {!compact && <p className="studio-sidebar-heading">Không gian Studio</p>}

      <nav className="studio-sidebar-nav">
        <a className={item(active === 'projects')} href={href({ name: 'projects' })} title="Dự án">
          <FolderKanban size={18} /><span>Dự án</span>
        </a>
        <a className={item(active === 'templates')} href={href({ name: 'templates' })} title="Thư viện mẫu">
          <LayoutTemplate size={18} /><span>Thư viện mẫu</span>
        </a>
        <button className="studio-nav-item" type="button" onClick={() => onSoon?.('Tài nguyên')} title="Tài nguyên">
          <BookOpen size={18} /><span>Tài nguyên</span>
        </button>
        <button className="studio-nav-item" type="button" onClick={() => onSoon?.('Trợ giúp')} title="Trợ giúp">
          <CircleHelp size={18} /><span>Trợ giúp</span>
        </button>
      </nav>

      <div className="studio-sidebar-spacer" />
    </aside>
  );
}
