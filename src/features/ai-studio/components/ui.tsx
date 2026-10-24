import { useEffect, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes } from 'react';
import { X } from 'lucide-react';

export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; label?: string;
  options: { value: T; label: string; disabled?: boolean; title?: string }[];
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} disabled={o.disabled} title={o.title} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SelectField({ label, children, hint, ...rest }: { label: string; hint?: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="field select">
        <span>{label}</span>
        <select {...rest}>{children}</select>
      </label>
      {hint}
    </div>
  );
}

export function TextField({ label, error, hint, suffix, ...rest }: { label: string; error?: string; hint?: string; suffix?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className={`field${error ? ' error' : ''}`}>
        <span>{label}</span>
        <div className="row" style={{ gap: 6 }}>
          <input aria-invalid={!!error} {...rest} />
          {suffix && <span className="muted small">{suffix}</span>}
        </div>
      </label>
      {error ? <div className="field-hint err">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}

export function Switch({ label, desc, checked, onChange, disabled }: { label: ReactNode; desc?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="switch">
      <span>{label}{desc && <small>{desc}</small>}</span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`badge ${tone}`}><i className="dot" />{children}</span>;
}

export function Progress({ value, indeterminate }: { value: number; indeterminate?: boolean }) {
  return (
    <div className={`progress${indeterminate ? ' indeterminate' : ''}`} role="progressbar" aria-valuenow={indeterminate ? undefined : value} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ico">{icon}</div>
      <h3>{title}</h3>
      {text && <p style={{ margin: '0 0 16px' }}>{text}</p>}
      {action}
    </div>
  );
}
