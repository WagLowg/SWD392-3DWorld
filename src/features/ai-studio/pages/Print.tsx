import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lock, Unlock, Send, AlertTriangle, CheckCircle2, Cuboid, ShieldAlert } from 'lucide-react';
import { ApiError } from '../lib/api';
import { aiStudio, createPrintRequestFromVersion } from '../lib/backend';
import { AuthedImg } from '../components/AuthedImg';
import { podService } from '../../pod/services/pod.service';
import type { PrintMaterial, PrintRequest } from '../../pod/types';
import { dateTime } from '../lib/format';
import { useToast } from '../lib/app-state';
import { useCrumb } from '../components/AppShell';
import { Badge, Empty, Segmented, SelectField, TextField } from '../components/ui';
import { ProjectPicker, useVersion } from '../components/ProjectPicker';

type Unit = 'mm' | 'cm';
const QUALITIES: Record<string, string[]> = {
  FDM: ['0.28 mm · Nháp', '0.20 mm · Tiêu chuẩn', '0.12 mm · Chi tiết'],
  RESIN: ['50 micron · Tiêu chuẩn', '25 micron · Chi tiết cao'],
};
const qualitiesFor = (tech: string) => QUALITIES[tech] ?? ['Tiêu chuẩn'];

/** Yêu cầu in gần đây (module POD). Chưa có API lọc theo mô hình AI nên hiển thị tất cả. */
function PrintRequests({ items }: { items: PrintRequest[] }) {
  if (!items.length) return null;
  return (
    <div className="card">
      <h3>Yêu cầu in gần đây</h3>
      <p className="sub">Báo giá, thanh toán và sản xuất do bộ phận In theo yêu cầu (POD) xử lý.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Mã yêu cầu</th><th>Trạng thái</th><th>Ngày tạo</th><th /></tr></thead>
          <tbody>
            {items.slice(0, 10).map((r) => (
              <tr key={r.printRequestId}>
                <td><b>#{r.printRequestId}</b></td>
                <td><Badge tone="violet">{r.status}</Badge></td>
                <td className="muted">{r.createdAt ? dateTime(Date.parse(r.createdAt)) : '—'}</td>
                <td><a className="btn sm" href={`/pod/requests/${r.printRequestId}`}>Mở ở POD</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PrintPage() {
  const { versionId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { version, detail, error } = useVersion(versionId);
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [materials, setMaterials] = useState<PrintMaterial[] | null>(null);
  const [savedDims, setSavedDims] = useState<{ l: number; w: number; h: number } | null>(null);
  const [unit, setUnit] = useState<Unit>('mm');
  const [lock, setLock] = useState(true);
  const [dims, setDims] = useState({ l: 0, w: 0, h: 0 });
  const [savingDims, setSavingDims] = useState(false);
  const [pod, setPod] = useState({ technology: 'FDM', materialId: 0, quality: '0.20 mm · Tiêu chuẩn', color: 'Trắng', quantity: 1, note: '' });
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState<PrintRequest | null>(null);

  useCrumb(detail ? <><span>{detail.project.title}</span><span>/</span><b>In 3D</b></> : <b>In 3D theo yêu cầu</b>, [detail?.project.title]);
  const loadRequests = () => podService.listRequests().then(setRequests).catch(() => {});
  useEffect(() => {
    loadRequests();
    podService.listMaterials().then((m) => {
      setMaterials(m);
      if (m[0]) setPod((p) => ({ ...p, technology: m[0].technologyCode, materialId: m[0].materialId, quality: qualitiesFor(m[0].technologyCode)[1] ?? qualitiesFor(m[0].technologyCode)[0] }));
    }).catch(() => setMaterials([]));
  }, []);
  const technologies = useMemo(() => [...new Set((materials ?? []).map((m) => m.technologyCode))], [materials]);

  // Tỉ lệ từ khung bao của mô hình (X = dài, Z = rộng, Y = cao)
  const ratio = useMemo(() => {
    const s = version?.metadata.stats?.size;
    if (!s || s.some((x) => !x)) return null;
    return { l: s[0] / s[1], w: s[2] / s[1] };
  }, [version]);

  useEffect(() => {
    if (!version) return;
    if (version.dimensions) setDims({ l: version.dimensions.lengthMm, w: version.dimensions.widthMm, h: version.dimensions.heightMm });
    else if (ratio) setDims({ l: +(100 * ratio.l).toFixed(1), w: +(100 * ratio.w).toFixed(1), h: 100 });
    else setDims({ l: 100, w: 100, h: 100 });
    setCreated(null);
    setSavedDims(null);
  }, [version, ratio]);

  if (!versionId) {
    return (
      <div className="page">
        <div className="page-head"><div><h1>In 3D theo yêu cầu</h1><p>Xác nhận kích thước, chọn cấu hình in và gửi sang bộ phận POD.</p></div></div>
        <div className="stack lg"><ProjectPicker title="Chọn mô hình muốn in:" hrefFor={(v) => `/print/${v}`} /><PrintRequests items={requests} /></div>
      </div>
    );
  }
  if (error) return <div className="page"><Empty icon={<AlertTriangle />} title="Không mở được phiên bản" text={error} action={<Link className="btn primary" to="/print">Chọn mô hình khác</Link>} /></div>;
  if (!version || !detail || !materials) return <div className="page"><div className="skeleton" style={{ height: 400 }} /></div>;

  const f = unit === 'cm' ? 0.1 : 1;
  const show = (mm: number) => +(mm * f).toFixed(unit === 'cm' ? 2 : 1);
  const setDim = (k: 'l' | 'w' | 'h', raw: string) => {
    const mm = Number(raw) / f;
    if (!Number.isFinite(mm)) return;
    if (lock && ratio) {
      const h = k === 'h' ? mm : k === 'l' ? mm / ratio.l : mm / ratio.w;
      setDims({ l: +(h * ratio.l).toFixed(1), w: +(h * ratio.w).toFixed(1), h: +h.toFixed(1) });
    } else setDims({ ...dims, [k]: +mm.toFixed(1) });
  };
  const dimErr = (mm: number) => (!mm || mm <= 0 ? 'Bắt buộc' : mm < 5 ? 'Tối thiểu 5 mm' : mm > 1000 ? 'Tối đa 1000 mm' : undefined);
  const dimsInvalid = [dims.l, dims.w, dims.h].some((x) => dimErr(x));
  const confirmedDims = savedDims ?? (version.dimensions ? { l: version.dimensions.lengthMm, w: version.dimensions.widthMm, h: version.dimensions.heightMm } : null);
  const saved = !!confirmedDims && confirmedDims.l === dims.l && confirmedDims.w === dims.w && confirmedDims.h === dims.h;

  const saveDims = async () => {
    setSavingDims(true);
    try {
      await aiStudio.saveDimensions(version.id, dims);
      setSavedDims(dims);
      toast('success', 'Đã lưu kích thước thật');
    } catch (e) { toast('error', 'Không lưu được kích thước', (e as Error).message); } finally { setSavingDims(false); }
  };

  const techMaterials = materials.filter((m) => m.technologyCode === pod.technology);
  const materialName = materials.find((m) => m.materialId === pod.materialId)?.materialName ?? '—';
  const send = async () => {
    if (!confirmedDims || !pod.materialId) return;
    setSending(true);
    try {
      const r = await createPrintRequestFromVersion({
        version,
        projectTitle: detail.project.title,
        materialId: pod.materialId,
        dims: confirmedDims,
        quality: pod.quality,
        color: pod.color,
        quantity: pod.quantity,
        note: pod.note,
      });
      setCreated(r);
      setConfirm(false);
      loadRequests();
      toast('success', 'Đã tạo yêu cầu in', `#${r.printRequestId}`);
    } catch (e) {
      toast('error', 'Không gửi được yêu cầu in', e instanceof ApiError || e instanceof Error ? e.message : 'Vui lòng thử lại.');
    } finally { setSending(false); }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>In 3D theo yêu cầu</h1><p>Bàn giao kỹ thuật: xác nhận kích thước thật và cấu hình, tạo yêu cầu in mới cho bộ phận POD.</p></div>
        {detail.versions.length > 1 && (
          <div style={{ width: 240 }}>
            <SelectField label="Phiên bản" value={version.id} onChange={(e) => nav(`/print/${e.target.value}`)}>
              {detail.versions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </SelectField>
          </div>
        )}
      </div>

      <div className="two-col">
        <div className="stack lg">
          <div className="card summary-card">
            {version.thumbnailUrl ? <AuthedImg src={version.thumbnailUrl} alt="" /> : <span className="ph" style={{ display: 'grid', placeItems: 'center' }}><Cuboid /></span>}
            <div className="grow">
              <h3 style={{ fontSize: 18 }}>{detail.project.title}</h3>
              <p className="muted small" style={{ margin: '4px 0 8px' }}>{version.label} · tệp in: {version.assets.filter((a) => a.kind === 'model' && ['stl', '3mf', 'obj', 'glb'].includes(a.format)).map((a) => a.format.toUpperCase()).join(' · ')}</p>
              <Link className="btn sm" to={`/studio/${detail.project.id}`}>Mở trong Studio</Link>
            </div>
          </div>

          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><h3>1 · Kích thước thật</h3><p className="sub">AI không suy ra kích thước vật lý từ ảnh. Bạn cần xác nhận kích thước mong muốn.</p></div>
              <div style={{ width: 120 }}><Segmented value={unit} onChange={setUnit} label="Đơn vị" options={[{ value: 'mm', label: 'mm' }, { value: 'cm', label: 'cm' }]} /></div>
            </div>
            <div className="dims">
              <TextField label="Dài (X)" type="number" step="any" value={show(dims.l)} onChange={(e) => setDim('l', e.target.value)} suffix={unit} error={dimErr(dims.l)} />
              <TextField label="Rộng (Z)" type="number" step="any" value={show(dims.w)} onChange={(e) => setDim('w', e.target.value)} suffix={unit} error={dimErr(dims.w)} />
              <TextField label="Cao (Y)" type="number" step="any" value={show(dims.h)} onChange={(e) => setDim('h', e.target.value)} suffix={unit} error={dimErr(dims.h)} />
            </div>
            <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
              <button className={`btn sm ${lock ? '' : 'outline'}`} onClick={() => setLock(!lock)} disabled={!ratio} aria-pressed={lock}>
                {lock ? <Lock size={14} /> : <Unlock size={14} />}{lock ? 'Giữ tỉ lệ mô hình' : 'Tỉ lệ tự do'}
              </button>
              <button className="btn primary sm" onClick={saveDims} disabled={dimsInvalid || savingDims || !!saved}>
                {saved ? <><CheckCircle2 size={14} />Đã xác nhận</> : savingDims ? <span className="spinner" /> : 'Xác nhận kích thước'}
              </button>
            </div>
            {!lock && <div className="banner warning" style={{ marginTop: 12 }}>Tỉ lệ tự do sẽ kéo giãn mô hình khác với hình dạng gốc.</div>}
          </div>

          <div className="card">
            <h3>2 · Cấu hình in</h3>
            <p className="sub">Chỉ hiển thị tổ hợp công nghệ/vật liệu đang nhận đơn.</p>
            <div className="stack">
              {!materials.length && <div className="banner warning">Chưa có vật liệu in nào đang hoạt động.</div>}
              {technologies.length > 0 && (
                <Segmented value={pod.technology} label="Công nghệ" onChange={(t) => {
                  const first = materials.find((m) => m.technologyCode === t);
                  const q = qualitiesFor(t);
                  setPod({ ...pod, technology: t, materialId: first?.materialId ?? 0, quality: q[Math.min(1, q.length - 1)] });
                }} options={technologies.map((t) => ({ value: t, label: t }))} />
              )}
              <div className="dims" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <SelectField label="Vật liệu" value={String(pod.materialId)} onChange={(e) => setPod({ ...pod, materialId: Number(e.target.value) })}>
                  {techMaterials.map((m) => <option key={m.materialId} value={m.materialId}>{m.materialName}</option>)}
                </SelectField>
                <SelectField label="Chất lượng lớp" value={pod.quality} onChange={(e) => setPod({ ...pod, quality: e.target.value })}>
                  {qualitiesFor(pod.technology).map((q) => <option key={q}>{q}</option>)}
                </SelectField>
                <TextField label="Màu mong muốn" value={pod.color} maxLength={40} onChange={(e) => setPod({ ...pod, color: e.target.value })} />
                <TextField label="Số lượng" type="number" min={1} max={100} value={pod.quantity} onChange={(e) => setPod({ ...pod, quantity: Number(e.target.value) })}
                  error={pod.quantity < 1 || pod.quantity > 100 ? 'Từ 1 đến 100' : undefined} />
              </div>
              <label className="field"><span>Ghi chú cho kỹ thuật viên (không bắt buộc)</span><textarea maxLength={1000} value={pod.note} onChange={(e) => setPod({ ...pod, note: e.target.value })} /></label>
            </div>
          </div>
        </div>

        <div className="stack lg">
          <div className="card">
            <h3>Tóm tắt bàn giao</h3>
            <dl className="kv" style={{ marginTop: 12 }}>
              <dt>Mô hình</dt><dd>{detail.project.title} · {version.label.split(' ')[0]}</dd>
              <dt>Kích thước</dt><dd>{confirmedDims ? `${confirmedDims.l} × ${confirmedDims.w} × ${confirmedDims.h} mm` : <span style={{ color: 'var(--warning)' }}>Chưa xác nhận</span>}</dd>
              <dt>Công nghệ</dt><dd>{pod.technology} · {materialName}</dd>
              <dt>Chất lượng</dt><dd>{pod.quality}</dd>
              <dt>Số lượng</dt><dd>{pod.quantity}</dd>
            </dl>
            <hr className="divider" />
            <div className="banner info" style={{ marginBottom: 12 }}>
              <ShieldAlert size={16} style={{ flex: 'none' }} />
              <span>Mỗi lần gửi tạo <b>một yêu cầu in mới</b> ở module POD kèm tệp GLB & cấu hình. Nhân viên sẽ kiểm tra kỹ thuật và gửi báo giá; bạn chỉ thanh toán sau khi chấp nhận báo giá. Chi phí in tách biệt với tín dụng AI.</span>
            </div>
            <label className="check" style={{ marginBottom: 14 }}>
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
              <span>Tôi đã kiểm tra mô hình và xác nhận thông tin trên. Tôi hiểu mô hình AI chưa được bảo đảm in thành công trước khi nhân viên kiểm tra.</span>
            </label>
            <button className="btn primary block" onClick={send} disabled={!confirmedDims || !pod.materialId || !confirm || sending || pod.quantity < 1 || pod.quantity > 100}>
              {sending ? <span className="spinner" /> : <Send size={16} />}Gửi yêu cầu in
            </button>
            {!confirmedDims && <div className="field-hint warn" style={{ textAlign: 'center' }}>Xác nhận kích thước thật ở bước 1 trước.</div>}
          </div>
          {created && (
            <div className="banner success">
              <CheckCircle2 size={18} style={{ flex: 'none' }} />
              <span>Đã tạo yêu cầu <b>#{created.printRequestId}</b> ({created.status}). <a href={`/pod/requests/${created.printRequestId}`}>Mở ở POD</a> để xem trước, gửi thẩm định và nhận báo giá.</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 24 }}><PrintRequests items={requests} /></div>
    </div>
  );
}
