import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Camera, Layers, Printer, ScanEye, Scissors, Sparkles } from 'lucide-react';
import { PRINT_BEDS, useStudio } from '../store';
import { worldBox } from '../lib/geometry';

/** Khung bao (thế giới) của mọi đối tượng gốc đang hiện. */
export function useSceneBox() {
  const nodes = useStudio((s) => s.nodes);
  return useMemo(() => {
    const ids = nodes.filter((n) => !n.parentId && n.visible).map((n) => n.id);
    return ids.length ? worldBox(ids, nodes) : new THREE.Box3();
  }, [nodes]);
}

type Fit = { state: 'ok' | 'offset' | 'big' | 'empty'; text: string };

/** Scene có nằm gọn trong bàn in không: vừa / lệch khỏi bàn / quá khổ. */
function bedFit(box: THREE.Box3, bedId: string | null): Fit | null {
  const bed = PRINT_BEDS.find((b) => b.id === bedId);
  if (!bed) return null;
  if (box.isEmpty()) return { state: 'empty', text: 'Scene trống' };
  const [w, d, h] = bed.size;
  const size = box.getSize(new THREE.Vector3());
  const eps = 0.01;
  if (size.x > w + eps || size.z > d + eps || size.y > h + eps) {
    const k = Math.min(w / size.x, d / size.z, h / size.y);
    return { state: 'big', text: `Quá khổ · cần thu nhỏ còn ${Math.floor(k * 100)}%` };
  }
  const inside = box.min.x >= -w / 2 - eps && box.max.x <= w / 2 + eps && box.min.z >= -d / 2 - eps && box.max.z <= d / 2 + eps
    && box.min.y >= -eps && box.max.y <= h + eps;
  return inside ? { state: 'ok', text: 'Vừa bàn in ✓' } : { state: 'offset', text: 'Lệch khỏi bàn in · đưa về giữa' };
}

const FIT_COLOR = { ok: '#16a37b', offset: '#d98a00', big: '#cc2f45', empty: '#838a9a' } as const;

/** Khối thể tích in của máy in đã chọn: viền hộp + mặt bàn, đổi màu theo độ vừa. */
export function BedVolume() {
  const bedId = useStudio((s) => s.view.bed);
  const box = useSceneBox();
  const bed = PRINT_BEDS.find((b) => b.id === bedId);
  const fit = bedFit(box, bedId);
  const edges = useMemo(() => {
    if (!bed) return null;
    const [w, d, h] = bed.size;
    const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
    g.translate(0, h / 2, 0);
    return g;
  }, [bed]);
  if (!bed || !edges || !fit) return null;
  const [w, d, h] = bed.size;
  const color = FIT_COLOR[fit.state];
  return (
    <group>
      <lineSegments geometry={edges} raycast={() => null}>
        <lineBasicMaterial color={color} transparent opacity={0.75} />
      </lineSegments>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} raycast={() => null}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color={color} transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <Html position={[-w / 2, h, -d / 2]} zIndexRange={[5, 0]} style={{ transform: 'translate(0, -120%)' }}>
        <div className="dim-label" style={{ borderColor: color, color }}>{bed.label} · {w}×{d}×{h} mm · {fit.text}</div>
      </Html>
    </group>
  );
}

/** Mặt phẳng cắt hiển thị ở độ cao đang cắt. */
export function SectionCap() {
  const section = useStudio((s) => s.view.section);
  const box = useSceneBox();
  if (section === null || box.isEmpty()) return null;
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  const y = box.min.y + size.y * section;
  const w = Math.max(size.x, 10) * 1.25;
  const d = Math.max(size.z, 10) * 1.25;
  return (
    <group position={[c.x, y, c.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color="#7955ff" transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <edgesGeometry args={[new THREE.PlaneGeometry(w, d)]} />
        <lineBasicMaterial color="#7955ff" />
      </lineSegments>
      <Html position={[w / 2, 0, d / 2]} zIndexRange={[5, 0]}>
        <div className="dim-label measure">Mặt cắt · Y = {y.toFixed(1)} mm</div>
      </Html>
    </group>
  );
}

/** Chụp viewport thành PNG, kèm nền sáng của Studio (canvas WebGL trong suốt). */
function snapshot(name: string) {
  const src = document.querySelector<HTMLCanvasElement>('main.viewport canvas');
  if (!src) return false;
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d');
  if (!ctx) return false;
  const g = ctx.createLinearGradient(0, 0, 0, out.height);
  g.addColorStop(0, '#f3fbf7');
  g.addColorStop(1, '#dff3ea');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, 0, 0);
  const fs = Math.max(12, Math.round(out.height * 0.022));
  ctx.font = `600 ${fs}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(32,32,39,.45)';
  ctx.fillText('3DWorld · 3D Studio', out.width - fs, out.height - fs);
  const a = document.createElement('a');
  a.href = out.toDataURL('image/png');
  a.download = `${name || 'scene'}.png`;
  a.click();
  return true;
}

/** Bảng nổi góc trên-trái viewport: X-ray, mặt cắt, tách rời, bàn in, chụp ảnh. */
export default function ViewPanel() {
  const view = useStudio((s) => s.view);
  const rootCount = useStudio((s) => s.nodes.filter((n) => !n.parentId && n.visible).length);
  const box = useSceneBox();
  const fit = bedFit(box, view.bed);
  const st = useStudio.getState;
  return (
    <div className="view-panel" role="toolbar" aria-label="Tùy chọn hiển thị">
      <button className={`vp-chip${view.xray ? ' on' : ''}`} aria-pressed={view.xray} title="Nhìn xuyên vật thể (X)" onClick={() => st().setView({ xray: !view.xray })}>
        <ScanEye size={14} />X-ray
      </button>

      <div className={`vp-group${view.section !== null ? ' open' : ''}`}>
        <button className={`vp-chip${view.section !== null ? ' on' : ''}`} aria-pressed={view.section !== null} title="Mặt cắt ngang để xem bên trong"
          onClick={() => st().setView({ section: view.section === null ? 0.5 : null })}>
          <Scissors size={14} />Mặt cắt
        </button>
        {view.section !== null && (
          <input type="range" min={0} max={1} step={0.01} value={view.section} aria-label="Độ cao mặt cắt"
            onChange={(e) => st().setView({ section: Number(e.target.value) })} />
        )}
      </div>

      <div className={`vp-group${view.explode > 0 ? ' open' : ''}`}>
        <button className={`vp-chip${view.explode > 0 ? ' on' : ''}`} aria-pressed={view.explode > 0} disabled={rootCount < 2}
          title={rootCount < 2 ? 'Cần ít nhất 2 đối tượng' : 'Tách rời các đối tượng để xem cấu trúc (E)'}
          onClick={() => st().setView({ explode: view.explode > 0 ? 0 : 0.6 })}>
          <Layers size={14} />Tách rời
        </button>
        {view.explode > 0 && (
          <input type="range" min={0.05} max={1} step={0.01} value={view.explode} aria-label="Mức tách rời"
            onChange={(e) => st().setView({ explode: Number(e.target.value) })} />
        )}
      </div>

      <div className={`vp-group${view.bed ? ' open' : ''}`}>
        <button className={`vp-chip${view.bed ? ' on' : ''}`} aria-pressed={!!view.bed} title="Hiện khối thể tích máy in (B)"
          onClick={() => st().setView({ bed: view.bed ? null : 'ender' })}>
          <Printer size={14} />Bàn in
        </button>
        {view.bed && (
          <select value={view.bed} aria-label="Máy in" onChange={(e) => st().setView({ bed: e.target.value })}>
            {PRINT_BEDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        )}
        {fit && <span className={`vp-fit ${fit.state}`}>{fit.text}</span>}
      </div>

      <button className="vp-chip" title="Chụp ảnh viewport (PNG)"
        onClick={() => {
          const ok = snapshot(st().projectName);
          st().toast(ok ? { kind: 'success', title: 'Đã chụp ảnh viewport', text: 'Ảnh PNG đã được tải xuống.' } : { kind: 'error', title: 'Không chụp được ảnh' });
        }}>
        <Camera size={14} />Chụp
      </button>
      {view.explode > 0 && <span className="vp-hint"><Sparkles size={12} />Chỉ là chế độ xem — vị trí thật không đổi</span>}
    </div>
  );
}
