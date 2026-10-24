import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

/** Tiêu đề trang theo Stitch: nhãn nhỏ + tiêu đề đen + dòng nhấn màu cam. */
export function PageHeading({
  eyebrow,
  title,
  accent,
  description,
  aside,
}: {
  eyebrow: string
  title: ReactNode
  accent?: ReactNode
  description?: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 animate-fade-up">
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 font-label text-[11px] font-semibold uppercase tracking-widest shadow-soft">
          <span className="h-2 w-2 rounded-full bg-orange" /> {eyebrow}
        </span>
        <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
          {title}
          {accent && (
            <span className="mt-1 block text-[0.62em] leading-tight tracking-[-0.03em] text-orange">{accent}</span>
          )}
        </h1>
        {description && <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {aside}
    </div>
  )
}

/**
 * Ghi chú phần giao diện đang chờ Backend (thiếu dữ liệu trong OpenAPI).
 * Hiển thị kín đáo để team biết phần nào là placeholder.
 */
export function ApiNote({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`inline-flex items-start gap-1.5 rounded-xl bg-violet-soft/50 px-3 py-2 font-label text-[11px] leading-snug text-violet ${className}`}
    >
      <Info size={13} className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[2rem] bg-white/90 p-5 shadow-soft backdrop-blur sm:p-7 ${className}`}>
      {children}
    </section>
  )
}

export function StockBar({ available, stock }: { available: number; stock: number }) {
  const total = Math.max(stock, available, 1)
  const ratio = Math.max(0, Math.min(1, available / total))
  const tone = available <= 0 ? 'bg-line' : available <= 5 ? 'bg-danger' : ratio < 0.4 ? 'bg-orange' : 'bg-teal'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-high">
      <div
        className={`h-full rounded-full ${tone}`}
        style={{ width: `${Math.max(ratio * 100, available > 0 ? 6 : 0)}%` }}
      />
    </div>
  )
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  disabled,
  onChange,
  size = 'md',
}: {
  value: number
  min?: number
  max?: number
  disabled?: boolean
  onChange: (value: number) => void
  size?: 'sm' | 'md'
}) {
  const btn = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  return (
    <div className="inline-flex items-center rounded-full bg-surface-low p-0.5">
      <button
        type="button"
        aria-label="Giảm số lượng"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        className={`grid ${btn} place-items-center rounded-full font-bold hover:bg-white disabled:opacity-35`}
      >
        −
      </button>
      <span className="w-9 text-center font-display font-bold" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Tăng số lượng"
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={() => onChange(value + 1)}
        className={`grid ${btn} place-items-center rounded-full font-bold hover:bg-white disabled:opacity-35`}
      >
        +
      </button>
    </div>
  )
}

export function Breadcrumbs({
  items,
}: {
  items: { label: string; to?: string; render?: (label: string) => ReactNode }[]
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 font-label text-xs font-semibold text-ink-soft"
    >
      {items.map((item, i) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true">›</span>}
          {item.render ? (
            item.render(item.label)
          ) : (
            <span className={i === items.length - 1 ? 'text-ink' : ''}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
