import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cuboid } from 'lucide-react';
import { api, type ProjectSummary, type ProjectDetail, type Version } from '../lib/api';
import { date } from '../lib/format';
import { Empty } from './ui';

/** Danh sách dự án đã có mô hình để chọn (dùng ở trang Xuất / In khi chưa chọn phiên bản). */
export function ProjectPicker({ hrefFor, title }: { hrefFor: (versionId: string) => string; title: string }) {
  const [items, setItems] = useState<ProjectSummary[] | null>(null);
  useEffect(() => {
    api<{ items: ProjectSummary[] }>('/api/ai-studio/projects?status=READY&pageSize=48').then((r) => setItems(r.items)).catch(() => setItems([]));
  }, []);
  if (!items) return <div className="grid-cards">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}</div>;
  if (!items.length) return <Empty icon={<Cuboid />} title="Chưa có mô hình hoàn tất" text="Tạo mô hình trong AI Studio trước." action={<Link className="btn primary" to="/studio">Mở AI Studio</Link>} />;
  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>{title}</p>
      <div className="grid-cards">
        {items.map((p) => (
          <Link key={p.id} to={hrefFor(p.activeVersionId!)} className="card summary-card" style={{ color: 'var(--text)', padding: 14 }}>
            {p.thumbnailUrl ? <img src={p.thumbnailUrl} alt="" style={{ width: 72, height: 72 }} /> : <span className="ph" style={{ width: 72, height: 72 }} />}
            <div><b>{p.title}</b><div className="muted small">{p.versionCount} phiên bản · {date(p.updatedAt)}</div><div className="muted small">{p.formats.map((f) => f.toUpperCase()).join(' · ')}</div></div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Tải phiên bản + dự án chứa nó. */
export function useVersion(versionId?: string) {
  const [state, setState] = useState<{ version: Version; detail: ProjectDetail } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = async () => {
    if (!versionId) return;
    try {
      const { version } = await api<{ version: Version }>(`/api/ai-studio/versions/${versionId}`);
      const detail = await api<ProjectDetail>(`/api/ai-studio/projects/${version.projectId}`);
      setState({ version, detail });
      setError(null);
    } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { setState(null); reload(); }, [versionId]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, error, reload };
}
