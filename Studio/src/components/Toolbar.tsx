import {
  Box, Circle, Cone, Cylinder, Focus, Group, Hexagon, Magnet, MousePointer2, Move3d, Rotate3d, Ruler, Scale3d, Square, Type, Ungroup, Donut, Home,
} from 'lucide-react';
import { useStudio, type Tool } from '../store';
import type { NodeKind } from '../types';

const TOOLS: { id: Tool; label: string; key: string; icon: typeof Move3d }[] = [
  { id: 'select', label: 'Chọn', key: 'V', icon: MousePointer2 },
  { id: 'move', label: 'Di chuyển', key: 'G', icon: Move3d },
  { id: 'rotate', label: 'Xoay', key: 'R', icon: Rotate3d },
  { id: 'scale', label: 'Tỷ lệ', key: 'S', icon: Scale3d },
  { id: 'measure', label: 'Đo', key: 'M', icon: Ruler },
];

const SHAPES: { kind: NodeKind; label: string; tip: string; icon: typeof Box }[] = [
  { kind: 'box', label: 'Hộp', tip: 'Cube · W/H/D', icon: Box },
  { kind: 'sphere', label: 'Cầu', tip: 'Sphere · radius/segments', icon: Circle },
  { kind: 'cylinder', label: 'Trụ', tip: 'Cylinder · radius/height/segments', icon: Cylinder },
  { kind: 'cone', label: 'Nón', tip: 'Cone · radius/height', icon: Cone },
  { kind: 'torus', label: 'Xuyến', tip: 'Torus · radius/tube', icon: Donut },
  { kind: 'plane', label: 'Mặt phẳng', tip: 'Plane · không có thể tích', icon: Square },
  { kind: 'text', label: 'Chữ 3D', tip: 'Text · font/cỡ chữ/độ đùn', icon: Type },
  { kind: 'extrude', label: 'Hình 2D', tip: 'Rectangle/Circle/Polygon + extrude', icon: Hexagon },
];

export default function Toolbar() {
  const tool = useStudio((s) => s.tool);
  const selection = useStudio((s) => s.selection);
  const nodes = useStudio((s) => s.nodes);
  const space = useStudio((s) => s.space);
  const grid = useStudio((s) => s.grid);
  const projection = useStudio((s) => s.projection);
  const st = useStudio.getState;
  const hasGroup = selection.some((id) => nodes.find((n) => n.id === id)?.kind === 'group');

  return (
    <div className="toolbar" role="toolbar" aria-label="Modeling toolbar">
      {TOOLS.map((t) => (
        <button key={t.id} className={`btn sm tool-btn${tool === t.id ? ' active' : ''}`} onClick={() => st().setTool(t.id)} title={`${t.label} (${t.key})`} aria-pressed={tool === t.id}>
          <t.icon size={14} /> {t.label} <kbd>{t.key}</kbd>
        </button>
      ))}
      <span className="tool-sep" />
      {SHAPES.map((s) => (
        <button key={s.kind} className="btn sm" onClick={() => st().addNode(s.kind)} title={`Thêm ${s.tip}`}>
          <s.icon size={14} /> {s.label}
        </button>
      ))}
      <span className="tool-sep" />
      <button className="btn sm" disabled={!selection.length} onClick={() => st().groupSelected()} title={selection.length ? 'Group (Ctrl+G)' : 'Chọn ít nhất 1 đối tượng'}><Group size={14} /> Group</button>
      <button className="btn sm" disabled={!hasGroup} onClick={() => st().ungroupSelected()} title={hasGroup ? 'Ungroup (Ctrl+Shift+G)' : 'Chọn một group'}><Ungroup size={14} /> Ungroup</button>
      <span className="tool-sep" />
      <div className="segmented" role="group" aria-label="Không gian biến đổi">
        <button className={space === 'world' ? 'on' : ''} onClick={() => st().setSpace('world')}>Global</button>
        <button className={space === 'local' ? 'on' : ''} onClick={() => st().setSpace('local')}>Local</button>
      </div>
      <button className={`btn sm${grid.snap ? ' active' : ''}`} onClick={() => st().setGrid({ snap: !grid.snap })} title="Bật/tắt snap" aria-pressed={grid.snap}>
        <Magnet size={14} /> Snap {grid.size} mm · {grid.angle}°
      </button>
      <span className="tool-sep" />
      <div className="segmented" role="group" aria-label="Góc nhìn">
        {(['perspective', 'top', 'front', 'right'] as const).map((v) => (
          <button key={v} onClick={() => st().requestView(v)}>{v === 'perspective' ? 'Perspective' : v === 'top' ? 'Top' : v === 'front' ? 'Front' : 'Right'}</button>
        ))}
      </div>
      <div className="segmented" role="group" aria-label="Phép chiếu">
        <button className={projection === 'perspective' ? 'on' : ''} onClick={() => st().setProjection('perspective')}>Phối cảnh</button>
        <button className={projection === 'orthographic' ? 'on' : ''} onClick={() => st().setProjection('orthographic')}>Trực giao</button>
      </div>
      <button className="btn sm icon" onClick={() => st().requestView('fit')} title="Fit selection/scene (F)" aria-label="Fit"><Focus size={14} /></button>
      <button className="btn sm icon" onClick={() => st().requestView('home')} title="Góc nhìn mặc định" aria-label="Home"><Home size={14} /></button>
    </div>
  );
}
