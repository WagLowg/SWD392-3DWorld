import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useStudio } from '../store';
import { triangleCount } from '../geometry';
import { CAPABILITIES } from '../config';

export function StatusBar() {
  const nodes = useStudio((s) => s.nodes);
  const selection = useStudio((s) => s.selection);
  const tool = useStudio((s) => s.tool);
  const grid = useStudio((s) => s.grid);
  const projection = useStudio((s) => s.projection);
  const past = useStudio((s) => s.past.length);
  const tris = useMemo(() => nodes.reduce((a, n) => a + triangleCount(n), 0), [nodes]);
  const over = tris > CAPABILITIES.maxSceneTriangles;
  const toolHint: Record<string, string> = {
    select: 'Click chọn · Shift/Ctrl+click chọn nhiều',
    move: 'Kéo mũi tên gizmo để di chuyển',
    rotate: 'Kéo vòng gizmo để xoay',
    scale: 'Kéo khối gizmo để thay đổi tỷ lệ',
    measure: 'Click 2 điểm trên vật thể để đo · Esc để xóa',
  };
  return (
    <footer className="statusbar" aria-live="polite">
      <span>Đơn vị <b>mm</b></span>
      <span>Lưới <b>{grid.size} mm</b> · Snap <b>{grid.snap ? 'bật' : 'tắt'}</b></span>
      <span>Camera <b>{projection === 'perspective' ? 'Phối cảnh' : 'Trực giao'}</b></span>
      <span>Đã chọn <b>{selection.length}</b></span>
      <span>{toolHint[tool]}</span>
      <span className="sep" />
      <span>Lịch sử <b>{past}/{CAPABILITIES.undoCommands}</b></span>
      <span style={{ color: over ? 'var(--error)' : undefined }}>Tam giác <b>{tris.toLocaleString()}</b> / {CAPABILITIES.maxSceneTriangles.toLocaleString()}</span>
      <span>Node <b>{nodes.length}</b> / {CAPABILITIES.maxSceneNodes}</span>
    </footer>
  );
}

export function Toasts() {
  const toasts = useStudio((s) => s.toasts);
  const dismiss = useStudio((s) => s.dismissToast);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => {
        const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : t.kind === 'warning' ? TriangleAlert : Info;
        return (
          <div key={t.id} className={`toast ${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <Icon size={16} className="i" />
            <div><b>{t.title}</b>{t.text && <p>{t.text}</p>}</div>
            <button className="x" onClick={() => dismiss(t.id)} aria-label="Đóng thông báo"><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}
