import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lock, Unlock, Send, AlertTriangle, CheckCircle2, Cuboid, ShieldAlert } from 'lucide-react';
import { api, ApiError, newKey, type Handoff, type PodOptions } from '../lib/api';
import { dateTime } from '../lib/format';
import { useToast } from '../lib/app-state';
import { useCrumb } from '../components/AppShell';
import { Badge, Empty, Segmented, SelectField, TextField } from '../components/ui';
import { ProjectPicker, useVersion } from '../components/ProjectPicker';

type Unit = 'mm' | 'cm';
const HANDOFF_STATUS: Record<string, string> = { AWAITING_STAFF_REVIEW: 'Chờ nhân viên kiểm tra kỹ thuật' };

function Handoffs({ items }: { items: Handoff[] }) {
  if (!items.length) return null;
  return (
    <div className="card">
      <h3>Yêu cầu in đã gửi</h3>
      <p className="sub">Báo giá, thanh toán và sản xuất do bộ phận In theo yêu cầu (POD) xử lý.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Mã yêu cầu</th><th>Mô hình</th><th>Cấu hình</th><th>Kích thước</th><th>Trạng thái</th><th>Ngày gửi</th></tr></thead>
          <tbody>
            {items.map((h) => (
              <tr key={h.id}>
                <td><b>{h.printRequestId}</b></td>
                <td><Link to={`/studio/${h.projectId}`}>{h.projectTitle}</Link> <span className="muted">· {h.versionLabel?.split(' ')[0]}</span></td>
                <td className="muted">{h.config.technology} · {h.config.material} · ×{h.config.quantity}</td>
                <td className="muted">{h.config.dimensions.lengthMm}×{h.config.dimensions.widthMm}×{h.config.dimensions.heightMm} mm</td>
                <td><Badge tone="violet">{HANDOFF_STATUS[h.status] || h.status}</Badge></td>
                <td className="muted">{dateTime(h.createdAt)}</td>
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
  const { version, detail, error, reload } = useVersion(versionId);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [opts, setOpts] = useState<PodOptions | null>(null);
  const [unit, setUnit] = useState<Unit>('mm');
  const [lock, setLock] = useState(true);
  const [dims, setDims] = useState({ l: 0, w: 0, h: 0 });
  const [savingDims, setSavingDims] = useState(false);
  const [pod, setPod] = useState({ technology: 'FDM' as 'FDM' | 'RESIN', material: 'PLA', quality: '0.20 mm · Tiêu chuẩn', color: 'Trắng', quantity: 1, note: '' });
  const [confirm, setConfirm] = useState(false);
  const [sendKey, setSendKey] = useState(newKey());
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState<Handoff | null>(null);

  useCrumb(detail ? <><span>{detail.project.title}</span><span>/</span><b>In 3D</b></> : <b>In 3D theo yêu cầu</b>, [detail?.project.title]);
  const loadHandoffs = () => api<{ handoffs: Handoff[] }>('/api/ai-studio/pod-handoffs').then((r) => setHandoffs(r.handoffs)).catch(() => {});
  useEffect(() => { loadHandoffs(); api<{ options: PodOptions }>('/api/ai-studio/pod-options').then((r) => setOpts(r.options)); }, []);

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
  }, [version, ratio]);

  if (!versionId) {
    return (
      <div className="page">
        <div className="page-head"><div><h1>In 3D theo yêu cầu</h1><p>Xác nhận kích thước, chọn cấu hình in và gửi sang bộ phận POD.</p></div></div>
        <div className="stack lg"><ProjectPicker title="Chọn mô hình muốn in:" hrefFor={(v) => `/print/${v}`} /><Handoffs items={handoffs} /></div>
      </div>
    );
  }
  if (error) return <div className="page"><Empty icon={<AlertTriangle />} title="Không mở được phiên bản" text={error} action={<Link className="btn primary" to="/print">Chọn mô hình khác</Link>} /></div>;
  if (!version || !detail || !opts) return <div className="page"><div className="skeleton" style={{ height: 400 }} /></div>;

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
  const saved = version.dimensions && version.dimensions.lengthMm === dims.l && version.dimensions.widthMm === dims.w && version.dimensions.heightMm === dims.h;

  const saveDims = async () => {
    setSavingDims(true);
    try {
      await api(`/api/ai-studio/versions/${version.id}/dimensions`, { method: 'PUT', body: { lengthMm: dims.l, widthMm: dims.w, heightMm: dims.h, keepRatio: lock } });
      toast('success', 'Đã lưu kích thước thật');
      await reload();
    } catch (e) { toast('error', 'Không lưu được kích thước', (e as Error).message); } finally { setSavingDims(false); }
  };

  const tech = opts[pod.technology];
  const send = async () => {
    setSending(true);
    try {
      const r = await api<{ handoff: Handoff }>(`/api/ai-studio/versions/${version.id}/pod-handoffs`, { body: { ...pod, confirm }, headers: { 'Idempotency-Key': sendKey } });
      setCreated(r.handoff);
      setSendKey(newKey());
      setConfirm(false);
      loadHandoffs();
      toast('success', 'Đã tạo yêu cầu in', r.handoff.printRequestId);
    } catch (e) {
      toast('error', 'Không gửi được yêu cầu in', e instanceof ApiError ? e.message : 'Vui lòng thử lại — hệ thống không tạo trùng yêu cầu.');
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
            {version.thumbnailUrl ? <img src={version.thumbnailUrl} alt="" /> : <span className="ph" style={{ display: 'grid', placeItems: 'center' }}><Cuboid /></span>}
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
              <Segmented value={pod.technology} label="Công nghệ" onChange={(t) => setPod({ ...pod, technology: t, material: opts[t].materials[0], quality: opts[t].qualities[Math.min(1, opts[t].qualities.length - 1)] })}
                options={[{ value: 'FDM', label: 'FDM · Nhựa sợi' }, { value: 'RESIN', label: 'Resin · Chi tiết cao' }]} />
              <div className="dims" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <SelectField label="Vật liệu" value={pod.material} onChange={(e) => setPod({ ...pod, material: e.target.value })}>
                  {tech.materials.map((m) => <option key={m}>{m}</option>)}
                </SelectField>
                <SelectField label="Chất lượng lớp" value={pod.quality} onChange={(e) => setPod({ ...pod, quality: e.target.value })}>
                  {tech.qualities.map((q) => <option key={q}>{q}</option>)}
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
              <dt>Kích thước</dt><dd>{version.dimensions ? `${version.dimensions.lengthMm} × ${version.dimensions.widthMm} × ${version.dimensions.heightMm} mm` : <span style={{ color: 'var(--warning)' }}>Chưa xác nhận</span>}</dd>
              <dt>Công nghệ</dt><dd>{pod.technology} · {pod.material}</dd>
              <dt>Chất lượng</dt><dd>{pod.quality}</dd>
              <dt>Số lượng</dt><dd>{pod.quantity}</dd>
            </dl>
            <hr className="divider" />
            <div className="banner info" style={{ marginBottom: 12 }}>
              <ShieldAlert size={16} style={{ flex: 'none' }} />
              <span>Mỗi lần gửi tạo <b>một yêu cầu in mới</b> kèm bản chụp tệp & cấu hình. Nhân viên sẽ kiểm tra kỹ thuật và gửi báo giá; bạn chỉ thanh toán sau khi chấp nhận báo giá. Chi phí in tách biệt với tín dụng AI.</span>
            </div>
            <label className="check" style={{ marginBottom: 14 }}>
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
              <span>Tôi đã kiểm tra mô hình và xác nhận thông tin trên. Tôi hiểu mô hình AI chưa được bảo đảm in thành công trước khi nhân viên kiểm tra.</span>
            </label>
            <button className="btn primary block" onClick={send} disabled={!version.dimensions || !confirm || sending || pod.quantity < 1 || pod.quantity > 100}>
              {sending ? <span className="spinner" /> : <Send size={16} />}Gửi yêu cầu in
            </button>
            {!version.dimensions && <div className="field-hint warn" style={{ textAlign: 'center' }}>Xác nhận kích thước thật ở bước 1 trước.</div>}
          </div>
          {created && (
            <div className="banner success">
              <CheckCircle2 size={18} style={{ flex: 'none' }} />
              <span>Đã tạo yêu cầu <b>{created.printRequestId}</b>. Trạng thái: {HANDOFF_STATUS[created.status]}. Bạn sẽ nhận báo giá sau khi kỹ thuật viên kiểm tra.</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 24 }}><Handoffs items={handoffs.filter((h) => h.versionId === version.id || !versionId)} /></div>
    </div>
  );
}
