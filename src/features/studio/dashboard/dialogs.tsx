import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert, Modal } from '../components/ui';
import { createProject, deleteProject, renameProject, validateProjectName, type ProjectMeta } from '../projects';
import { TEMPLATES } from '../scene';
import { CAPABILITIES } from '../config';

export const PRESETS = [
  { id: '', label: 'Không dùng preset' },
  { id: 'small', label: 'Sản phẩm nhỏ · 200 × 200 mm' },
  { id: 'medium', label: 'Sản phẩm vừa · 300 × 300 mm' },
];

/* DASH-04 */
export function CreateProjectDialog({ onClose, onCreated, initialTemplate }: {
  onClose: () => void; onCreated: (p: ProjectMeta) => void; initialTemplate?: string;
}) {
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [mode, setMode] = useState<'blank' | 'template'>(initialTemplate ? 'template' : 'blank');
  const [templateId, setTemplateId] = useState(initialTemplate ?? '');
  const [preset, setPreset] = useState('small');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameErr = validateProjectName(name);
  const tplErr = mode === 'template' && !templateId ? 'Chọn một mẫu để bắt đầu.' : null;
  const invalid = !!nameErr || !!tplErr;

  const submit = async () => {
    setTouched(true);
    if (invalid || busy) return;
    setBusy(true); setError(null);
    try {
      const p = await createProject({ name, templateId: mode === 'template' ? templateId : undefined, preset: preset || undefined });
      onCreated(p);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };

  return (
    <Modal title="Tạo dự án" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Hủy</button>
        <button className={`btn${invalid ? '' : ' primary'}`} disabled={busy} onClick={() => void submit()}>
          {busy ? <><Loader2 size={14} className="spin" /> Đang tạo…</> : 'Tạo dự án'}
        </button>
      </>}>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <label className="label" htmlFor="new-name">Tên dự án</label>
        <input id="new-name" className={`text-input${touched && nameErr ? ' invalid' : ''}`} value={name} maxLength={CAPABILITIES.maxProjectNameChars + 20}
          aria-invalid={touched && !!nameErr} aria-describedby="new-name-err" placeholder="Ví dụ: Móc khóa tên An"
          onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} />
        {touched && nameErr && <div id="new-name-err" className="err-text" role="alert">{nameErr}</div>}

        <div className="row" style={{ marginTop: 14 }} role="radiogroup" aria-label="Khởi tạo">
          <button type="button" role="radio" aria-checked={mode === 'blank'} className={`btn${mode === 'blank' ? ' active' : ''}`} onClick={() => setMode('blank')}>Trống</button>
          <button type="button" role="radio" aria-checked={mode === 'template'} className={`btn${mode === 'template' ? ' active' : ''}`} onClick={() => setMode('template')}>Từ mẫu</button>
        </div>
        {mode === 'template' && (
          <>
            <label className="label" htmlFor="new-tpl">Mẫu</label>
            <select id="new-tpl" className="text-input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="" disabled>Chọn mẫu…</option>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.dims}</option>)}
            </select>
            {touched && tplErr && <div className="err-text">{tplErr}</div>}
          </>
        )}
        <label className="label" htmlFor="new-unit">Đơn vị</label>
        <select id="new-unit" className="text-input" value="mm" disabled title="Geometry nội bộ luôn dùng mm (BR-07)">
          <option value="mm">Millimeters (mm)</option>
        </select>
        <label className="label" htmlFor="new-preset">Workspace preset (tùy chọn)</label>
        <select id="new-preset" className="text-input" value={preset} onChange={(e) => setPreset(e.target.value)}>
          {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <p className="hint">Không suy ra build volume của máy in thực tế.</p>
        {error && <Alert kind="err" title="Chưa tạo được dự án">{error}</Alert>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/* DASH-07 rename */
export function RenameDialog({ project, onClose, onDone }: { project: ProjectMeta; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(project.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const err = validateProjectName(name);
  const submit = async () => {
    if (err || busy) return;
    if (name.trim() === project.name) { onClose(); return; }
    setBusy(true);
    try { await renameProject(project.id, name); onDone(); } catch (e) { setError((e as Error).message); setBusy(false); }
  };
  return (
    <Modal title="Đổi tên dự án" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Hủy</button>
        <button className="btn primary" disabled={!!err || busy} onClick={() => void submit()}>{busy ? 'Đang lưu…' : 'Lưu tên'}</button>
      </>}>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <label className="label" htmlFor="rename">Tên dự án</label>
        <input id="rename" className={`text-input${err ? ' invalid' : ''}`} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!err}
          onFocus={(e) => e.target.select()} />
        {err && <div className="err-text" role="alert">{err}</div>}
        {error && <Alert kind="err" title="Chưa đổi được tên">{error}</Alert>}
      </form>
    </Modal>
  );
}

/* DASH-08 delete: confirm → deleting → failure (retry) */
export function DeleteDialog({ project, onClose, onDeleted }: { project: ProjectMeta; onClose: () => void; onDeleted: () => void }) {
  const [state, setState] = useState<'confirm' | 'deleting' | 'failed'>('confirm');
  const run = async () => {
    setState('deleting');
    try { await deleteProject(project.id); onDeleted(); } catch { setState('failed'); }
  };
  const updated = new Date(project.updatedAt);
  const isToday = updated.toDateString() === new Date().toDateString();
  const when = `${isToday ? 'Hôm nay' : updated.toLocaleDateString('vi-VN')} · ${updated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  const title = state === 'deleting' ? 'Đang xóa dự án…' : state === 'failed' ? 'Chưa thể xóa dự án' : `Xóa “${project.name}”?`;
  return (
    <Modal title={title} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Hủy</button>
        {state === 'deleting'
          ? <button className="btn" disabled><Loader2 size={14} className="spin" /> Đang xóa…</button>
          : <button className="btn danger-fill" onClick={() => void run()}>{state === 'failed' ? 'Thử lại' : 'Xóa dự án'}</button>}
      </>}>
      <p style={{ marginTop: 0, color: 'var(--text-2)' }}>Xóa dự án này khỏi danh sách của bạn. Snapshot đã gửi POD và lịch sử yêu cầu không bị thay đổi.</p>
      <dl className="kv" style={{ marginTop: 18 }}>
        <dt>Dự án</dt><dd>{project.name}</dd>
        <dt>Lần cập nhật</dt><dd>{when}</dd>
        <dt>Ảnh hưởng</dt><dd>Không thể hoàn tác thao tác xóa</dd>
      </dl>
      {state === 'deleting' && <Alert kind="info" title="Đang xử lý">Không gửi lại thao tác trong khi đang chờ phản hồi.</Alert>}
      {state === 'failed' && <Alert kind="err" title="Không thể kết nối">Dự án chưa bị xóa. Thử lại hoặc hủy để quay về danh sách.</Alert>}
    </Modal>
  );
}
