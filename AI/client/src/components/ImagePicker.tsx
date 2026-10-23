import { useEffect, useRef, useState } from 'react';
import { UploadCloud, Plus, X, ImageIcon } from 'lucide-react';
import type { SourceImage } from '../lib/api';
import { bytes } from '../lib/format';
import { Progress } from './ui';
import { useToast } from '../lib/app-state';

const MAX = 20 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const VIEW_LABELS = ['Trước', 'Sau', 'Trái', 'Phải'];

/** Upload qua XHR để có tiến trình (fetch không hỗ trợ upload progress). */
function uploadFile(file: File, onProgress: (p: number) => void): Promise<SourceImage> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/ai-studio/uploads');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data: { image?: SourceImage; error?: { message: string } } = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300 && data.image) resolve(data.image);
      else reject(new Error(data.error?.message || `Tải ảnh thất bại (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Mất kết nối khi tải ảnh. Vui lòng thử lại.'));
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}

function validate(file: File) {
  if (!TYPES.includes(file.type)) return 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.';
  if (file.size > MAX) return `Ảnh ${bytes(file.size)} vượt quá giới hạn 20 MB.`;
  return null;
}

export function useUploader() {
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const toast = useToast();
  const upload = async (file: File): Promise<SourceImage | null> => {
    const err = validate(file);
    if (err) { toast('error', 'Ảnh không hợp lệ', err); return null; }
    setProgress({ name: file.name, pct: 0 });
    try {
      return await uploadFile(file, (pct) => setProgress({ name: file.name, pct }));
    } catch (e) {
      toast('error', 'Không tải được ảnh', (e as Error).message);
      return null;
    } finally {
      setProgress(null);
    }
  };
  return { upload, progress };
}

function DropZone({ onFile, compact }: { onFile: (f: File) => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      className={`drop${over ? ' over' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
    >
      <UploadCloud className="ico" size={compact ? 22 : 26} />
      <p>Kéo thả ảnh vào đây</p>
      <small>JPG, PNG, WEBP · tối đa 20 MB</small>
      {!compact && <div style={{ marginTop: 10 }}><span className="btn sm">Chọn tệp</span></div>}
      {!compact && <small style={{ display: 'block', marginTop: 8 }}>hoặc dán ảnh bằng Ctrl + V</small>}
      <input ref={input} type="file" accept={TYPES.join(',')} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
}

export function ImagePicker({ mode, images, onChange, recent, disabled }: {
  mode: 'single' | 'multi';
  images: (SourceImage | null)[];
  onChange: (imgs: (SourceImage | null)[]) => void;
  recent: SourceImage[];
  disabled?: boolean;
}) {
  const { upload, progress } = useUploader();
  const slotInput = useRef<HTMLInputElement>(null);
  const [slotTarget, setSlotTarget] = useState(0);
  const imgsRef = useRef(images);
  imgsRef.current = images;

  const put = async (file: File, slot: number) => {
    const img = await upload(file);
    if (!img) return;
    const next = [...imgsRef.current];
    next[slot] = img;
    onChange(next);
  };
  const firstEmpty = () => { const i = images.findIndex((x) => !x); return i < 0 ? 0 : i; };

  // Dán ảnh từ clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (disabled) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
      if (f) { e.preventDefault(); put(f, mode === 'single' ? 0 : firstEmpty()); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const main = images[0];
  return (
    <div className="stack">
      {mode === 'single' ? (
        main ? (
          <div className="stack" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="label-up">Ảnh tham chiếu</span>
              <button className="btn ghost sm" style={{ color: 'var(--primary)', padding: 0, height: 'auto' }} onClick={() => { setSlotTarget(0); slotInput.current?.click(); }} disabled={disabled}>Thay ảnh</button>
            </div>
            <img className="ref-img" src={main.url} alt={main.name} />
            <div className="row small"><span className="muted grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{main.name}</span><span className="tabular">{main.width} × {main.height}</span></div>
            <div className="row">
              <button className="btn sm" onClick={() => onChange([null, null, null, null])} disabled={disabled}>Xóa</button>
              <span className="muted small">{bytes(main.sizeBytes)}</span>
            </div>
          </div>
        ) : (
          <DropZone onFile={(f) => put(f, 0)} />
        )
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          <span className="label-up">Góc nhìn Multi-View (1–4 ảnh)</span>
          <div className="slots">
            {VIEW_LABELS.map((lbl, i) => {
              const img = images[i];
              return (
                <div key={lbl} className="slot" role="button" tabIndex={0} aria-label={`Ảnh góc ${lbl}`}
                  onClick={() => { if (!disabled) { setSlotTarget(i); slotInput.current?.click(); } }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) put(f, i); }}>
                  {img ? <img src={img.url} alt={lbl} /> : <Plus size={20} />}
                  <span className="tag">{lbl}{i === 0 ? ' · chính' : ''}</span>
                  {img && !disabled && (
                    <button className="x" aria-label={`Xóa ảnh ${lbl}`} onClick={(e) => { e.stopPropagation(); const n = [...images]; n[i] = null; onChange(n); }}><X size={14} /></button>
                  )}
                </div>
              );
            })}
          </div>
          <span className="small" style={{ color: images[0] ? 'var(--muted)' : 'var(--warning)' }}>
            {images[0] ? 'Ảnh đầu tiên là góc nhìn chính. Các ảnh phải cùng một vật thể.' : '● Cần ảnh góc Trước (ảnh chính).'}
          </span>
        </div>
      )}
      <input ref={slotInput} type="file" accept={TYPES.join(',')} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) put(f, slotTarget); e.target.value = ''; }} />

      {progress && (
        <div className="stack" style={{ gap: 6 }}>
          <div className="row small"><span className="grow muted">{progress.name}</span><span>{progress.pct}%</span></div>
          <Progress value={progress.pct} />
        </div>
      )}

      {recent.length > 0 && !disabled && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="label-up">Ảnh gần đây</span>
          <div className="thumbs">
            {recent.slice(0, 8).map((r) => (
              <button key={r.id} title={r.name} onClick={() => {
                const n = [...images];
                n[mode === 'single' ? 0 : firstEmpty()] = r;
                onChange(n);
              }}>
                <img src={r.url} alt={r.name} loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
      {!main && mode === 'single' && recent.length === 0 && (
        <p className="muted small" style={{ margin: 0 }}><ImageIcon size={12} style={{ verticalAlign: -2 }} /> Mẹo: ảnh một vật thể rõ ràng, nền đơn giản, ánh sáng đều cho kết quả tốt nhất.</p>
      )}
    </div>
  );
}
