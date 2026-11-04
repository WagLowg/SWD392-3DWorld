import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Box as BoxI, Circle, Cylinder, Cone, Torus, Square, Type, Save, Undo2, Redo2, ShieldCheck, Download, Upload, Grid3x3, Eye, LayoutTemplate, FolderOpen, Plus, Sparkles, Store, Home, Keyboard, Copy, Trash2 } from 'lucide-react';
import { CommandPalette, useCommandPalette, type Command } from '../../shared/ui/CommandPalette';
import { TEMPLATES } from './lib/scene';
import type { NodeKind } from './types';
import { href, navigate, useRoute } from './router';
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
import StudioSidebar from './components/StudioSidebar';
import StudioGlobalHeader from './components/StudioGlobalHeader';

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
      if (k === 'x') s.setView({ xray: !s.view.xray });
      if (k === 'e') s.setView({ explode: s.view.explode > 0 ? 0 : 0.6 });
      if (k === 'b') s.setView({ bed: s.view.bed ? null : 'ender' });
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
  if (found === null) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: '#55556a' }}>Đang mở dự án…</div>;
  return (
    <>
      <div className="studio-editor-shell">
        <StudioGlobalHeader />
        <StudioSidebar active="projects" compact />
        <div className="app">
          <TopBar />
          <Toolbar />
          <LeftPanel />
          <main className="viewport" aria-label="Viewport 3D"><Viewport /></main>
          <Inspector />
          <StatusBar />
        </div>
      </div>
      <div className="mobile-block">
        <div>
          <Monitor size={32} color="var(--st-primary)" />
          <h2>Studio cần màn hình desktop</h2>
          <p>Trình chỉnh sửa 3D hỗ trợ desktop từ 1280 × 720 trên Chrome/Edge. Trên thiết bị di động bạn chỉ có thể xem thông báo này; dữ liệu đã lưu không bị ảnh hưởng.</p>
        </div>
      </div>
      <Modals />
      <Toasts />
    </>
  );
}

/**
 * Lỗi bất ngờ khi dựng giao diện (vd. dữ liệu dự án hỏng) không được làm trắng cả trang:
 * hiện thông báo kèm nút quay lại; đổi route (resetKey) thì thử dựng lại.
 */
class StudioErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('3D Studio gặp lỗi khi hiển thị', error); }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="dash-state" style={{ height: '100vh' }}>
        <h3>Không hiển thị được trang này</h3>
        <p>Dữ liệu dự án có thể bị lỗi. Các dự án khác của bạn không bị ảnh hưởng.</p>
        <a className="btn primary" href={href({ name: 'projects' })}>Về Dự án của tôi</a>
      </div>
    );
  }
}

/** Mở hộp thoại tạo dự án ở trang chủ (từ thanh lệnh, kể cả khi đang ở trình chỉnh sửa). */
function requestNewProject(templateId?: string) {
  const fire = () => window.dispatchEvent(new CustomEvent('3dw:studio-new-project', { detail: templateId }));
  if (parseHashName() === 'studio') { navigate({ name: 'welcome' }); setTimeout(fire, 150); } else fire();
}
const parseHashName = () => (location.hash.replace(/^#\/?/, '').split('/')[0] || 'welcome');

/** Thanh lệnh Ctrl/⌘+K của 3D Studio: điều hướng, tạo từ mẫu, và (trong editor) thao tác dựng hình. */
function StudioCommands({ inEditor }: { inEditor: boolean }) {
  const palette = useCommandPalette();
  const commands = useMemo<Command[]>(() => {
    const s = () => useStudio.getState();
    const shape = (kind: NodeKind, label: string, icon: ReactNode, keywords: string): Command =>
      ({ id: `add-${kind}`, group: 'Thêm hình', label: `Thêm ${label}`, icon, keywords, run: () => { s().addNode(kind); } });
    const editor: Command[] = inEditor ? [
      shape('box', 'hộp', <BoxI size={16} />, 'cube box'),
      shape('sphere', 'khối cầu', <Circle size={16} />, 'sphere ball'),
      shape('cylinder', 'khối trụ', <Cylinder size={16} />, 'cylinder'),
      shape('cone', 'khối nón', <Cone size={16} />, 'cone'),
      shape('torus', 'vòng xuyến', <Torus size={16} />, 'torus ring'),
      shape('plane', 'mặt phẳng', <Square size={16} />, 'plane'),
      shape('text', 'chữ 3D', <Type size={16} />, 'text chu'),
      { id: 'save', group: 'Dự án', label: 'Lưu dự án', icon: <Save size={16} />, shortcut: 'Ctrl S', keywords: 'save', run: () => { void s().save(); } },
      { id: 'undo', group: 'Dự án', label: 'Hoàn tác', icon: <Undo2 size={16} />, shortcut: 'Ctrl Z', keywords: 'undo', run: () => s().undo() },
      { id: 'redo', group: 'Dự án', label: 'Làm lại', icon: <Redo2 size={16} />, shortcut: 'Ctrl Y', keywords: 'redo', run: () => s().redo() },
      { id: 'check', group: 'Dự án', label: 'Kiểm tra khả năng in', icon: <ShieldCheck size={16} />, keywords: 'check print validate', run: () => s().setModal('check') },
      { id: 'export', group: 'Dự án', label: 'Xuất STL', icon: <Download size={16} />, keywords: 'export download stl', run: () => s().setModal('export') },
      { id: 'import', group: 'Dự án', label: 'Nhập tệp STL', icon: <Upload size={16} />, keywords: 'import upload stl', run: () => s().setModal('import') },
      { id: 'dup', group: 'Chỉnh sửa', label: 'Nhân bản đối tượng đang chọn', icon: <Copy size={16} />, shortcut: 'Ctrl D', keywords: 'duplicate copy', run: () => s().duplicateSelected() },
      { id: 'del', group: 'Chỉnh sửa', label: 'Xóa đối tượng đang chọn', icon: <Trash2 size={16} />, shortcut: 'Del', keywords: 'delete remove', run: () => s().deleteSelected() },
      { id: 'all', group: 'Chỉnh sửa', label: 'Chọn tất cả', icon: <BoxI size={16} />, shortcut: 'Ctrl A', keywords: 'select all', run: () => s().selectAll() },
      { id: 'grid', group: 'Góc nhìn', label: 'Bật / tắt lưới', icon: <Grid3x3 size={16} />, keywords: 'grid', run: () => s().setGrid({ show: !s().grid.show }) },
      { id: 'v-fit', group: 'Góc nhìn', label: 'Vừa khung tất cả', icon: <Eye size={16} />, keywords: 'fit zoom', run: () => s().requestView('fit') },
      { id: 'v-top', group: 'Góc nhìn', label: 'Nhìn từ trên', icon: <Eye size={16} />, keywords: 'top view', run: () => s().requestView('top') },
      { id: 'v-front', group: 'Góc nhìn', label: 'Nhìn chính diện', icon: <Eye size={16} />, keywords: 'front view', run: () => s().requestView('front') },
      { id: 'v-right', group: 'Góc nhìn', label: 'Nhìn bên phải', icon: <Eye size={16} />, keywords: 'right view', run: () => s().requestView('right') },
      { id: 'keys', group: 'Trợ giúp', label: 'Phím tắt & trợ giúp', icon: <Keyboard size={16} />, keywords: 'shortcut help', run: () => s().setModal('shortcuts') },
    ] : [];
    return [
      ...editor,
      { id: 'new', group: 'Tạo mới', label: 'Dự án trống', icon: <Plus size={16} />, keywords: 'new project tao moi', run: () => requestNewProject() },
      ...TEMPLATES.map<Command>((t) => ({ id: `tpl-${t.id}`, group: 'Tạo từ mẫu', label: t.name, hint: t.desc, icon: <LayoutTemplate size={16} />, keywords: `template mau ${t.category}`, run: () => navigate({ name: 'template', id: t.id }) })),
      { id: 'go-projects', group: 'Đi tới', label: 'Dự án của tôi', icon: <FolderOpen size={16} />, keywords: 'projects', run: () => navigate({ name: 'projects' }) },
      { id: 'go-templates', group: 'Đi tới', label: 'Thư viện mẫu', icon: <LayoutTemplate size={16} />, keywords: 'templates', run: () => navigate({ name: 'templates' }) },
      { id: 'mod-ai', group: 'Chuyển module', label: 'AI Studio', hint: 'Ảnh / mô tả → mô hình 3D', icon: <Sparkles size={16} />, keywords: 'ai', run: () => { window.location.href = '/ai/'; } },
      { id: 'mod-market', group: 'Chuyển module', label: 'Marketplace', icon: <Store size={16} />, keywords: 'shop cho', run: () => { window.location.href = '/marketplace/'; } },
      { id: 'mod-home', group: 'Chuyển module', label: 'Trang chủ 3DWorld', icon: <Home size={16} />, keywords: 'landing home', run: () => { window.location.href = '/'; } },
    ];
  }, [inEditor]);
  return <CommandPalette open={palette.open} onClose={() => palette.setOpen(false)} commands={commands} accent="#16a37b"
    placeholder={inEditor ? 'Thêm hình, lưu, kiểm tra in, đổi góc nhìn…' : 'Tạo dự án, mở mẫu, chuyển trang…'} />;
}

export default function App() {
  const route = useRoute();
  const key = route.name === 'studio' ? `studio:${route.id}` : route.name === 'template' ? `template:${route.id}` : route.name;
  return (
    <>
      <StudioErrorBoundary resetKey={key}>
        <div className="route-fade" key={route.name === 'studio' ? 'studio' : route.name}>
          {route.name === 'studio' ? <StudioPage key={route.id} projectId={route.id} /> : <Dashboard route={route} />}
        </div>
      </StudioErrorBoundary>
      <StudioCommands inEditor={route.name === 'studio'} />
    </>
  );
}
