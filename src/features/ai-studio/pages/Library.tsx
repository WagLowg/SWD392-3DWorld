import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Search, Cuboid, Pencil, Download, Printer, Star, Archive } from 'lucide-react';
import type { ProjectDetail, ProjectSummary } from '../lib/api';
import { aiStudio } from '../lib/backend';
import { AuthedImg } from '../components/AuthedImg';
import { date, num, PROJECT_STATUS } from '../lib/format';
import { useToast } from '../lib/app-state';
import { useCrumb } from '../components/AppShell';
import { Badge, Empty, Modal, SelectField, Segmented } from '../components/ui';
import { Viewer3D } from '../components/Viewer3D';
import { useGlbThumbnail } from '../lib/glbThumb';

/** Ảnh thẻ dự án: thumbnail thật nếu có, không thì chụp từ tệp GLB. */
function ProjectThumb({ p, style }: { p: ProjectSummary; style?: CSSProperties }) {
  const shot = useGlbThumbnail(p.thumbnailUrl ? null : p.modelUrl);
  if (p.thumbnailUrl) return <AuthedImg src={p.thumbnailUrl} alt="" loading="lazy" style={style} />;
  if (shot) return <img src={shot} alt="" style={style} />;
  return <div style={{ display: 'grid', placeItems: 'center', height: '100%', ...style }}><Cuboid size={style ? 20 : 36} className="muted" /></div>;
}

type Tab = 'all' | 'recent' | 'favorites' | 'archived';
const SOURCE_LABEL = { single: 'Ảnh sang 3D', multi: 'Multi-View', text: 'Văn bản sang 3D' } as const;
const PAGE_SIZE = 9;

function QuickView({ id, onClose }: { id: string; onClose: () => void }) {
  const [d, setD] = useState<ProjectDetail | null>(null);
  const nav = useNavigate();
  useEffect(() => { aiStudio.project(id).then(setD).catch(() => onClose()); }, [id, onClose]);
  const v = d?.versions.find((x) => x.id === d.project.activeVersionId) || d?.versions[0];
  return (
    <Modal title={d?.project.title || 'Xem nhanh'} onClose={onClose} wide footer={
      <>
        {v && <Link className="btn outline" to={`/export/${v.id}`}><Download size={16} />Xuất</Link>}
        <button className="btn primary" onClick={() => nav(`/studio/${id}`)}>Mở Studio</button>
      </>
    }>
      <div className="viewport" style={{ height: 460, flex: 'none' }}>
        {v?.glbUrl ? (
          <Viewer3D url={v.glbUrl} mode="textured" grid bbox={false} autoRotate studioLight fallbackImage={v.thumbnailUrl} />
        ) : (
          <div className="vp-overlay"><div className="box">{d ? <><Cuboid size={32} style={{ margin: '0 auto' }} /><h3>Chưa có mô hình</h3><p className="muted">Dự án chưa có phiên bản hoàn tất.</p></> : <div className="spinner" />}</div></div>
        )}
      </div>
      {v && (
        <p className="muted small" style={{ marginBottom: 0 }}>
          {v.label} · {num(v.metadata.stats?.triangles)} tam giác · {v.assets.filter((a) => a.kind === 'model').map((a) => a.format.toUpperCase()).join(' · ')}
        </p>
      )}
    </Modal>
  );
}

export default function Library() {
  useCrumb(<><span>Thư viện</span><span>/</span><b>Mô hình của tôi</b></>);
  const toast = useToast();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: ProjectSummary[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [quick, setQuick] = useState<string | null>(null);
  const [rename, setRename] = useState<ProjectSummary | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setData(await aiStudio.projects({ tab, q, status, sort, page, pageSize: PAGE_SIZE }));
      setError(null);
    } catch (e) { setError((e as Error).message); }
  }, [tab, q, status, sort, page]);

  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);
  useEffect(() => { setPage(1); }, [tab, q, status, sort]);
  useEffect(() => {
    if (!data?.items.some((p) => p.status === 'PROCESSING')) return;
    const iv = setInterval(load, 4000);
    return () => clearInterval(iv);
  }, [data, load]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuFor(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const patch = async (p: ProjectSummary, body: Record<string, unknown>, msg?: string) => {
    try {
      await aiStudio.patchProject(p.id, body);
      if (msg) toast('success', msg);
      load();
    } catch (e) { toast('error', 'Không lưu được', (e as Error).message); }
  };

  // Danh sách chưa trả id phiên bản (activeVersionId luôn null) → mở dự án lấy phiên bản mới nhất.
  const openVersion = async (p: ProjectSummary, page: 'export' | 'print') => {
    setMenuFor(null);
    try {
      const d = await aiStudio.project(p.id);
      const v = d.versions.find((x) => x.id === p.activeVersionId) ?? d.versions[d.versions.length - 1];
      if (v) nav(`/${page}/${v.id}`);
      else toast('warning', 'Dự án chưa có phiên bản nào');
    } catch (e) { toast('error', 'Không mở được dự án', (e as Error).message); }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const closeQuick = useCallback(() => setQuick(null), []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Mô hình của tôi</h1>
          <p>Không gian dành cho những ý tưởng đang thành hình.{data ? ` ${num(data.total)} dự án.` : ''}</p>
        </div>
        <Link className="btn primary" to="/studio"><Plus size={18} />Tạo mô hình mới</Link>
      </div>

      <div className="tabs" role="tablist">
        {([['all', 'Tất cả mô hình'], ['recent', 'Gần đây'], ['favorites', 'Yêu thích'], ['archived', 'Lưu trữ']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="filters">
        <label className="field">
          <span>Tìm mô hình hoặc dự án</span>
          <div className="row" style={{ gap: 8 }}><Search size={15} className="muted" /><input placeholder="Tìm trong thư viện…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </label>
        <SelectField label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả</option>
          {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </SelectField>
        <SelectField label="Sắp xếp" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="name">Tên A–Z</option>
        </SelectField>
      </div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <span className="muted small">{data ? `Hiển thị ${data.items.length} / ${num(data.total)} dự án` : 'Đang tải…'}</span>
        <div style={{ width: 200 }}><Segmented value={view} onChange={setView} label="Kiểu hiển thị" options={[{ value: 'grid', label: 'Lưới' }, { value: 'list', label: 'Danh sách' }]} /></div>
      </div>

      {error && <div className="banner danger" style={{ marginBottom: 16 }}>{error} <button className="btn sm" onClick={load}>Thử lại</button></div>}

      {!data ? (
        <div className="grid-cards">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 340 }} />)}</div>
      ) : data.items.length === 0 ? (
        <Empty icon={<Cuboid />} title={q || status ? 'Không tìm thấy mô hình phù hợp' : 'Chưa có mô hình nào'}
          text={q || status ? 'Thử đổi từ khóa hoặc bộ lọc.' : 'Tạo mô hình đầu tiên từ một bức ảnh.'}
          action={<Link className="btn primary" to="/studio">Tạo mô hình đầu tiên</Link>} />
      ) : view === 'grid' ? (
        <div className="grid-cards">
          {data.items.map((p) => {
            const st = PROJECT_STATUS[p.status];
            return (
              <article key={p.id} className="mcard">
                <div className="thumb">
                  <ProjectThumb p={p} />
                </div>
                <div className="body">
                  <h3>
                    <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.favorite && <Star size={14} fill="currentColor" style={{ color: 'var(--warning, #f5a524)', marginRight: 4, verticalAlign: -2 }} />}{p.title}</span>
                    <span style={{ position: 'relative' }} ref={menuFor === p.id ? menuRef : undefined}>
                      <button className="icon-btn" style={{ width: 28, height: 28 }} aria-label="Tùy chọn" onClick={() => setMenuFor(menuFor === p.id ? null : p.id)}><MoreHorizontal size={16} /></button>
                      {menuFor === p.id && (
                        <div className="menu" role="menu" style={{ right: 0, top: 30 }}>
                          <button onClick={() => nav(`/studio/${p.id}`)}><Cuboid size={15} />Mở Studio</button>
                          <button onClick={() => { setMenuFor(null); setRename(p); }}><Pencil size={15} />Đổi tên</button>
                          {p.modelUrl && <button onClick={() => openVersion(p, 'export')}><Download size={15} />Xuất</button>}
                          {p.modelUrl && <button onClick={() => openVersion(p, 'print')}><Printer size={15} />In 3D</button>}
                          <button onClick={() => { setMenuFor(null); patch(p, { favorite: !p.favorite }, p.favorite ? 'Đã bỏ yêu thích' : 'Đã thêm vào Yêu thích'); }}>
                            <Star size={15} />{p.favorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                          </button>
                          <button onClick={() => { setMenuFor(null); patch(p, { archived: !p.archived }, p.archived ? 'Đã khôi phục dự án' : 'Đã lưu trữ dự án'); }}>
                            <Archive size={15} />{p.archived ? 'Khôi phục' : 'Lưu trữ'}
                          </button>
                        </div>
                      )}
                    </span>
                  </h3>
                  <span className="meta">{SOURCE_LABEL[p.sourceMode]} · {date(p.updatedAt)} · {p.versionCount} phiên bản</span>
                  <span className="meta">{p.formats.length ? p.formats.map((f) => f.toUpperCase()).join(' · ') : '—'}</span>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <div className="actions">
                    <Link className="btn sm grow" to={`/studio/${p.id}`}>Mở Studio</Link>
                    <button className="btn sm" onClick={() => setQuick(p.id)} disabled={!p.modelUrl}>Xem nhanh</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Dự án</th><th>Phương thức</th><th>Trạng thái</th><th>Định dạng</th><th>Cập nhật</th><th /></tr></thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id}>
                  <td><div className="row"><span style={{ width: 40, height: 40, flex: 'none', overflow: 'hidden', borderRadius: 8 }}><ProjectThumb p={p} style={{ width: 40, height: 40, objectFit: 'cover' }} /></span><b>{p.title}</b></div></td>
                  <td className="muted">{SOURCE_LABEL[p.sourceMode]}</td>
                  <td><Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge></td>
                  <td className="muted">{p.formats.map((f) => f.toUpperCase()).join(' · ') || '—'}</td>
                  <td className="muted">{date(p.updatedAt)}</td>
                  <td><Link className="btn sm" to={`/studio/${p.id}`}>Mở Studio</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="pager" aria-label="Phân trang">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button key={n} aria-current={n === page} onClick={() => setPage(n)}>{n}</button>
          ))}
          <button disabled={page >= pages} onClick={() => setPage(page + 1)}>Tiếp</button>
        </nav>
      )}

      {quick && <QuickView id={quick} onClose={closeQuick} />}
      {rename && (
        <Modal title="Đổi tên dự án" onClose={() => setRename(null)}>
          <form onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get('t') as string; if (v.trim()) patch(rename, { title: v }, 'Đã đổi tên'); setRename(null); }} className="stack">
            <label className="field"><span>Tên dự án</span><input name="t" defaultValue={rename.title} maxLength={80} autoFocus /></label>
            <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn outline" onClick={() => setRename(null)}>Hủy</button><button className="btn primary">Lưu</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
