import { useEffect, useRef, useState } from 'react';
import { Box, Circle, KeyRound, MoreHorizontal, PackageOpen, Shapes, Smartphone, Type } from 'lucide-react';
import { relativeTime, type ProjectMeta } from '../services/projects';

export function ShapeIcon({ icon, size = 56 }: { icon?: string; size?: number }) {
  const p = { size, strokeWidth: 1.1, color: 'var(--secondary)' };
  switch (icon) {
    case 'keychain': return <KeyRound {...p} />;
    case 'tray': return <PackageOpen {...p} />;
    case 'text': return <Type {...p} />;
    case 'phone': return <Smartphone {...p} />;
    case 'shapes': return <Shapes {...p} />;
    case 'ring': return <Circle {...p} />;
    default: return <Box {...p} />;
  }
}

/** Thumbnail do editor render khi lưu, lưu trên Cloudinary (URL trong Supabase). */
export function useProjectThumb(p: ProjectMeta) {
  return p.thumbnail ?? null;
}

export interface MenuItem { label: string; onSelect: () => void; danger?: boolean; disabled?: boolean }

export function ActionMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key); };
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className="btn ghost sm icon" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="menu" role="menu">
          {items.map((it) => (
            <button key={it.label} role="menuitem" className={it.danger ? 'danger' : ''} disabled={it.disabled}
              onClick={() => { setOpen(false); it.onSelect(); }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatusPill({ status }: { status: ProjectMeta['status'] }) {
  return <span className="badge plain-dot">{status === 'saved' ? 'Đã lưu' : 'Bản nháp'}</span>;
}

export function ProjectCard({ p, menu, onOpen, list }: { p: ProjectMeta; menu: MenuItem[]; onOpen: () => void; list?: boolean }) {
  const thumb = useProjectThumb(p);
  const meta = `${relativeTime(p.updatedAt)} · Cá nhân`;
  if (list) {
    return (
      <div className="p-row" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}>
        <div className="p-row-thumb">{thumb ? <img src={thumb} alt="" /> : <ShapeIcon icon={p.icon} size={28} />}</div>
        <div className="p-row-name">{p.name}</div>
        <div className="p-row-meta">{meta}</div>
        <StatusPill status={p.status} />
        <ActionMenu items={menu} label={`Thao tác cho ${p.name}`} />
      </div>
    );
  }
  return (
    <article className="p-card" role="button" tabIndex={0} aria-label={`Mở ${p.name}`} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(); }}>
      <div className="p-thumb">{thumb ? <img src={thumb} alt={`Xem trước ${p.name}`} /> : <ShapeIcon icon={p.icon} />}</div>
      <div className="p-body">
        <div className="p-title"><h3>{p.name}</h3><ActionMenu items={menu} label={`Thao tác cho ${p.name}`} /></div>
        <p>{meta}</p>
        <StatusPill status={p.status} />
      </div>
    </article>
  );
}

export function SkeletonGrid() {
  return (
    <div className="skeleton-grid" aria-busy="true" aria-label="Đang tải dự án">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}><div className="sk sk-thumb" /><div className="sk sk-line" /><div className="sk sk-line short" /></div>
      ))}
    </div>
  );
}
