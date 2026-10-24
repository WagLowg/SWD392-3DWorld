import { useEffect, useState } from 'react';
import {
  AlertCircle, Box, CheckCircle2, CircleHelp, Cloud, CloudOff, Download, Loader2, Lock, Printer, Redo2, Save, ShieldCheck, Undo2, Upload,
} from 'lucide-react';
import { useStudio } from '../store';
import { fmtTime } from './ui';

function AutosaveStatus() {
  const saveState = useStudio((s) => s.saveState);
  const lastSavedAt = useStudio((s) => s.lastSavedAt);
  const revision = useStudio((s) => s.revision);
  const saveError = useStudio((s) => s.saveError);
  const save = useStudio((s) => s.save);
  const reload = useStudio((s) => s.reloadFromServer);
  const copy = useStudio((s) => s.saveAsCopy);

  if (saveState === 'saving') return <span className="autosave" aria-live="polite"><Loader2 size={14} className="spin" /> Đang lưu…</span>;
  if (saveState === 'dirty') return <span className="autosave warn" aria-live="polite"><Cloud size={14} /> Thay đổi chưa lưu</span>;
  if (saveState === 'offline') return <span className="autosave warn" aria-live="polite"><CloudOff size={14} /> Offline · giữ phiên hiện tại</span>;
  if (saveState === 'error') {
    return (
      <span className="autosave err" role="alert" title={saveError ?? ''}>
        <AlertCircle size={14} /> Lưu lỗi · <button className="btn ghost sm" onClick={() => void save()}>Thử lại</button>
      </span>
    );
  }
  if (saveState === 'conflict') {
    return (
      <span className="autosave err" role="alert">
        <AlertCircle size={14} /> Xung đột revision
        <button className="btn sm" onClick={reload}>Tải lại</button>
        <button className="btn sm" onClick={copy}>Lưu bản sao</button>
      </span>
    );
  }
  return <span className="autosave ok" aria-live="polite"><CheckCircle2 size={14} /> Đã lưu · {fmtTime(lastSavedAt)} · r{revision}</span>;
}

export default function TopBar() {
  const name = useStudio((s) => s.projectName);
  const rename = useStudio((s) => s.rename);
  const past = useStudio((s) => s.past.length);
  const future = useStudio((s) => s.future.length);
  const [draft, setDraft] = useState(name);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setDraft(name), [name]);
  const s = useStudio.getState;

  return (
    <header className="topbar">
      <a className="brand" href="#/" title="Về trang chủ Studio"><Box size={22} color="var(--primary)" /> 3DWorld <small>STUDIO</small></a>
      <nav className="crumbs" aria-label="breadcrumb">
        <a href="#/projects" className="crumb-link">Dự án</a><span>/</span>
        <input
          aria-label="Tên dự án"
          value={draft}
          maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => {
            if (e.target.dataset.cancel) { delete e.target.dataset.cancel; return; }
            if (draft === name) return;
            const r = rename(draft); setErr(r); if (r) setDraft(name);
          }}
          onKeyDown={(e) => { const el = e.target as HTMLInputElement; if (e.key === 'Enter') el.blur(); if (e.key === 'Escape') { el.dataset.cancel = '1'; setDraft(name); el.blur(); } }}
          title={err ?? 'Đổi tên dự án (1–120 ký tự)'}
        />
        <span className="badge plain" title="Project mặc định riêng tư (BR-10)"><Lock size={11} /> Riêng tư</span>
      </nav>
      <div className="row">
        <button className="btn ghost icon" disabled={!past} onClick={() => s().undo()} title="Hoàn tác (Ctrl+Z)" aria-label="Hoàn tác"><Undo2 size={16} /></button>
        <button className="btn ghost icon" disabled={!future} onClick={() => s().redo()} title="Làm lại (Ctrl+Shift+Z)" aria-label="Làm lại"><Redo2 size={16} /></button>
      </div>
      <AutosaveStatus />
      <div className="grow" />
      <span className="badge brand">MVP</span>
      <button className="btn" onClick={() => s().setModal('import')} title="Nhập STL"><Upload size={14} /> Nhập</button>
      <button className="btn" onClick={() => s().setModal('export')} title="Xuất STL"><Download size={14} /> Xuất</button>
      <button className="btn" onClick={() => void s().save()} title="Lưu (Ctrl+S)"><Save size={14} /> Lưu</button>
      <button className="btn" onClick={() => s().setModal('check')} title="Kiểm tra khả năng in"><ShieldCheck size={14} /> Kiểm tra</button>
      <button className="btn primary" onClick={() => s().setModal('send')} title="Chuẩn bị gửi in"><Printer size={14} /> Đặt in 3D</button>
      <button className="btn ghost icon" onClick={() => s().setModal('shortcuts')} title="Phím tắt & trợ giúp" aria-label="Trợ giúp"><CircleHelp size={16} /></button>
    </header>
  );
}
