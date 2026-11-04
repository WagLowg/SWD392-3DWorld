import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Thanh lệnh nhanh (Ctrl/⌘ + K) dùng chung cho AI Studio và 3D Studio.
 * Tìm không dấu ("tao du an" khớp "Tạo dự án"), điều khiển bằng ↑ ↓ Enter Esc.
 * CSS tự chèn với tiền tố `cp-` và màu nhấn truyền vào, nên không phụ thuộc CSS của từng module.
 */
export type Command = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  icon?: ReactNode;
  /** Từ khóa thêm để tìm (vd. tiếng Anh) */
  keywords?: string;
  shortcut?: string;
  run: () => void;
};

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/**
 * Điểm khớp: mọi từ gõ vào phải xuất hiện; khớp trọn một từ của nhãn được ưu tiên hơn khớp đầu từ
 * (gõ "mo ta" → "Tạo mô hình từ mô tả" đứng trước "Tạo mô hình từ ảnh", dù "ta" cũng là đầu chữ "tạo").
 */
function score(cmd: Command, q: string) {
  if (!q.trim()) return 1;
  const hay = fold(`${cmd.label} ${cmd.group} ${cmd.keywords ?? ''} ${cmd.hint ?? ''}`);
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.every((w) => hay.includes(w))) return 0;
  const labelWords = fold(cmd.label).split(/[^a-z0-9]+/).filter(Boolean);
  let s = 1;
  for (const w of words) {
    if (labelWords.includes(w)) s += 3;
    else if (labelWords.some((lw) => lw.startsWith(w))) s += 1;
  }
  if (fold(cmd.label).includes(fold(q).trim())) s += 4;
  return s;
}

let styled = false;
function ensureStyles() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const el = document.createElement('style');
  el.textContent = `
.cp-backdrop{position:fixed;inset:0;z-index:2000;display:grid;align-items:start;justify-items:center;padding:12vh 16px 16px;background:rgba(32,32,39,.28);backdrop-filter:blur(6px);animation:cp-fade .15s ease}
.cp-scrim{position:absolute;inset:0;border:0;padding:0;background:transparent;cursor:default}
.cp-panel{position:relative;width:min(620px,100%);border-radius:24px;overflow:hidden;background:rgba(255,255,255,.92);border:1px solid #fff;box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 30px 80px -20px rgba(32,32,39,.45);backdrop-filter:blur(20px) saturate(1.4);animation:cp-pop .22s cubic-bezier(.2,.8,.2,1);font-family:'Plus Jakarta Sans','Inter',system-ui,sans-serif;color:#202027}
.cp-search{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid rgba(32,32,39,.08)}
.cp-search svg{flex:none;color:#55556a}
.cp-search input{flex:1;border:0;outline:0;background:transparent;font:500 16px/1.4 inherit;color:#202027}
.cp-search input::placeholder{color:#8a87a0}
.cp-kbd{font:600 11px 'Inter',sans-serif;color:#55556a;padding:3px 7px;border-radius:7px;background:rgba(32,32,39,.06);border:1px solid rgba(32,32,39,.08);white-space:nowrap}
.cp-list{max-height:min(52vh,440px);overflow-y:auto;padding:8px}
.cp-group{padding:10px 12px 6px;font:600 10px 'Inter',sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#8a87a0}
.cp-item{display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border:0;border-radius:14px;background:transparent;color:#202027;text-align:left;cursor:pointer;font:500 14px inherit}
.cp-item .cp-ico{width:32px;height:32px;flex:none;display:grid;place-items:center;border-radius:10px;background:rgba(32,32,39,.05);color:#55556a}
.cp-item .cp-text{flex:1;min-width:0}
.cp-item .cp-text b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-item .cp-text small{display:block;color:#6b6880;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-item[aria-selected="true"]{background:var(--cp-accent-soft);}
.cp-item[aria-selected="true"] .cp-ico{background:var(--cp-accent);color:#fff}
.cp-empty{padding:28px 16px;text-align:center;color:#6b6880;font-size:14px}
.cp-foot{display:flex;gap:14px;align-items:center;padding:10px 18px;border-top:1px solid rgba(32,32,39,.08);font-size:12px;color:#6b6880}
.cp-trigger{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 8px 0 12px;border-radius:999px;border:1px solid rgba(32,32,39,.1);background:rgba(255,255,255,.7);color:#55556a;font:500 13px 'Plus Jakarta Sans',sans-serif;cursor:pointer;transition:background .2s,box-shadow .2s}
.cp-trigger:hover{background:#fff;box-shadow:0 8px 18px -10px rgba(32,32,39,.35)}
@keyframes cp-fade{from{opacity:0}}
@keyframes cp-pop{from{opacity:0;transform:translateY(-8px) scale(.98)}}
@media (prefers-reduced-motion:reduce){.cp-backdrop,.cp-panel{animation:none}}
.cp-trigger span{white-space:nowrap}
@media (max-width:1280px){.cp-trigger span{display:none}.cp-trigger{padding:0 8px 0 10px}}`;
  document.head.appendChild(el);
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const PALETTE_SHORTCUT = isMac ? '⌘ K' : 'Ctrl K';

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
);

/** Nút mở thanh lệnh để đặt trên header (người dùng không biết phím tắt vẫn thấy). */
export function CommandTrigger({ onOpen }: { onOpen: () => void }) {
  ensureStyles();
  return (
    <button type="button" className="cp-trigger" onClick={onOpen} aria-label="Mở thanh lệnh nhanh" title={`Tìm nhanh (${PALETTE_SHORTCUT})`}>
      <SearchIcon /><span>Tìm nhanh</span><kbd className="cp-kbd">{PALETTE_SHORTCUT}</kbd>
    </button>
  );
}

/** Sự kiện để mở thanh lệnh từ nơi không giữ state của nó (vd. header dùng chung). */
export const OPEN_PALETTE_EVENT = '3dw:open-command-palette';
export const openCommandPalette = () => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));

/** Mở/đóng bằng Ctrl/⌘+K ở bất kỳ đâu trong trang, hoặc qua openCommandPalette(). */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(OPEN_PALETTE_EVENT, onOpen); };
  }, []);
  return { open, setOpen, openPalette: useCallback(() => setOpen(true), []) };
}

export function CommandPalette({ open, onClose, commands, accent = '#7955ff', placeholder = 'Bạn muốn làm gì? Gõ để tìm lệnh, trang, dự án…' }: {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  accent?: string;
  placeholder?: string;
}) {
  ensureStyles();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(0);
    // Focus sau khi khung hiện (thay cho autoFocus để trình đọc màn hình không bị nhảy đột ngột khi tải trang)
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const results = useMemo(() => {
    const scored = commands.map((c, i) => ({ c, s: score(c, q), i })).filter((x) => x.s > 0);
    if (q) scored.sort((a, b) => b.s - a.s || a.i - b.i);
    return scored.map((x) => x.c).slice(0, 40);
  }, [commands, q]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const run = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    // Chạy sau khi đóng để lệnh mở hộp thoại / điều hướng không bị khung lệnh che
    setTimeout(c.run, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  let lastGroup = '';
  return (
    <div className="cp-backdrop" style={{ ['--cp-accent' as string]: accent, ['--cp-accent-soft' as string]: `${accent}1f` }}>
      {/* Bấm ra ngoài khung = bấm nút đóng phủ toàn nền (thay vì gắn sự kiện vào thẻ div) */}
      <button type="button" className="cp-scrim" aria-label="Đóng thanh lệnh" tabIndex={-1} onClick={onClose} />
      <div className="cp-panel" role="dialog" aria-modal="true" aria-label="Thanh lệnh nhanh" onKeyDown={onKeyDown}>
        <div className="cp-search">
          <SearchIcon />
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} placeholder={placeholder}
            role="combobox" aria-expanded="true" aria-controls="cp-list" aria-activedescendant={results[active] ? `cp-${results[active].id}` : undefined} />
          <kbd className="cp-kbd">Esc</kbd>
        </div>
        <div className="cp-list" id="cp-list" role="listbox" ref={listRef}>
          {results.length === 0 && <div className="cp-empty">Không tìm thấy lệnh phù hợp với “{q}”.</div>}
          {results.map((c, i) => {
            const header = !q && c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {header && <div className="cp-group">{header}</div>}
                <button type="button" id={`cp-${c.id}`} data-idx={i} className="cp-item" role="option" aria-selected={i === active}
                  onMouseMove={() => setActive(i)} onClick={() => run(c)}>
                  <span className="cp-ico">{c.icon ?? '•'}</span>
                  <span className="cp-text"><b>{c.label}</b>{c.hint && <small>{c.hint}</small>}</span>
                  {c.shortcut && <kbd className="cp-kbd">{c.shortcut}</kbd>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="cp-foot"><span><kbd className="cp-kbd">↑</kbd> <kbd className="cp-kbd">↓</kbd> chọn</span><span><kbd className="cp-kbd">Enter</kbd> thực hiện</span><span><kbd className="cp-kbd">Esc</kbd> đóng</span></div>
      </div>
    </div>
  );
}
