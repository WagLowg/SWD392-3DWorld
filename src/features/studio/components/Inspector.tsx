import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import {
  AlignCenterHorizontal, AlignEndHorizontal, AlignStartHorizontal, ArrowLeftRight, Printer, RefreshCw, RotateCcw, ShieldCheck,
} from 'lucide-react';
import { useStudio } from '../store';
import { baseSize, buildGeometry, localSize, worldBox } from '../lib/geometry';
import { printableNodes, sceneHash } from '../lib/printCheck';
import { SWATCHES } from '../config';
import type { BoolOp } from '../lib/csg';
import type { NodeParams, SceneNode, Vec3, PodStage } from '../types';
import { Alert, LevelBadge, NumberField, fmtTime } from './ui';

const AX = ['x', 'y', 'z'] as const;

function TransformPanel({ node }: { node: SceneNode }) {
  const st = useStudio.getState;
  const disabled = node.locked;
  const set = (key: 'position' | 'rotation' | 'scale', i: number, v: number) => {
    const next = [...node[key]] as Vec3;
    next[i] = v;
    if (key === 'scale' && v === 0) return 'Scale 0 không hợp lệ';
    if (key === 'scale' && v < 0) return 'Scale âm chỉ qua Mirror';
    st().setTransform(node.id, { [key]: next });
    return null;
  };
  return (
    <section className="section">
      <h3>Transform <span className="grow" />
        <span className="badge plain" title="Giá trị nhập theo hệ toạ độ của node cha">{node.parentId ? 'Local · theo nhóm cha' : 'World'}</span>
      </h3>
      {disabled && <Alert kind="info" title="Node đang khóa">Mở khóa để chỉnh transform.</Alert>}
      <span className="label">Vị trí</span>
      <div className="grid3">{AX.map((a, i) => <NumberField key={a} axis={a} unit="mm" value={node.position[i]} disabled={disabled} onCommit={(v) => set('position', i, v)} label={`Vị trí ${a}`} />)}</div>
      <span className="label">Xoay</span>
      <div className="grid3">{AX.map((a, i) => <NumberField key={a} axis={a} unit="°" value={node.rotation[i]} disabled={disabled} onCommit={(v) => set('rotation', i, v)} label={`Xoay ${a}`} />)}</div>
      <span className="label">Tỷ lệ</span>
      <div className="grid3">{AX.map((a, i) => <NumberField key={a} axis={a} unit="×" value={node.scale[i]} disabled={disabled} decimals={3} onCommit={(v) => set('scale', i, v)} label={`Tỷ lệ ${a}`} />)}</div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn sm" disabled={disabled} onClick={() => st().setTransform(node.id, { rotation: [node.kind === 'plane' || node.kind === 'text' || node.kind === 'extrude' ? -90 : 0, 0, 0], scale: [1, 1, 1] })}>
          <RotateCcw size={13} /> Reset transform
        </button>
        <button className="btn sm" disabled={disabled} title="Mirror theo trục X (scale âm có kiểm soát)" onClick={() => st().setTransform(node.id, { scale: [-node.scale[0], node.scale[1], node.scale[2]] })}>
          <ArrowLeftRight size={13} /> Mirror X
        </button>
      </div>
    </section>
  );
}

function DimensionsPanel({ node }: { node: SceneNode }) {
  const lock = useStudio((s) => s.lockRatio);
  const st = useStudio.getState;
  const size = localSize(node);
  const base = baseSize(node);
  if (!size || !base) return null;
  const labels = ['Width X', 'Height Y', 'Depth Z'];
  const setDim = (i: number, v: number) => {
    if (v <= 0) return '≤ 0: không commit';
    if (base[i] < 1e-9) return 'Trục này không có độ dày';
    const sign = node.scale.map((s) => Math.sign(s) || 1);
    let scale: Vec3;
    if (lock) {
      const f = v / size[i];
      scale = node.scale.map((s) => s * f) as Vec3;
    } else {
      scale = [...node.scale] as Vec3;
      scale[i] = (v / base[i]) * sign[i];
    }
    st().setTransform(node.id, { scale });
    return null;
  };
  return (
    <section className="section">
      <h3>Kích thước</h3>
      {labels.map((l, i) => (
        <div key={l}>
          <span className="label">{l}</span>
          <NumberField value={size[i]} unit="mm" min={0} allowZero={false} disabled={node.locked || base[i] < 1e-9} onCommit={(v) => setDim(i, v)} label={l} />
        </div>
      ))}
      <label className="check"><input type="checkbox" checked={lock} onChange={(e) => st().setLockRatio(e.target.checked)} /> Khóa tỷ lệ</label>
      <p className="hint">Kích thước local (trước transform của nhóm cha). Hiển thị 2 số lẻ, không làm tròn dữ liệu.</p>
    </section>
  );
}

function GeometryPanel({ node }: { node: SceneNode }) {
  const st = useStudio.getState;
  const p = node.params;
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState(p.text ?? '');
  useEffect(() => { setText(p.text ?? ''); setErr(null); }, [node.id, p.text]);
  const upd = (patch: NodeParams) => { const e = st().updateParams(node.id, patch); setErr(e); return e; };
  const field = (label: string, key: keyof NodeParams, opts: { unit?: string; integer?: boolean; allowZero?: boolean } = {}) => (
    <div key={key}>
      <span className="label">{label}</span>
      <NumberField value={(p[key] as number) ?? 0} unit={opts.unit ?? 'mm'} integer={opts.integer} min={0} allowZero={opts.allowZero ?? false}
        disabled={node.locked} onCommit={(v) => upd({ [key]: v })} label={label} />
    </div>
  );
  const built = buildGeometry(node);
  let body: React.ReactNode = null;
  switch (node.kind) {
    case 'box': body = <div className="grid3">{field('Rộng', 'width')}{field('Cao', 'height')}{field('Sâu', 'depth')}</div>; break;
    case 'plane': body = <><div className="grid2">{field('Rộng', 'width')}{field('Dài', 'height')}</div><Alert kind="warn" title="Plane không có thể tích">Sẽ bị cảnh báo khi kiểm tra in.</Alert></>; break;
    case 'sphere': body = <div className="grid2">{field('Bán kính', 'radius')}{field('Segments', 'segments', { unit: '', integer: true })}</div>; break;
    case 'cylinder': case 'cone': body = <div className="grid3">{field('Bán kính', 'radius')}{field('Chiều cao', 'height')}{field('Segments', 'segments', { unit: '', integer: true })}</div>; break;
    case 'torus': body = <div className="grid3">{field('Bán kính', 'radius')}{field('Ống', 'tube')}{field('Segments', 'segments', { unit: '', integer: true })}</div>; break;
    case 'text':
      body = (
        <>
          <span className="label">Văn bản</span>
          <input className="text-input" value={text} maxLength={600} disabled={node.locked}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => { if (e.target.dataset.cancel) { delete e.target.dataset.cancel; return; } if (text !== p.text) { const r = upd({ text }); if (r) setText(p.text ?? ''); } }}
            onKeyDown={(e) => { const el = e.target as HTMLInputElement; if (e.key === 'Enter') el.blur(); if (e.key === 'Escape') { el.dataset.cancel = '1'; setText(p.text ?? ''); el.blur(); } }} />
          <p className="hint">{Array.from(text).length}/500 ký tự · Font: Be Vietnam Pro Bold (SIL OFL)</p>
          <div className="grid2">{field('Cỡ chữ', 'fontSize')}{field('Độ đùn', 'depth')}</div>
          {built && built.missing.length > 0 && <Alert kind="warn" title="Font thiếu glyph">Không hiển thị: {built.missing.join(' ')} — chữ không bị thay thế âm thầm.</Alert>}
        </>
      );
      break;
    case 'extrude':
      body = (
        <>
          <span className="label">Đường bao 2D</span>
          <div className="segmented">
            {(['rectangle', 'circle', 'polygon'] as const).map((sh) => (
              <button key={sh} className={p.profile === sh ? 'on' : ''} disabled={node.locked} onClick={() => upd({ profile: sh })}>
                {sh === 'rectangle' ? 'Chữ nhật' : sh === 'circle' ? 'Tròn' : 'Đa giác'}
              </button>
            ))}
          </div>
          {p.profile === 'rectangle' && <div className="grid3">{field('Rộng', 'width')}{field('Cao', 'height')}{field('Bo góc', 'cornerRadius', { allowZero: true })}</div>}
          {p.profile === 'circle' && <div className="grid2">{field('Bán kính', 'radius')}</div>}
          {p.profile === 'polygon' && <div className="grid2">{field('Bán kính', 'radius')}{field('Số cạnh', 'sides', { unit: '', integer: true })}</div>}
          <div className="grid3">{field('Độ đùn', 'depth')}{field('Lỗ Ø/2', 'holeRadius', { allowZero: true })}{field('Lỗ lệch X', 'holeOffsetX', { allowZero: true })}</div>
          <p className="hint">Đường bao kín, không tự giao; lỗ tròn xuyên qua mesh. Đùn theo trục Z local.</p>
        </>
      );
      break;
    case 'mesh':
      body = <dl className="kv"><dt>Tam giác</dt><dd>{built ? (built.geometry.getAttribute('position').count / 3).toLocaleString() : '—'}</dd><dt>Nguồn</dt><dd className="mono">{node.mesh?.provenance}</dd><dt>Source hash</dt><dd className="mono">{node.mesh?.sourceHash?.slice(0, 12)}</dd></dl>;
      break;
    default: return null;
  }
  return (
    <section className="section">
      <h3>Geometry</h3>
      {body}
      {err && <Alert kind="err" title="Không thể tạo geometry">{err}. Giữ nguyên giá trị trước.</Alert>}
    </section>
  );
}

function MaterialPanel({ node }: { node: SceneNode }) {
  const st = useStudio.getState;
  const [hex, setHex] = useState(node.appearance.color);
  useEffect(() => setHex(node.appearance.color), [node.appearance.color]);
  const setA = (patch: Partial<SceneNode['appearance']>) => st().updateNode(node.id, { appearance: { ...node.appearance, ...patch } }, 'Đổi appearance');
  return (
    <section className="section">
      <h3>Appearance</h3>
      <div className="row wrap">
        {SWATCHES.map((c) => (
          <button key={c} aria-label={`Màu ${c}`} title={c} onClick={() => setA({ color: c })}
            style={{ width: 28, height: 28, borderRadius: 14, background: c, cursor: 'pointer', border: node.appearance.color.toUpperCase() === c ? '2px solid var(--text)' : '2px solid transparent', outline: '1px solid var(--border)' }} />
        ))}
      </div>
      <span className="label">HEX</span>
      <input className="text-input" value={hex} onChange={(e) => setHex(e.target.value)}
        onBlur={() => { if (/^#[0-9a-f]{6}$/i.test(hex)) setA({ color: hex.toUpperCase() }); else setHex(node.appearance.color); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      <span className="label">Roughness · {node.appearance.roughness.toFixed(2)}</span>
      <input type="range" min={0} max={1} step={0.05} value={node.appearance.roughness} onChange={(e) => setA({ roughness: Number(e.target.value) })} />
      <span className="label">Metallic · {node.appearance.metalness.toFixed(2)}</span>
      <input type="range" min={0} max={1} step={0.05} value={node.appearance.metalness} onChange={(e) => setA({ metalness: Number(e.target.value) })} />
      <Alert kind="info" title="Chỉ vật liệu hiển thị">Không suy ra khả năng sản xuất hoặc màu in. STL không mang màu; vật liệu in chọn trong POD.</Alert>
    </section>
  );
}

function PrintFlags({ node }: { node: SceneNode }) {
  const st = useStudio.getState;
  return (
    <section className="section">
      <h3>Trạng thái</h3>
      <label className="check"><input type="checkbox" checked={node.includedForPrint} onChange={() => st().toggleFlag(node.id, 'includedForPrint')} /> Chọn để in (includedForPrint)</label>
      <label className="check"><input type="checkbox" checked={!node.visible} onChange={() => st().toggleFlag(node.id, 'visible')} /> Ẩn trong viewport</label>
      <label className="check"><input type="checkbox" checked={node.locked} onChange={() => st().toggleFlag(node.id, 'locked')} /> Khóa</label>
      <p className="hint">Ẩn chỉ là trạng thái trình bày — vật thể ẩn nhưng còn chọn in vẫn được gửi.</p>
    </section>
  );
}

function BooleanPanel({ ids }: { ids: string[] }) {
  const nodes = useStudio((s) => s.nodes);
  const st = useStudio.getState;
  const [op, setOp] = useState<BoolOp>('subtract');
  const [keep, setKeep] = useState(true);
  const [order, setOrder] = useState<string[]>(ids);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setOrder(ids); setError(null); }, [ids.join(',')]);
  const sel = order.map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as SceneNode[];
  const valid = sel.length === 2 && sel.every((n) => n.kind !== 'group');
  const reason = sel.length !== 2 ? 'Chọn đúng 2 đối tượng (Shift/Ctrl + click).' : !valid ? 'Group không phải union — chọn mesh bên trong.' : null;

  return (
    <section className="section">
      <h3>Boolean</h3>
      <div className="row">
        {(['union', 'subtract', 'intersect'] as const).map((o) => (
          <button key={o} className={`btn sm${op === o ? ' active' : ''}`} onClick={() => setOp(o)} aria-pressed={op === o}>
            {o === 'union' ? 'Union' : o === 'subtract' ? 'Subtract' : 'Intersect'}
          </button>
        ))}
      </div>
      {valid && (
        <div style={{ marginTop: 10 }}>
          <dl className="kv"><dt>A (base)</dt><dd>{sel[0].name}</dd><dt>B ({op === 'subtract' ? 'cutter' : 'operand'})</dt><dd>{sel[1].name}</dd></dl>
          <button className="btn sm" style={{ marginTop: 8 }} onClick={() => setOrder([order[1], order[0]])}><ArrowLeftRight size={13} /> Đổi A/B</button>
          {op === 'subtract' && <p className="hint">Kết quả = A trừ B. Thứ tự nguồn quan trọng.</p>}
        </div>
      )}
      <label className="check"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Giữ nguồn có thể chỉnh sửa (ẩn, bỏ chọn in)</label>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary sm" disabled={!valid || busy} onClick={() => {
          setBusy(true); setError(null);
          setTimeout(() => {
            const r = st().booleanOp(op, order[0], order[1], keep);
            setBusy(false);
            if (!r.ok) setError(r.error!); else st().toast({ kind: 'success', title: 'Boolean hoàn tất', text: 'Có thể hoàn tác bằng Ctrl+Z.' });
          }, 30);
        }}>{busy ? 'Đang xử lý…' : 'Áp dụng'}</button>
      </div>
      {reason && <Alert kind="warn" title="Không đủ đối tượng">{reason}</Alert>}
      {error && <Alert kind="err" title="Không thể thực hiện Boolean">{error}</Alert>}
    </section>
  );
}

function AlignPanel({ ids }: { ids: string[] }) {
  const st = useStudio.getState;
  return (
    <section className="section">
      <h3>Căn chỉnh & phân bố</h3>
      {(['X', 'Y', 'Z'] as const).map((a, i) => (
        <div className="row" key={a} style={{ marginBottom: 6 }}>
          <span style={{ width: 18, color: 'var(--text-2)' }}>{a}</span>
          <button className="btn sm icon" title={`Căn min ${a}`} onClick={() => st().align(i as 0 | 1 | 2, 'min')}><AlignStartHorizontal size={13} /></button>
          <button className="btn sm icon" title={`Căn giữa ${a}`} onClick={() => st().align(i as 0 | 1 | 2, 'center')}><AlignCenterHorizontal size={13} /></button>
          <button className="btn sm icon" title={`Căn max ${a}`} onClick={() => st().align(i as 0 | 1 | 2, 'max')}><AlignEndHorizontal size={13} /></button>
          <button className="btn sm" disabled={ids.length < 3} title={ids.length < 3 ? 'Cần ≥ 3 đối tượng' : `Phân bố đều theo ${a}`} onClick={() => st().distribute(i as 0 | 1 | 2)}>Phân bố</button>
        </div>
      ))}
    </section>
  );
}

const STAGES: { id: PodStage; label: string }[] = [
  { id: 'STAFF_REVIEW', label: 'Staff review' },
  { id: 'QUOTED', label: 'Báo giá' },
  { id: 'ACCEPTED', label: 'Khách chấp nhận' },
  { id: 'PAID_100', label: 'Thanh toán 100%' },
  { id: 'IN_PRODUCTION', label: 'Sản xuất' },
];

export function PodTracking() {
  const requests = useStudio((s) => s.requests);
  const st = useStudio.getState;
  if (!requests.length) return null;
  return (
    <section className="section">
      <h3>Theo dõi POD</h3>
      {requests.slice().reverse().map((r) => {
        const idx = STAGES.findIndex((s) => s.id === r.stage);
        return (
          <div key={r.id} className="asset-card">
            <div className="row"><b className="mono">{r.id}</b><span className="grow" style={{ flex: 1 }} /><span className="badge brand">Chờ nhân viên duyệt</span></div>
            <p className="hint">Snapshot {r.snapshotId} · SL {r.quantity} · cập nhật {fmtTime(r.observedAt)}</p>
            <div className="steps" style={{ margin: '8px 0' }}>
              {STAGES.map((s, i) => <div key={s.id} className={`step${i < idx ? ' done' : i === idx ? ' current' : ''}`} style={{ minWidth: 0, padding: '4px 6px' }}><b>{i + 1}</b>{s.label}</div>)}
            </div>
            <div className="row">
              <button className="btn sm" onClick={() => st().refreshRequest(r.id)}><RefreshCw size={12} /> Làm mới</button>
              <button className="btn sm" onClick={() => st().toast({ kind: 'info', title: 'Mở POD', text: 'Liên kết sâu tới module POD (môi trường demo chưa kết nối).' })}>Mở POD</button>
            </div>
          </div>
        );
      })}
      <p className="hint">Giá chính thức, chấp nhận báo giá và thanh toán 100% chỉ diễn ra trong POD. Studio chỉ đọc trạng thái.</p>
    </section>
  );
}

function ScenePanel() {
  const nodes = useStudio((s) => s.nodes);
  const grid = useStudio((s) => s.grid);
  const report = useStudio((s) => s.report);
  const snapshots = useStudio((s) => s.snapshots);
  const st = useStudio.getState;
  const printIds = useMemo(() => printableNodes(nodes).map((n) => n.id), [nodes]);
  const box = useMemo(() => worldBox(printIds, nodes), [printIds, nodes]);
  const size = new THREE.Vector3(); if (!box.isEmpty()) box.getSize(size);
  const stale = useMemo(() => (report ? report.sceneHash !== sceneHash(nodes) : false), [report, nodes]);
  const last = snapshots.filter((s) => s.state === 'READY').slice(-1)[0];
  const counts = report ? {
    block: report.items.filter((i) => i.level === 'BLOCK').length,
    warn: report.items.filter((i) => i.level === 'WARNING').length,
  } : null;

  return (
    <>
      <section className="section">
        <h3>Thông tin mô hình</h3>
        <dl className="kv">
          <dt>Kích thước in</dt><dd>{box.isEmpty() ? '—' : `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} mm`}</dd>
          <dt>Đối tượng</dt><dd>{nodes.filter((n) => n.kind !== 'group').length} editable · {printIds.length} chọn in</dd>
          <dt>Snapshot</dt><dd>{last ? `${last.id} · r${last.revision}` : 'Chưa có'}</dd>
          <dt>Sản xuất</dt><dd>Chọn sau trong POD</dd>
        </dl>
      </section>
      <section className="section">
        <h3>Kiểm tra in <span className="grow" />{report && <LevelBadge level={stale ? 'STALE' : report.overall} />}</h3>
        {!report && <p className="hint" style={{ marginTop: 0 }}>Chưa kiểm tra. Kiểm tra trình duyệt chỉ là sàng lọc, không chứng nhận in được.</p>}
        {report && counts && (
          <p className="hint" style={{ marginTop: 0 }}>
            {counts.block} BLOCK · {counts.warn} WARNING · {fmtTime(report.createdAt)}{stale ? ' · scene đã đổi, cần kiểm tra lại' : ''}
          </p>
        )}
        <div className="row">
          <button className="btn sm" onClick={() => st().setModal('check')}><ShieldCheck size={13} /> Kiểm tra</button>
          <button className="btn sm primary" onClick={() => st().setModal('send')}><Printer size={13} /> Đặt in 3D</button>
        </div>
      </section>
      <PodTracking />
      <section className="section">
        <h3>Lưới & snap</h3>
        <span className="label">Grid spacing</span>
        <NumberField value={grid.size} unit="mm" min={0} allowZero={false} onCommit={(v) => { st().setGrid({ size: v }); }} label="Grid spacing" />
        <span className="label">Rotation snap</span>
        <NumberField value={grid.angle} unit="°" integer min={0} allowZero={false} onCommit={(v) => { if (v > 180) return '≤ 180°'; st().setGrid({ angle: v }); }} label="Rotation snap" />
        <label className="check"><input type="checkbox" checked={grid.snap} onChange={(e) => st().setGrid({ snap: e.target.checked })} /> Snap position</label>
        <label className="check"><input type="checkbox" checked={grid.show} onChange={(e) => st().setGrid({ show: e.target.checked })} /> Hiện lưới</label>
        <button className="btn sm" style={{ marginTop: 10 }} onClick={() => st().setGrid({ size: 1, angle: 15, snap: true, show: true })}>Đặt lại</button>
      </section>
      <section className="section">
        <h3>Camera</h3>
        <dl className="kv">
          <dt>Orbit</dt><dd>Kéo chuột trái / phải</dd>
          <dt>Pan</dt><dd>Shift + kéo · chuột giữa</dd>
          <dt>Zoom</dt><dd>Con lăn</dd>
          <dt>Focus</dt><dd>F</dd>
        </dl>
      </section>
    </>
  );
}

export default function Inspector() {
  const nodes = useStudio((s) => s.nodes);
  const selection = useStudio((s) => s.selection);
  const sel = selection.map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as SceneNode[];

  return (
    <aside className="right" aria-label="Inspector">
      {sel.length === 0 && <ScenePanel />}
      {sel.length === 1 && (
        <>
          <section className="section">
            <h3>{sel[0].name}<span className="grow" /><span className="badge plain">{sel[0].kind}</span></h3>
            <p className="hint" style={{ marginTop: 0 }}>Đơn vị nội bộ: mm. Enter để commit, Esc trả giá trị trước.</p>
          </section>
          <TransformPanel node={sel[0]} />
          {sel[0].kind !== 'group' && <DimensionsPanel node={sel[0]} />}
          {sel[0].kind !== 'group' && <GeometryPanel node={sel[0]} />}
          {sel[0].kind !== 'group' && <MaterialPanel node={sel[0]} />}
          <PrintFlags node={sel[0]} />
        </>
      )}
      {sel.length > 1 && (
        <>
          <section className="section">
            <h3>{sel.length} đối tượng được chọn</h3>
            {(() => { const b = worldBox(selection, nodes); const s = new THREE.Vector3(); if (!b.isEmpty()) b.getSize(s); return <p className="hint" style={{ marginTop: 0 }}>Bounding box: {s.x.toFixed(2)} × {s.y.toFixed(2)} × {s.z.toFixed(2)} mm</p>; })()}
            <div className="row">
              <button className="btn sm" onClick={() => useStudio.getState().groupSelected()}>Group</button>
              <button className="btn sm" onClick={() => useStudio.getState().duplicateSelected()}>Nhân bản</button>
            </div>
          </section>
          <BooleanPanel ids={selection} />
          <AlignPanel ids={selection} />
        </>
      )}
    </aside>
  );
}
