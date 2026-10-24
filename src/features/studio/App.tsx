import { useEffect, useState } from 'react';
import { href, useRoute } from './router';
import Dashboard from './dashboard/Dashboard';
import { Monitor } from 'lucide-react';
import { useStudio } from './store';
import { CAPABILITIES } from './config';
import TopBar from './components/TopBar';
import Toolbar from './components/Toolbar';
import LeftPanel from './components/LeftPanel';
import Inspector from './components/Inspector';
import Viewport from './components/Viewport';
import Modals from './components/Modals';
import { StatusBar, Toasts } from './components/StatusBar';

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStudio.getState();
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === 's') { e.preventDefault(); void s.save(); return; }
      if (isTyping(e) || s.modal) return;
      if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); s.undo(); return; }
      if (mod && ((k === 'z' && e.shiftKey) || k === 'y')) { e.preventDefault(); s.redo(); return; }
      if (mod && k === 'g') { e.preventDefault(); if (e.shiftKey) s.ungroupSelected(); else s.groupSelected(); return; }
      if (mod && k === 'd') { e.preventDefault(); s.duplicateSelected(); return; }
      if (mod && k === 'a') { e.preventDefault(); s.selectAll(); return; }
      if (mod) return;
      if (k === 'delete' || k === 'backspace') { s.deleteSelected(); return; }
      if (k === 'escape') { if (s.tool === 'measure' && s.measure.length) s.addMeasurePoint(null); else s.select(null); return; }
      if (k === 'v') s.setTool('select');
      if (k === 'g') s.setTool('move');
      if (k === 'r') s.setTool('rotate');
      if (k === 's') s.setTool('scale');
      if (k === 'm') s.setTool('measure');
      if (k === 'f') s.requestView('fit');
      if (k === 'h') s.selection.forEach((id) => s.toggleFlag(id, 'visible'));
      if (k === 'l') s.selection.forEach((id) => s.toggleFlag(id, 'locked'));
      if (k === '1') s.requestView('front');
      if (k === '3') s.requestView('right');
      if (k === '7') s.requestView('top');
      if (k === '0') s.requestView('perspective');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function useAutosave() {
  const lastEditAt = useStudio((s) => s.lastEditAt);
  const saveState = useStudio((s) => s.saveState);
  useEffect(() => {
    if (saveState !== 'dirty') return;
    const t = setTimeout(() => void useStudio.getState().save(), CAPABILITIES.autosaveDebounceSec * 1000);
    return () => clearTimeout(t);
  }, [lastEditAt, saveState]);
  useEffect(() => {
    const online = () => { if (useStudio.getState().saveState === 'offline') { useStudio.setState({ saveState: 'dirty' }); } };
    const offline = () => { if (useStudio.getState().saveState === 'dirty') useStudio.setState({ saveState: 'offline' }); };
    const beforeUnload = (e: BeforeUnloadEvent) => {
      const st = useStudio.getState().saveState;
      if (st !== 'clean') { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);
}

function StudioPage({ projectId }: { projectId: string }) {
  useShortcuts();
  useAutosave();
  const [found, setFound] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    setFound(null);
    useStudio.getState().init(projectId)
      .then((ok) => { if (alive) setFound(ok); })
      .catch(() => { if (alive) setFound(false); });
    return () => {
      alive = false;
      // leaving the editor: flush unsaved work so the dashboard shows the latest version
      const s = useStudio.getState();
      if (s.saveState === 'dirty' || s.saveState === 'offline') void s.save();
      s.leave();
    };
  }, [projectId]);
  if (found === false) {
    return (
      <div className="dash-state" style={{ height: '100vh' }}>
        <h3>Không tìm thấy dự án</h3>
        <p>Dự án không tồn tại hoặc bạn không có quyền truy cập.</p>
        <a className="btn primary" href={href({ name: 'projects' })}>Về Dự án của tôi</a>
      </div>
    );
  }
  if (found === null) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: '#a6adbc' }}>Đang mở dự án…</div>;
  return (
    <>
      <div className="app">
        <TopBar />
        <Toolbar />
        <LeftPanel />
        <main className="viewport" aria-label="Viewport 3D"><Viewport /></main>
        <Inspector />
        <StatusBar />
      </div>
      <div className="mobile-block">
        <div>
          <Monitor size={32} color="var(--primary)" />
          <h2>Studio cần màn hình desktop</h2>
          <p>Trình chỉnh sửa 3D hỗ trợ desktop từ 1280 × 720 trên Chrome/Edge. Trên thiết bị di động bạn chỉ có thể xem thông báo này; dữ liệu đã lưu không bị ảnh hưởng.</p>
        </div>
      </div>
      <Modals />
      <Toasts />
    </>
  );
}

export default function App() {
  const route = useRoute();
  if (route.name === 'studio') return <StudioPage key={route.id} projectId={route.id} />;
  return <Dashboard route={route} />;
}
