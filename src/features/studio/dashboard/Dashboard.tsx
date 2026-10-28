import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Bell, Box, ChevronDown, LayoutGrid, LayoutTemplate, List, Pencil, Plus, SearchX, WifiOff,
} from 'lucide-react';
import { navigate, href, type Route } from '../router';
import {
  createProject, duplicateProject, fetchProject, listProjects, normalizeSearch, type ProjectMeta,
} from '../services/projects';
import { TEMPLATES, TEMPLATE_CATEGORIES, keychainTemplate, type Template, type TemplateCategory } from '../lib/scene';
import { cachedThumbnail } from '../lib/thumbnail';
import { exportStl, download } from '../lib/io';
import { printableNodes } from '../lib/printCheck';
import { useStudio } from '../store';
import { Toasts } from '../components/StatusBar';
import { ActionMenu, ProjectCard, ShapeIcon, SkeletonGrid, type MenuItem } from './ProjectCard';
import { CreateProjectDialog, DeleteDialog, RenameDialog } from './dialogs';
import { sessionUser } from '../session';
import { logout } from '../../../shared/session/session';
import { ModuleSwitcher } from '../../../shared/ui/ModuleSwitcher';

const USER = {
  get full() { return sessionUser()?.name ?? 'Khách'; },
  get first() { return (sessionUser()?.name ?? '').trim().split(/\s+/).pop() || 'bạn'; },
};
const toast = (...a: Parameters<ReturnType<typeof useStudio.getState>['toast']>) => useStudio.getState().toast(...a);

/* ---------------- header ---------------- */
function Header({ route }: { route: Route }) {
  const active = route.name === 'templates' || route.name === 'template' ? 'templates' : 'projects';
  const soon = (what: string) => toast({ kind: 'info', title: `${what} sắp có`, text: 'Mục này chưa thuộc phạm vi MVP.' });
  return (
    <header className="dash-header">
      <a className="brand" href={href({ name: 'welcome' })}><Box size={24} color="var(--primary)" strokeWidth={1.6} /> 3DWorld <small>STUDIO</small></a>
      <nav className="dash-nav" aria-label="Điều hướng chính">
        <a href={href({ name: 'projects' })} className={active === 'projects' ? 'on' : ''} aria-current={active === 'projects' ? 'page' : undefined}>Dự án</a>
        <a href={href({ name: 'templates' })} className={active === 'templates' ? 'on' : ''} aria-current={active === 'templates' ? 'page' : undefined}>Thư viện mẫu</a>
        <button onClick={() => soon('Tài nguyên')}>Tài nguyên</button>
        <button onClick={() => soon('Trợ giúp')}>Trợ giúp</button>
      </nav>
      <div className="grow" />
      <span className="dash-modules"><ModuleSwitcher current="studio" compact /></span>
      <button className="btn ghost icon" aria-label="Thông báo" onClick={() => toast({ kind: 'info', title: 'Không có thông báo mới' })}><Bell size={17} /></button>
      <button className="user-chip" aria-label="Tài khoản · đăng xuất" title="Đăng xuất"
        onClick={() => { if (confirm(`Đăng xuất khỏi tài khoản ${sessionUser()?.email ?? ''}?`)) void logout('/'); }}>
        <span className="avatar" aria-hidden /> {USER.full} <ChevronDown size={14} />
      </button>
    </header>
  );
}

function PageHead({ title, sub, onNew }: { title: string; sub: string; onNew: () => void }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1><p>{sub}</p></div>
      <button className="btn primary lg" onClick={onNew}><Plus size={16} /> Dự án mới</button>
    </div>
  );
}

/* ---------------- toolbar (search / sort / view) ---------------- */
type Sort = 'updated' | 'name' | 'created';
function ListToolbar({ label, query, setQuery, sort, setSort, view, setView, sortOptions }: {
  label: string; query: string; setQuery: (q: string) => void; sort: string; setSort: (s: string) => void;
  view: 'grid' | 'list'; setView: (v: 'grid' | 'list') => void; sortOptions: { id: string; label: string }[];
}) {
  return (
    <div className="list-toolbar">
      <div className="search-col">
        <label className="label" htmlFor="dash-search">{label}</label>
        <input id="dash-search" className="text-input" type="search" placeholder="Tìm theo tên…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <label className="sort-select">
        <ChevronDown size={14} />
        <select aria-label="Sắp xếp" value={sort} onChange={(e) => setSort(e.target.value)}>
          {sortOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </label>
      <div className="grow" />
      <div className="row" role="group" aria-label="Kiểu hiển thị">
        <button className={`btn${view === 'grid' ? ' active' : ''}`} aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={15} /> Grid</button>
        <button className={`btn${view === 'list' ? ' active' : ''}`} aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={15} /> List</button>
      </div>
    </div>
  );
}

function usePersistentView(key: string) {
  const [view, setView] = useState<'grid' | 'list'>(() => { try { return (localStorage.getItem(key) as 'grid' | 'list') || 'grid'; } catch { return 'grid'; } });
  return [view, (v: 'grid' | 'list') => { setView(v); try { localStorage.setItem(key, v); } catch { /* ignore */ } }] as const;
}

function StateBlock({ icon, title, text, actions }: { icon: React.ReactNode; title: string; text: string; actions: React.ReactNode }) {
  return (
    <div className="dash-state" role="status">
      {icon}
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="row">{actions}</div>
    </div>
  );
}

/* ---------------- projects section (DASH-02/03/07/08/09) ---------------- */
function ProjectsSection({ onNew, limitHint }: { onNew: (templateId?: string) => void; limitHint?: boolean }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('updated');
  const [view, setView] = usePersistentView('3dw.dash.view');
  const [renaming, setRenaming] = useState<ProjectMeta | null>(null);
  const [deleting, setDeleting] = useState<ProjectMeta | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setStatus('loading');
    try { setProjects(await listProjects()); setStatus('ready'); } catch { setStatus('error'); }
  }, []);
  useEffect(() => { void load(true); }, [load]);

  const shown = useMemo(() => {
    const q = normalizeSearch(query);
    const list = projects.filter((p) => !q || normalizeSearch(p.name).includes(q));
    return list.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'vi') : sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt));
  }, [projects, query, sort]);

  const menuFor = (p: ProjectMeta): MenuItem[] => [
    { label: 'Mở trong Studio', onSelect: () => navigate({ name: 'studio', id: p.id }) },
    { label: 'Đổi tên', onSelect: () => setRenaming(p) },
    {
      label: 'Nhân bản', onSelect: async () => {
        try { const c = await duplicateProject(p.id); toast({ kind: 'success', title: 'Đã nhân bản', text: `“${c.name}” là bản sao độc lập.` }); void load(true); }
        catch (e) { toast({ kind: 'error', title: 'Nhân bản thất bại', text: (e as Error).message }); }
      },
    },
    {
      label: 'Xuất mô hình', onSelect: async () => {
        try {
          const content = await fetchProject(p.id);
          if (!content) throw new Error('Không đọc được dự án');
          const r = exportStl(content.nodes, printableNodes(content.nodes).map((n) => n.id));
          download(r.blob, `${p.name.replace(/[^\p{L}\p{N}_-]+/gu, '_')}.stl`);
          toast({ kind: 'success', title: 'Đã xuất STL (mm)', text: `${r.size.x.toFixed(1)} × ${r.size.y.toFixed(1)} × ${r.size.z.toFixed(1)} mm · không mang màu` });
        } catch (e) { toast({ kind: 'error', title: 'Không thể xuất', text: (e as Error).message }); }
      },
    },
    { label: 'Xóa dự án', danger: true, onSelect: () => setDeleting(p) },
  ];

  return (
    <section aria-label="Danh sách dự án">
      <ListToolbar label="Tìm dự án" query={query} setQuery={setQuery} sort={sort} setSort={(s) => setSort(s as Sort)} view={view} setView={setView}
        sortOptions={[{ id: 'updated', label: 'Cập nhật gần nhất' }, { id: 'created', label: 'Tạo gần nhất' }, { id: 'name', label: 'Tên A → Z' }]} />

      {status === 'loading' && <SkeletonGrid />}
      {status === 'error' && (
        <StateBlock icon={<WifiOff size={44} color="var(--primary)" strokeWidth={1.2} />} title="Không thể tải dự án"
          text="Kiểm tra kết nối mạng rồi thử lại. Chúng tôi giữ nguyên bộ lọc của bạn."
          actions={<><button className="btn primary" onClick={() => void load()}>Thử lại</button><a className="btn" href={href({ name: 'welcome' })}>Về Studio</a></>} />
      )}
      {status === 'ready' && projects.length === 0 && (
        <StateBlock icon={<Box size={44} color="var(--primary)" strokeWidth={1.2} />} title="Chưa có dự án nào"
          text="Từ một Cube đến vật thể đầu tiên. Tạo dự án trống hoặc bắt đầu với mẫu."
          actions={<><button className="btn primary" onClick={() => onNew()}>Tạo dự án</button><a className="btn" href={href({ name: 'templates' })}>Chọn mẫu</a></>} />
      )}
      {status === 'ready' && projects.length > 0 && shown.length === 0 && (
        <StateBlock icon={<SearchX size={44} color="var(--primary)" strokeWidth={1.2} />} title="Không tìm thấy dự án"
          text="Thử tên khác hoặc xóa bộ lọc. Các dự án của bạn không bị thay đổi."
          actions={<><button className="btn primary" onClick={() => setQuery('')}>Xóa bộ lọc</button><a className="btn" href={href({ name: 'welcome' })}>Về Studio</a></>} />
      )}
      {status === 'ready' && shown.length > 0 && (
        <div className={view === 'grid' ? 'card-grid' : 'row-list'}>
          {shown.map((p) => (
            <ProjectCard key={p.id} p={p} list={view === 'list'} menu={menuFor(p)} onOpen={() => navigate({ name: 'studio', id: p.id })} />
          ))}
        </div>
      )}
      {limitHint && status === 'ready' && <p className="hint" style={{ marginTop: 16 }}>Dự án mặc định riêng tư — chỉ bạn xem và chỉnh sửa được.</p>}

      {renaming && <RenameDialog project={renaming} onClose={() => setRenaming(null)} onDone={() => { setRenaming(null); toast({ kind: 'success', title: 'Đã đổi tên dự án' }); void load(true); }} />}
      {deleting && <DeleteDialog project={deleting} onClose={() => setDeleting(null)} onDeleted={() => {
        const name = deleting.name; setDeleting(null);
        setProjects((ps) => ps.filter((x) => x.id !== deleting.id));
        toast({ kind: 'success', title: `Đã xóa “${name}”`, text: 'Snapshot đã gửi POD vẫn được giữ.' });
      }} />}
    </section>
  );
}

/* ---------------- DASH-01 welcome ---------------- */
function Welcome({ onNew }: { onNew: (templateId?: string) => void }) {
  const hero = useMemo(() => cachedThumbnail('hero', keychainTemplate, { width: 1160, height: 680, view: [0.3, 1.2, 0.85], padding: 0.85 }), []);
  return (
    <>
      <PageHead title={`Chào ${USER.first}, hôm nay bạn muốn tạo gì?`} sub="Không cần kinh nghiệm 3D. Bắt đầu nhỏ, tạo thứ của riêng bạn." onNew={() => onNew()} />
      <div className="hero">
        <div className="hero-copy">
          <span className="badge brand">TẠO TỰ DO · THIẾT KẾ CHÍNH XÁC</span>
          <h2>Ý tưởng của bạn.<br />Vật thể do bạn tạo.</h2>
          <p>Thêm hình, chỉnh kích thước, cá nhân hóa bằng chữ. Xem trước và gửi yêu cầu in khi bạn sẵn sàng.</p>
          <div className="row">
            <button className="btn primary lg" onClick={() => onNew()}><Plus size={16} /> Tạo dự án trống</button>
            <a className="btn lg" href={href({ name: 'templates' })}><LayoutTemplate size={16} /> Khám phá mẫu</a>
          </div>
        </div>
        <div className="hero-art">{hero ? <img src={hero} alt="Móc khóa STUDIO 60 × 24 × 4 mm" /> : <Box size={96} color="var(--primary)" strokeWidth={1} />}</div>
      </div>
      <ProjectsSection onNew={onNew} />
    </>
  );
}

/* ---------------- DASH-05 template gallery ---------------- */
function useTemplateThumb(t: Template, big = false) {
  return useMemo(() => cachedThumbnail(`tpl:${t.id}:${big ? 'big' : 'sm'}`, t.build, big
    ? { width: 1140, height: 780, view: [0.3, 1.2, 0.85], padding: 1.0 }
    : { width: 576, height: 240, background: '#10141d' }), [t.id, big]);
}

function TemplateCard({ t, list, onUse }: { t: Template; list: boolean; onUse: () => void }) {
  const thumb = useTemplateThumb(t);
  const open = () => navigate({ name: 'template', id: t.id });
  const menu: MenuItem[] = [{ label: 'Xem chi tiết', onSelect: open }, { label: 'Dùng mẫu này', onSelect: onUse }];
  if (list) {
    return (
      <div className="p-row" role="button" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter') open(); }}>
        <div className="p-row-thumb">{thumb ? <img src={thumb} alt="" /> : <ShapeIcon icon={t.icon} size={28} />}</div>
        <div className="p-row-name">{t.name}</div>
        <div className="p-row-meta">{t.dims} · {TEMPLATE_CATEGORIES.find((c) => c.id === t.category)?.label}</div>
        <span className="badge plain-dot">Cơ bản · Có thể tùy chỉnh</span>
        <ActionMenu items={menu} label={`Thao tác cho mẫu ${t.name}`} />
      </div>
    );
  }
  return (
    <article className="p-card" role="button" tabIndex={0} aria-label={`Xem mẫu ${t.name}`} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) open(); }}>
      <div className="p-thumb">{thumb ? <img src={thumb} alt={`Xem trước ${t.name}`} /> : <ShapeIcon icon={t.icon} />}</div>
      <div className="p-body">
        <div className="p-title"><h3>{t.name}</h3><ActionMenu items={menu} label={`Thao tác cho mẫu ${t.name}`} /></div>
        <p>{t.dims} · Xem chi tiết</p>
        <span className="badge plain-dot">Cơ bản · Có thể tùy chỉnh</span>
      </div>
    </article>
  );
}

function Templates({ onNew }: { onNew: (templateId?: string) => void }) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<TemplateCategory | 'all'>('all');
  const [sort, setSort] = useState('popular');
  const [view, setView] = usePersistentView('3dw.tpl.view');
  const shown = useMemo(() => {
    const q = normalizeSearch(query);
    const list = TEMPLATES.filter((t) => (cat === 'all' || t.category === cat) && (!q || normalizeSearch(`${t.name} ${t.desc}`).includes(q)));
    return sort === 'name' ? [...list].sort((a, b) => a.name.localeCompare(b.name, 'vi')) : list;
  }, [query, cat, sort]);
  return (
    <>
      <PageHead title="Thư viện mẫu" sub="Mẫu nội bộ do 3DWorld duyệt · tạo bản sao độc lập để chỉnh sửa" onNew={() => onNew()} />
      <ListToolbar label="Tìm mẫu" query={query} setQuery={setQuery} sort={sort} setSort={setSort} view={view} setView={setView}
        sortOptions={[{ id: 'popular', label: 'Phổ biến' }, { id: 'name', label: 'Tên A → Z' }]} />
      <div className="chips" role="tablist" aria-label="Danh mục mẫu">
        {TEMPLATE_CATEGORIES.map((c) => (
          <button key={c.id} role="tab" aria-selected={cat === c.id} className={`btn${cat === c.id ? ' active' : ''}`} onClick={() => setCat(c.id)}>{c.label}</button>
        ))}
      </div>
      {shown.length === 0 ? (
        <StateBlock icon={<SearchX size={44} color="var(--primary)" strokeWidth={1.2} />} title="Không tìm thấy mẫu"
          text="Thử từ khóa khác hoặc chọn danh mục Tất cả."
          actions={<button className="btn primary" onClick={() => { setQuery(''); setCat('all'); }}>Xóa bộ lọc</button>} />
      ) : (
        <div className={view === 'grid' ? 'card-grid' : 'row-list'}>
          {shown.map((t) => <TemplateCard key={t.id} t={t} list={view === 'list'} onUse={() => onNew(t.id)} />)}
        </div>
      )}
    </>
  );
}

/* ---------------- DASH-06 template detail ---------------- */
function TemplateDetail({ id, onNew, onUse }: { id: string; onNew: () => void; onUse: (t: Template) => Promise<void> }) {
  const t = TEMPLATES.find((x) => x.id === id);
  const big = useMemo(() => (t ? cachedThumbnail(`tpl:${t.id}:big`, t.build, { width: 1140, height: 780, view: [0.3, 1.2, 0.85], padding: 1.0 }) : null), [t]);
  const [busy, setBusy] = useState(false);
  if (!t) {
    return <StateBlock icon={<SearchX size={44} color="var(--primary)" />} title="Không tìm thấy mẫu" text="Mẫu có thể đã bị gỡ hoặc bạn không còn quyền sử dụng."
      actions={<a className="btn primary" href={href({ name: 'templates' })}>Về Thư viện mẫu</a>} />;
  }
  const catLabel = TEMPLATE_CATEGORIES.find((c) => c.id === t.category)?.label;
  return (
    <>
      <a className="back-link" href={href({ name: 'templates' })}><ArrowLeft size={14} /> Thư viện mẫu</a>
      <PageHead title={t.name} sub={`${catLabel} · ${t.version} · ${t.license}`} onNew={onNew} />
      <div className="detail">
        <div className="detail-art">{big ? <img src={big} alt={`Xem trước ${t.name}`} /> : <ShapeIcon icon={t.icon} size={120} />}</div>
        <div className="detail-copy">
          <span className="badge brand">Cơ bản · {catLabel}</span>
          <h2>{t.tagline.split('\n').map((l, i) => <span key={i}>{l}<br /></span>)}</h2>
          <p>{t.about}</p>
          <dl className="kv detail-kv">
            {t.specs.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}
            <dt>Độ khó</dt><dd>{t.difficulty}</dd>
            <dt>Khởi tạo</dt><dd>Bản sao độc lập của mẫu</dd>
          </dl>
          <button className="btn primary lg" disabled={busy} onClick={() => { setBusy(true); void onUse(t).finally(() => setBusy(false)); }}><Pencil size={15} /> {busy ? 'Đang tạo…' : 'Tùy chỉnh mẫu'}</button>
          <p className="hint">Chưa xác nhận khả năng sản xuất. Chạy kiểm tra và chờ staff review trước khi in.</p>
        </div>
      </div>
    </>
  );
}

/* ---------------- shell ---------------- */
export default function Dashboard({ route }: { route: Exclude<Route, { name: 'studio' }> }) {
  const [creating, setCreating] = useState<{ templateId?: string } | null>(null);
  const onNew = (templateId?: string) => setCreating({ templateId });
  const useTemplate = async (t: Template) => {
    try {
      const p = await createProject({ name: t.name, templateId: t.id });
      navigate({ name: 'studio', id: p.id });
    } catch (e) { toast({ kind: 'error', title: 'Chưa tạo được dự án', text: (e as Error).message }); }
  };

  return (
    <div className="dash">
      <Header route={route} />
      <main className="dash-main">
        {route.name === 'welcome' && <Welcome onNew={onNew} />}
        {route.name === 'projects' && (
          <>
            <PageHead title="Dự án của tôi" sub="Không gian sáng tạo của bạn" onNew={() => onNew()} />
            <ProjectsSection onNew={onNew} limitHint />
          </>
        )}
        {route.name === 'templates' && <Templates onNew={onNew} />}
        {route.name === 'template' && <TemplateDetail id={route.id} onNew={() => onNew()} onUse={useTemplate} />}
      </main>
      <footer className="dash-foot"><span>Create freely. Design precisely. Bring your ideas into reality.</span><span>3DWorld Studio · MVP</span></footer>
      {creating && (
        <CreateProjectDialog initialTemplate={creating.templateId} onClose={() => setCreating(null)}
          onCreated={(p) => { setCreating(null); navigate({ name: 'studio', id: p.id }); }} />
      )}
      <Toasts />
    </div>
  );
}
