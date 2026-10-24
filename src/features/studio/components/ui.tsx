import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import type { CheckLevel } from '../types';

/** Numeric input: Enter/blur commits, Escape restores previous value, invalid values never commit. */
export function NumberField({
  value, onCommit, unit, axis, min, allowZero = true, integer, disabled, step, label, decimals = 2,
}: {
  value: number; onCommit: (v: number) => string | null | void; unit?: string; axis?: 'x' | 'y' | 'z';
  min?: number; allowZero?: boolean; integer?: boolean; disabled?: boolean; step?: number; label?: string; decimals?: number;
}) {
  const fmt = (v: number) => (integer ? String(Math.round(v)) : Number.isFinite(v) ? v.toFixed(decimals) : '');
  const [text, setText] = useState(fmt(value));
  const [err, setErr] = useState<string | null>(null);
  const focused = useRef(false);
  const skipBlur = useRef(false);
  useEffect(() => { if (!focused.current) { setText(fmt(value)); setErr(null); } }, [value]);

  const commit = () => {
    const normalized = text.trim().replace(',', '.');
    if (!/^-?\d*\.?\d+$|^-?\d+\.?$/.test(normalized)) { setErr('Số không hợp lệ'); return; }
    const v = Number(normalized);
    if (!Number.isFinite(v)) { setErr('Số không hữu hạn'); return; }
    if (integer && !Number.isInteger(v)) { setErr('Cần số nguyên'); return; }
    if (min !== undefined && (allowZero ? v < min : v <= min)) { setErr(allowZero ? `≥ ${min}` : `> ${min}: không commit`); return; }
    if (Math.abs(v - value) < 1e-9) { setErr(null); setText(fmt(value)); return; }
    const r = onCommit(v);
    if (typeof r === 'string') { setErr(r); return; }
    setErr(null);
  };

  return (
    <div>
      <div className={`field${err ? ' invalid' : ''}`} title={err ?? label}>
        {axis && <span className={`axis ${axis}`}>{axis.toUpperCase()}</span>}
        <input
          aria-label={label ?? axis}
          aria-invalid={!!err}
          inputMode="decimal"
          value={text}
          disabled={disabled}
          step={step}
          onFocus={(e) => { focused.current = true; skipBlur.current = false; e.target.select(); }}
          onBlur={() => { focused.current = false; if (skipBlur.current) { skipBlur.current = false; return; } commit(); }}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter commits through blur so a value is committed exactly once (one undo step).
            if (e.key === 'Enter') { commit(); skipBlur.current = true; (e.target as HTMLInputElement).blur(); }
            if (e.key === 'Escape') { skipBlur.current = true; setText(fmt(value)); setErr(null); e.stopPropagation(); (e.target as HTMLInputElement).blur(); }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              const d = (step ?? (integer ? 1 : 1)) * (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
              const n = Number(text.replace(',', '.'));
              if (Number.isFinite(n)) setText(fmt(n + d));
            }
          }}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      {err && <div className="err-text" role="alert">{err}</div>}
    </div>
  );
}

export function Alert({ kind, title, children }: { kind: 'info' | 'warn' | 'err' | 'ok'; title: string; children?: ReactNode }) {
  const Icon = kind === 'err' ? AlertCircle : kind === 'warn' ? TriangleAlert : kind === 'ok' ? CheckCircle2 : Info;
  return (
    <div className={`alert ${kind}`} role={kind === 'err' ? 'alert' : 'status'}>
      <Icon size={16} />
      <div><b>{title}</b>{children && <p>{children}</p>}</div>
    </div>
  );
}

export function LevelBadge({ level }: { level: CheckLevel | 'STALE' }) {
  const cls = level === 'PASS' ? 'ok' : level === 'WARNING' ? 'warn' : level === 'BLOCK' ? 'err' : level === 'STALE' ? 'warn' : 'plain';
  const text = level === 'PASS' ? 'PASS' : level === 'WARNING' ? 'WARNING' : level === 'BLOCK' ? 'BLOCK' : level === 'STALE' ? 'STALE' : 'UNKNOWN';
  return <span className={`badge ${cls}`}>{text}</span>;
}

export function Modal({ title, onClose, children, footer, wide, badge }: {
  title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; badge?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const prev = document.activeElement as HTMLElement | null;
    el?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && el) {
        // keep focus inside the modal without trapping it forever
        const f = Array.from(el.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((x) => !x.hasAttribute('disabled'));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    el?.addEventListener('keydown', onKey);
    return () => { el?.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, []);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header>
          <h2>{title}</h2>
          {badge}
          <button className="btn ghost icon" data-close onClick={onClose} aria-label="Đóng"><X size={16} /></button>
        </header>
        <div className="body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}

export const fmtMm = (v: number) => `${v.toFixed(2)} mm`;
export const fmtTime = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—');
