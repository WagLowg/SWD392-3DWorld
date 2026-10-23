import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { CheckCircle2, FileUp, Loader2, Printer } from 'lucide-react';
import { useStudio, uid } from '../store';
import { CAPABILITIES, POD_CATALOG } from '../config';
import { exportStl, download, normalizeImported, parseStl, UNIT_TO_MM, type ImportUnit, type ParsedStl } from '../io';
import { printableNodes, runPrintCheck } from '../printCheck';
import type { PrintReport, PrintRequestReceipt, SceneNode, Snapshot } from '../types';
import { Alert, LevelBadge, Modal } from './ui';

/* ---------------- Import ---------------- */
function ImportModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedStl | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<ImportUnit | ''>('');
  const [zUp, setZUp] = useState(true);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);
  useEffect(() => () => { cancelled.current = true; }, []);

  const pick = async (f: File) => {
    setError(null); setParsed(null); setFile(f);
    if (f.size > CAPABILITIES.maxUploadMiB * 1048576) { setError(`Tệp ${(f.size / 1048576).toFixed(1)} MiB vượt giới hạn ${CAPABILITIES.maxUploadMiB} MiB.`); return; }
    setBusy(true);
    try {
      const buf = await f.arrayBuffer();
      if (cancelled.current) return;
      setParsed(parseStl(buf));
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  };

  const dims = parsed && unit ? parsed.rawSize.clone().multiplyScalar(UNIT_TO_MM[unit]) : null;

  return (
    <Modal title="Nhập tệp 3D" onClose={onClose} badge={<span className="badge brand">STL · MVP</span>}
      footer={<>
        <button className="btn" onClick={onClose}>Hủy</button>
        <button className="btn primary" disabled={!parsed || !unit} onClick={() => {
          const pos = normalizeImported(parsed!, unit as ImportUnit, zUp);
          useStudio.getState().importMesh(file!.name.replace(/\.stl$/i, ''), pos, parsed!.sourceHash, unit);
          useStudio.getState().toast({ kind: 'success', title: 'Đã nhập STL', text: `${parsed!.triangles.toLocaleString()} tam giác · đơn vị nguồn ${unit} → mm` });
          useStudio.getState().requestView('fit');
          onClose();
        }}>Thêm vào scene</button>
      </>}>
      <div
        className={`dropzone${over ? ' over' : ''}`}
        role="button" tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) void pick(f); }}
      >
        <FileUp size={26} />
        <p><b>Kéo thả tệp STL</b> hoặc bấm để chọn</p>
        <p className="hint">Binary hoặc ASCII · tối đa {CAPABILITIES.maxUploadMiB} MiB · {CAPABILITIES.maxSceneTriangles.toLocaleString()} tam giác. OBJ / GLB / 3MF / SVG: V2.</p>
        <input ref={inputRef} type="file" accept=".stl,model/stl" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); }} />
      </div>
      {busy && <Alert kind="info" title="Đang phân tích tệp…">Kiểm tra nội dung và cấu trúc, không chỉ phần mở rộng.</Alert>}
      {error && <Alert kind="err" title="Không thể nhập">{error} Scene giữ nguyên.</Alert>}
      {parsed && (
        <>
          <span className="label" style={{ marginTop: 14 }}>Đơn vị của tệp (bắt buộc — STL không mang đơn vị)</span>
          <select className="text-input" value={unit} onChange={(e) => setUnit(e.target.value as ImportUnit)} aria-required>
            <option value="" disabled>Chọn đơn vị…</option>
            <option value="mm">Millimeter (mm)</option>
            <option value="cm">Centimeter (cm)</option>
            <option value="m">Meter (m)</option>
            <option value="inch">Inch (in) — 25.4 mm</option>
          </select>
          <label className="check"><input type="checkbox" checked={zUp} onChange={(e) => setZUp(e.target.checked)} /> Tệp dùng trục Z hướng lên (mặc định của slicer)</label>
          <dl className="kv" style={{ marginTop: 12 }}>
            <dt>Tệp</dt><dd>{file?.name} · {((file?.size ?? 0) / 1024).toFixed(0)} KB</dd>
            <dt>Tam giác</dt><dd>{parsed.triangles.toLocaleString()}</dd>
            <dt>Kích thước sau nhập</dt><dd>{dims ? `${dims.x.toFixed(2)} × ${dims.y.toFixed(2)} × ${dims.z.toFixed(2)} mm` : 'Chọn đơn vị để xem'}</dd>
            <dt>Source hash</dt><dd className="mono">{parsed.sourceHash}</dd>
          </dl>
          {!unit && <Alert kind="warn" title="Chưa xác nhận đơn vị">Không thể thêm vào scene khi chưa chọn đơn vị.</Alert>}
        </>
      )}
    </Modal>
  );
}

/* ---------------- Export ---------------- */
function ExportModal({ onClose }: { onClose: () => void }) {
  const nodes = useStudio((s) => s.nodes);
  const name = useStudio((s) => s.projectName);
  const meshes = nodes.filter((n) => n.kind !== 'group');
  const [chosen, setChosen] = useState<Set<string>>(new Set(printableNodes(nodes).map((n) => n.id)));
  const [error, setError] = useState<string | null>(null);
  const report = useMemo(() => runPrintCheck(nodes.map((n) => ({ ...n, includedForPrint: chosen.has(n.id) }))), [nodes, chosen]);
  const open = report.items.find((i) => i.id === 'boundary' && i.level !== 'PASS');

  return (
    <Modal title="Xuất STL" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Hủy</button>
        <button className="btn primary" disabled={!chosen.size} onClick={() => {
          try {
            const r = exportStl(nodes, [...chosen]);
            download(r.blob, `${name.replace(/[^\p{L}\p{N}_-]+/gu, '_')}.stl`);
            useStudio.getState().toast({ kind: 'success', title: 'Đã xuất STL', text: `${r.triangles.toLocaleString()} tam giác · ${r.size.x.toFixed(2)} × ${r.size.y.toFixed(2)} × ${r.size.z.toFixed(2)} mm` });
            onClose();
          } catch (e) { setError((e as Error).message); }
        }}>Tải STL (mm)</button>
      </>}>
      <span className="label">Chọn node để xuất (bake world transform, không tự union shell)</span>
      <div className="check-list" style={{ maxHeight: 220, overflowY: 'auto' }}>
        {meshes.map((n) => (
          <label key={n.id} className="check-row" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={chosen.has(n.id)} onChange={() => setChosen((c) => { const x = new Set(c); if (x.has(n.id)) x.delete(n.id); else x.add(n.id); return x; })} />
            <span className="t"><b>{n.name}</b><span>{n.kind}{!n.visible ? ' · đang ẩn' : ''}</span></span>
          </label>
        ))}
      </div>
      <dl className="kv" style={{ marginTop: 12 }}>
        <dt>Đơn vị</dt><dd>mm (trục Z hướng lên)</dd>
        <dt>Kích thước</dt><dd>{report.dims.map((d) => d.toFixed(2)).join(' × ')} mm</dd>
        <dt>Tam giác</dt><dd>{report.triangles.toLocaleString()}</dd>
      </dl>
      <Alert kind="info" title="STL không mang màu/vật liệu">Appearance hiển thị sẽ bị bỏ khi xuất.</Alert>
      {open && <Alert kind="warn" title="Mesh hở">{open.detail}. Vẫn có thể xuất để chỉnh sửa ở công cụ khác.</Alert>}
      {error && <Alert kind="err" title="Không thể xuất">{error}</Alert>}
    </Modal>
  );
}

/* ---------------- Printability check ---------------- */
function ReportList({ report, onPick }: { report: PrintReport; onPick?: (ids: string[]) => void }) {
  return (
    <div className="check-list">
      {report.items.map((it) => (
        <div key={it.id} className={`check-row${it.nodeIds?.length && onPick ? ' clickable' : ''}`} onClick={() => it.nodeIds?.length && onPick?.(it.nodeIds)}>
          <span className="lvl"><LevelBadge level={it.level} /></span>
          <span className="t"><b>{it.label}</b><span>{it.detail}{it.nodeIds?.length && onPick ? ' · bấm để highlight' : ''}</span></span>
        </div>
      ))}
    </div>
  );
}

function CheckModal({ onClose }: { onClose: () => void }) {
  const nodes = useStudio((s) => s.nodes);
  const report = useMemo(() => runPrintCheck(nodes), [nodes]);
  useEffect(() => { useStudio.getState().setReport(report); }, [report]);
  return (
    <Modal title="Kiểm tra khả năng in" wide onClose={onClose} badge={<LevelBadge level={report.overall} />}
      footer={<>
        <button className="btn" onClick={onClose}>Đóng · sửa mô hình</button>
        <button className="btn primary" disabled={report.overall === 'BLOCK'} title={report.overall === 'BLOCK' ? 'Sửa lỗi BLOCK trước' : ''}
          onClick={() => useStudio.getState().setModal('send')}><Printer size={14} /> Tiếp tục đặt in</button>
      </>}>
      <dl className="kv" style={{ marginBottom: 12 }}>
        <dt>Kích thước tổng</dt><dd>{report.dims.map((d) => d.toFixed(2)).join(' × ')} mm</dd>
        <dt>Phần · shell</dt><dd>{report.parts} phần · {report.shells} shell</dd>
        <dt>Engine · mesh hash</dt><dd className="mono">{report.engine} · {report.sceneHash.slice(0, 12)}</dd>
      </dl>
      <ReportList report={report} onPick={(ids) => { useStudio.setState({ selection: ids }); }} />
      <Alert kind="info" title="Chỉ là sàng lọc">Kiểm tra trên trình duyệt không chứng nhận in được. Staff POD thẩm định, slicing và báo giá. Chỉnh mesh làm báo cáo STALE.</Alert>
    </Modal>
  );
}

/* ---------------- Snapshot + send ---------------- */
type Step = 'prepare' | 'snapshot' | 'form' | 'receipt';

function SendModal({ onClose }: { onClose: () => void }) {
  const nodes = useStudio((s) => s.nodes);
  const saveState = useStudio((s) => s.saveState);
  const revision = useStudio((s) => s.revision);
  const st = useStudio.getState;
  const [step, setStep] = useState<Step>('prepare');
  const [ack, setAck] = useState(false);
  const [dimsOk, setDimsOk] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [progress, setProgress] = useState(0);
  const [thumb, setThumb] = useState<string | null>(null);
  const [qty, setQty] = useState('1');
  const [tech, setTech] = useState('');
  const [mat, setMat] = useState('');
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<PrintRequestReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idemKey = useRef(uid('idem')); // one key per intentional submission; retries reuse it
  const frozen = useRef<SceneNode[] | null>(null);
  const report = useMemo(() => (step === 'prepare' ? runPrintCheck(nodes) : null), [nodes, step]);
  useEffect(() => { if (report) st().setReport(report); }, [report]);
  const dirty = saveState !== 'clean';
  const blocked = report?.overall === 'BLOCK';
  const needsAck = report?.items.some((i) => i.level === 'WARNING' || i.level === 'UNKNOWN');
  const prevRequests = useStudio((s) => s.requests.length);

  const createSnapshot = async () => {
    frozen.current = structuredClone(nodes);
    const r = report!;
    const s: Snapshot = {
      id: `S-${String(st().snapshots.length + 1).padStart(3, '0')}`, revision, meshHash: r.sceneHash, dims: r.dims, parts: r.parts,
      triangles: r.triangles, state: 'CREATING', createdAt: new Date().toISOString(),
      acknowledgedWarnings: r.items.filter((i) => i.level === 'WARNING' || i.level === 'UNKNOWN').map((i) => i.id), unit: 'mm', bytes: 0,
    };
    setSnap(s); setStep('snapshot'); setProgress(10);
    st().addSnapshot(s);
    try {
      const canvas = document.querySelector('.viewport canvas') as HTMLCanvasElement | null;
      setThumb(canvas?.toDataURL('image/png') ?? null);
      const stl = exportStl(frozen.current, printableNodes(frozen.current).map((n) => n.id));
      for (const p of [30, 55, 80]) { await new Promise((r) => setTimeout(r, 280)); setProgress(p); }
      st().updateSnapshot(s.id, { state: 'VALIDATING', bytes: stl.blob.size });
      setSnap((x) => x && { ...x, state: 'VALIDATING', bytes: stl.blob.size });
      await new Promise((r) => setTimeout(r, 400));
      // verify checksum of frozen geometry matches the report the user reviewed
      const verify = runPrintCheck(frozen.current);
      if (verify.sceneHash !== r.sceneHash || verify.overall === 'BLOCK') throw new Error('Hash mismatch hoặc BLOCK khi xác minh');
      st().updateSnapshot(s.id, { state: 'READY' });
      setSnap((x) => x && { ...x, state: 'READY' });
      setProgress(100);
      setTimeout(() => setStep('form'), 350);
    } catch (e) {
      st().updateSnapshot(s.id, { state: 'FAILED' });
      setSnap((x) => x && { ...x, state: 'FAILED' });
      setError((e as Error).message);
    }
  };

  const qtyNum = Number(qty);
  const qtyErr = !Number.isInteger(qtyNum) || qtyNum < POD_CATALOG.quantity.min || qtyNum > POD_CATALOG.quantity.max ? `Số nguyên ${POD_CATALOG.quantity.min}–${POD_CATALOG.quantity.max}` : null;
  const canSubmit = snap?.state === 'READY' && !qtyErr && tech && mat && consent && note.length <= 2000 && !submitting;

  const submit = async () => {
    if (!snap) return;
    setSubmitting(true); setError(null);
    try {
      const r = await st().submitPrintRequest({ snapshotId: snap.id, idempotencyKey: idemKey.current, quantity: qtyNum, technology: tech, material: mat, note });
      st().updateSnapshot(snap.id, { consentVersion: CAPABILITIES.consentVersion });
      setReceipt(r); setStep('receipt');
    } catch (e) {
      setError(`${(e as Error).message}. Đang xác minh kết quả — thử lại sẽ dùng cùng khóa, không tạo yêu cầu trùng.`);
    } finally { setSubmitting(false); }
  };

  const title = step === 'receipt' ? 'Đã gửi yêu cầu in' : step === 'form' ? 'Gửi yêu cầu in mới' : step === 'snapshot' ? 'Tạo snapshot' : 'Chuẩn bị gửi in';

  return (
    <Modal title={title} wide onClose={onClose} badge={step === 'prepare' && report ? <LevelBadge level={report.overall} /> : snap ? <span className={`badge ${snap.state === 'READY' ? 'ok' : snap.state === 'FAILED' ? 'err' : 'brand'}`}>{snap.id} · {snap.state}</span> : null}
      footer={
        step === 'prepare' ? <>
          <button className="btn" onClick={onClose}>Hủy</button>
          <button className="btn primary" disabled={dirty || blocked || (needsAck && !ack) || !dimsOk} onClick={() => void createSnapshot()}>Tạo snapshot</button>
        </> : step === 'snapshot' ? <>
          {snap?.state === 'FAILED' && <button className="btn primary" onClick={() => { setError(null); setStep('prepare'); }}>Thử lại (snapshot mới)</button>}
          <button className="btn" onClick={onClose}>Đóng</button>
        </> : step === 'form' ? <>
          <button className="btn" onClick={onClose}>Hủy</button>
          <button className="btn primary" disabled={!canSubmit} onClick={() => void submit()}>
            {submitting ? <><Loader2 size={14} /> Đang gửi…</> : 'Gửi yêu cầu'}
          </button>
        </> : <button className="btn primary" onClick={onClose}>Xong</button>
      }>
      {step === 'prepare' && report && (
        <>
          {dirty && (
            <Alert kind="warn" title="Cần lưu trước khi tạo snapshot">
              Snapshot đóng băng một revision đã lưu. <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => void st().save()}>Lưu ngay</button>
            </Alert>
          )}
          {prevRequests > 0 && <Alert kind="info" title="Lần gửi mới tạo PrintRequest mới">Tệp của các yêu cầu trước không thay đổi. Hủy yêu cầu cũ thực hiện trong POD.</Alert>}
          <dl className="kv" style={{ margin: '12px 0' }}>
            <dt>Revision</dt><dd>r{revision}{dirty ? ' (có thay đổi chưa lưu)' : ''}</dd>
            <dt>Tập gửi in</dt><dd>{report.parts} phần · {report.triangles.toLocaleString()} tam giác</dd>
            <dt>Kích thước tổng</dt><dd><b>{report.dims.map((d) => d.toFixed(2)).join(' × ')} mm</b></dd>
          </dl>
          <ReportList report={report} />
          {blocked && <Alert kind="err" title="Có lỗi BLOCK">Sửa các mục BLOCK trước khi gửi.</Alert>}
          {needsAck && !blocked && (
            <label className="check" style={{ marginTop: 12 }}><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> Tôi đã xem các mục WARNING/UNKNOWN và đồng ý chuyển staff POD thẩm định.</label>
          )}
          <label className="check"><input type="checkbox" checked={dimsOk} onChange={(e) => setDimsOk(e.target.checked)} /> Tôi xác nhận đơn vị mm và kích thước tổng {report.dims.map((d) => d.toFixed(1)).join(' × ')} mm. Studio không tự co giãn.</label>
        </>
      )}
      {step === 'snapshot' && snap && (
        <>
          <p>Đóng băng revision r{snap.revision}, mesh đã bake (mm), hash, kích thước và báo cáo kiểm tra.</p>
          <div className="steps">
            {(['CREATING', 'VALIDATING', 'READY'] as const).map((s, i) => {
              const order = ['CREATING', 'VALIDATING', 'READY'];
              const cur = order.indexOf(snap.state);
              return <div key={s} className={`step${snap.state === 'FAILED' ? '' : i < cur || snap.state === 'READY' ? ' done' : i === cur ? ' current' : ''}`}><b>{s}</b>{i === 0 ? 'Upload tệp' : i === 1 ? 'Kiểm checksum/manifest' : 'Bất biến'}</div>;
            })}
          </div>
          <div className="progress"><div style={{ width: `${progress}%` }} /></div>
          {error && <Alert kind="err" title="Snapshot FAILED">{error}. Không tạo PrintRequest.</Alert>}
          <p className="hint">Bạn có thể tiếp tục sửa scene — snapshot vẫn trỏ revision đã chọn.</p>
        </>
      )}
      {step === 'form' && snap && (
        <>
          <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
            {thumb && <img src={thumb} alt="Thumbnail snapshot" style={{ width: 180, height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />}
            <dl className="kv" style={{ flex: 1 }}>
              <dt>Snapshot</dt><dd>{snap.id} · READY</dd>
              <dt>Revision</dt><dd>r{snap.revision}</dd>
              <dt>Mesh hash</dt><dd className="mono">{snap.meshHash.slice(0, 12)}…</dd>
              <dt>Kích thước</dt><dd>{snap.dims.map((d) => d.toFixed(2)).join(' × ')} mm</dd>
              <dt>Tệp</dt><dd>{(snap.bytes / 1024).toFixed(0)} KB · STL · mm</dd>
            </dl>
          </div>
          <div className="grid3" style={{ marginTop: 12 }}>
            <div>
              <span className="label">Số lượng</span>
              <input className="text-input" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} aria-invalid={!!qtyErr} />
              {qtyErr && <div className="err-text">{qtyErr}</div>}
            </div>
            <div>
              <span className="label">Công nghệ (từ POD)</span>
              <select className="text-input" value={tech} onChange={(e) => { setTech(e.target.value); setMat(''); }}>
                <option value="" disabled>Chọn…</option>
                {POD_CATALOG.technologies.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <span className="label">Vật liệu (từ POD)</span>
              <select className="text-input" value={mat} disabled={!tech} onChange={(e) => setMat(e.target.value)}>
                <option value="" disabled>Chọn…</option>
                {POD_CATALOG.materials.filter((m) => m.tech === tech).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <span className="label">Ghi chú cho staff</span>
          <textarea className="text-input" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder="Yêu cầu màu, hoàn thiện, thời gian…" />
          <p className="hint">{note.length}/2000 ký tự</p>
          <label className="check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Tôi đồng ý điều khoản dịch vụ in ({CAPABILITIES.consentVersion}) và cho phép 3DWorld xử lý tệp snapshot này.</label>
          <Alert kind="info" title="Chưa phải đơn hàng">Staff review → báo giá → bạn chấp nhận → thanh toán 100% → sản xuất. Studio không tính giá chính thức.</Alert>
          {error && <Alert kind="err" title="Gửi chưa xác nhận">{error}</Alert>}
        </>
      )}
      {step === 'receipt' && receipt && (
        <>
          <Alert kind="ok" title={`PrintRequest ${receipt.id} đã được tạo`}>Chờ nhân viên POD duyệt. Bạn sẽ nhận báo giá trong module POD.</Alert>
          <dl className="kv" style={{ marginTop: 12 }}>
            <dt>Snapshot</dt><dd>{receipt.snapshotId}</dd>
            <dt>Số lượng</dt><dd>{receipt.quantity}</dd>
            <dt>Idempotency key</dt><dd className="mono">{receipt.idempotencyKey}</dd>
            <dt>Tạo lúc</dt><dd>{new Date(receipt.createdAt).toLocaleString('vi-VN')}</dd>
          </dl>
          <p className="hint"><CheckCircle2 size={12} /> Theo dõi trạng thái ở panel bên phải khi không chọn đối tượng.</p>
        </>
      )}
    </Modal>
  );
}

/* ---------------- Help ---------------- */
const SHORTCUTS: [string, string][] = [
  ['V / G / R / S', 'Chọn / Di chuyển / Xoay / Tỷ lệ'], ['M', 'Đo khoảng cách'], ['F', 'Fit selection / scene'],
  ['Ctrl + Z', 'Hoàn tác'], ['Ctrl + Shift + Z / Ctrl + Y', 'Làm lại'], ['Ctrl + S', 'Lưu'], ['Ctrl + D', 'Nhân bản'],
  ['Ctrl + G', 'Group'], ['Ctrl + Shift + G', 'Ungroup'], ['Delete', 'Xóa'], ['H', 'Ẩn/hiện'], ['L', 'Khóa/mở khóa'],
  ['Ctrl + A', 'Chọn tất cả'], ['Esc', 'Hủy thao tác / bỏ chọn'], ['1 / 3 / 7 / 0', 'Front / Right / Top / Perspective'],
  ['Shift + kéo', 'Pan camera'],
];

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Phím tắt & trợ giúp" onClose={onClose}>
      <dl className="kv">{SHORTCUTS.map(([k, v]) => <Fragment key={k}><dt><kbd className="k">{k}</kbd></dt><dd>{v}</dd></Fragment>)}</dl>
      <p className="hint" style={{ marginTop: 12 }}>Phím tắt không chạy khi đang nhập trong ô văn bản.</p>
      <button className="btn sm" style={{ marginTop: 8 }} onClick={() => useStudio.getState().setModal('onboarding')}>Xem lại hướng dẫn nhanh</button>
    </Modal>
  );
}

const ONBOARD = [
  { t: 'Tạo tự do. Thiết kế chính xác.', d: 'Thêm hình khối, chữ 3D hoặc hình 2D đùn từ thanh công cụ. Mọi kích thước tính bằng mm.' },
  { t: 'Chỉnh bằng gizmo hoặc nhập số', d: 'Kéo mũi tên để di chuyển (G), xoay (R), tỷ lệ (S); hoặc nhập vị trí/kích thước ở Inspector bên phải.' },
  { t: 'Kiểm tra rồi đặt in', d: 'Bấm Kiểm tra để sàng lọc mesh, sau đó Đặt in 3D để tạo snapshot và gửi yêu cầu cho staff POD.' },
];

function OnboardingModal({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const close = () => { try { localStorage.setItem('3dw.onboarded', '1'); } catch { /* ignore */ } onClose(); };
  return (
    <Modal title="Chào mừng đến 3DWorld Studio" onClose={close}
      footer={<>
        <button className="btn ghost" onClick={close}>Bỏ qua</button>
        {i > 0 && <button className="btn" onClick={() => setI(i - 1)}>Trước</button>}
        {i < ONBOARD.length - 1 ? <button className="btn primary" onClick={() => setI(i + 1)}>Tiếp</button> : <button className="btn primary" onClick={close}>Bắt đầu</button>}
      </>}>
      <span className="badge brand">Bước {i + 1}/{ONBOARD.length}</span>
      <h3 style={{ font: '700 20px var(--font-head)', margin: '12px 0 6px' }}>{ONBOARD[i].t}</h3>
      <p style={{ color: 'var(--text-2)', margin: 0 }}>{ONBOARD[i].d}</p>
    </Modal>
  );
}

export default function Modals() {
  const modal = useStudio((s) => s.modal);
  const close = () => useStudio.getState().setModal(null);
  if (modal === 'import') return <ImportModal onClose={close} />;
  if (modal === 'export') return <ExportModal onClose={close} />;
  if (modal === 'check') return <CheckModal onClose={close} />;
  if (modal === 'send') return <SendModal onClose={close} />;
  if (modal === 'shortcuts') return <ShortcutsModal onClose={close} />;
  if (modal === 'onboarding') return <OnboardingModal onClose={close} />;
  return null;
}

void THREE;
