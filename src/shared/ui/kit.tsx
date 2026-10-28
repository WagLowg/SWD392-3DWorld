import { ArrowRight, Check, FlaskConical, type LucideIcon, ShieldAlert } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../format'
import { inputClass } from './form'

/* ------------------------------------------------------------------ tones */

export type Tone = 'neutral' | 'orange' | 'violet' | 'teal' | 'green' | 'danger' | 'ink'

export const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-high text-ink-soft',
  orange: 'bg-peach text-orange-deep',
  violet: 'bg-violet-soft text-violet',
  teal: 'bg-teal-soft text-teal',
  green: 'bg-mint text-[#0f5132]',
  danger: 'bg-[#ffdad6] text-danger',
  ink: 'bg-ink text-white',
}

export function Pill({ tone = 'neutral', children, code }: { tone?: Tone; children: ReactNode; code?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-label text-[11px] font-semibold ${TONE[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
      {code && <span className="font-mono text-[10px] opacity-60">{code}</span>}
    </span>
  )
}

/** Trạng thái dạng mã → nhãn + màu. */
export function StatusPill({ status, map }: { status: string; map: Record<string, { label: string; tone: Tone }> }) {
  const m = map[status] ?? { label: status, tone: 'neutral' as Tone }
  return (
    <Pill tone={m.tone} code={status}>
      {m.label}
    </Pill>
  )
}

/* ------------------------------------------------------------- mock note */

/** Nhãn bắt buộc trên mọi màn dùng dữ liệu mẫu (chưa có API). */
export function MockNotice({ api, partial }: { api?: string; partial?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-violet/40 bg-violet-soft/40 px-4 py-2.5 font-label text-xs text-violet">
      <FlaskConical size={14} />
      <strong>{partial ? 'Một phần dữ liệu mẫu' : 'Dữ liệu mẫu'}</strong>
      <span className="text-ink-soft">
        {partial
          ? `— ${partial} chưa có API trong OpenAPI nên đang là dữ liệu mẫu; phần còn lại dùng API thật.`
          : '— màn này chưa có API trong OpenAPI; thao tác chỉ thay đổi dữ liệu mẫu trên trình duyệt.'}
      </span>
      {api && <code className="rounded bg-white/70 px-1.5 py-0.5 text-[11px] text-ink">Cần API: {api}</code>}
    </div>
  )
}

/* -------------------------------------------------------------- headings */

export function Hero({
  code,
  eyebrow,
  title,
  accent,
  description,
  actions,
}: {
  code?: string
  eyebrow: string
  title: string
  accent?: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 animate-fade-up">
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 font-label text-[11px] font-semibold uppercase tracking-widest shadow-soft">
          <span className="h-2 w-2 rounded-full bg-orange" />
          {code && <span className="text-ink-soft">{code} ·</span>} {eyebrow}
        </span>
        <h1 className="mt-5 font-display text-[36px] font-bold leading-[1.04] tracking-[-0.035em] sm:text-5xl">
          {title}
          {accent && <span className="mt-1 block text-[0.66em] leading-tight text-orange">{accent}</span>}
        </h1>
        {description && <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/* ---------------------------------------------------------------- buttons */

const BTN = {
  primary: 'bg-ink text-white hover:bg-violet',
  orange: 'bg-orange text-white hover:bg-orange-deep',
  soft: 'bg-surface-low text-ink hover:bg-surface-high',
  white: 'bg-white text-ink shadow-soft hover:bg-surface-low',
  danger: 'bg-danger text-white hover:opacity-90',
  violet: 'bg-violet text-white hover:opacity-90',
} as const

export function Btn({
  to,
  href,
  onClick,
  variant = 'soft',
  icon: Icon,
  children,
  disabled,
  type = 'button',
  size = 'md',
}: {
  to?: string
  href?: string
  onClick?: () => void
  variant?: keyof typeof BTN
  icon?: LucideIcon
  children: ReactNode
  disabled?: boolean
  type?: 'button' | 'submit'
  size?: 'sm' | 'md'
}) {
  const cls = `inline-flex items-center justify-center gap-1.5 rounded-full font-label font-semibold transition disabled:opacity-40 ${
    size === 'sm' ? 'px-3.5 py-2 text-xs' : 'px-5 py-2.5 text-sm'
  } ${BTN[variant]}`
  const inner = (
    <>
      {Icon && <Icon size={size === 'sm' ? 13 : 15} />} {children}
    </>
  )
  if (to)
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    )
  if (href)
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    )
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  )
}

/* ------------------------------------------------------------------ stats */

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'violet',
  to,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  tone?: Tone
  to?: string
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-ink-soft">{label}</p>
        {Icon && (
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${TONE[tone]}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </>
  )
  const cls = 'block rounded-[1.75rem] bg-white/95 p-5 shadow-soft transition'
  return to ? (
    <Link to={to} className={`${cls} hover:-translate-y-0.5 hover:shadow-lift`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
}

/* ---------------------------------------------------------------- filters */

export function FilterTabs<T extends string>({
  value,
  onChange,
  options,
  dark,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; count?: number }[]
  dark?: boolean
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value || 'all'}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`shrink-0 rounded-full px-4 py-2 font-label text-xs font-semibold transition ${
              active
                ? dark
                  ? 'bg-ink text-white'
                  : 'bg-orange text-white'
                : 'bg-surface-low text-ink-soft hover:bg-surface-high'
            }`}
          >
            {o.label}
            {o.count !== undefined && ` (${o.count})`}
          </button>
        )
      })}
    </div>
  )
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mt-6 space-y-3 rounded-[2rem] bg-white/90 p-4 shadow-soft sm:p-5">{children}</div>
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="h-11 w-full rounded-full bg-surface-low px-5 text-sm outline-none focus:ring-2 focus:ring-violet/40"
    />
  )
}

/* ------------------------------------------------------------------ table */

export type Column<T> = { key: string; header: string; render: (row: T) => ReactNode; className?: string }

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  empty = 'Không có dữ liệu.',
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string | number
  empty?: string
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-[2rem] bg-white/95 shadow-soft">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="font-label text-[11px] uppercase tracking-widest text-ink-soft">
          <tr className="border-b border-line">
            {columns.map((c) => (
              <th key={c.key} className={`px-5 py-4 font-semibold ${c.className ?? ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r) => (
              <tr key={rowKey(r)} className="border-b border-line/60 align-top last:border-0 hover:bg-surface-low/50">
                {columns.map((c) => (
                  <td key={c.key} className={`px-5 py-4 ${c.className ?? ''}`}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-5 py-14 text-center text-ink-soft">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function CellTitle({ title, sub, to }: { title: ReactNode; sub?: ReactNode; to?: string }) {
  return (
    <div className="min-w-0">
      {to ? (
        <Link to={to} className="font-display font-bold hover:text-violet">
          {title}
        </Link>
      ) : (
        <p className="font-display font-bold">{title}</p>
      )}
      {sub && <p className="mt-0.5 font-mono text-[11px] text-ink-soft">{sub}</p>}
    </div>
  )
}

/* --------------------------------------------------------------- sections */

export function Section({
  n,
  title,
  subtitle,
  aside,
  children,
  className = '',
}: {
  n?: number | string
  title: string
  subtitle?: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-[2rem] bg-white/95 p-5 shadow-soft sm:p-7 ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">
            {n !== undefined && <span className="text-orange">{n}. </span>}
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function DetailLayout({ main, aside }: { main: ReactNode; aside: ReactNode }) {
  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-6">{main}</div>
      <aside className="space-y-4 lg:sticky lg:top-28">{aside}</aside>
    </div>
  )
}

export function KeyValues({ items, cols = 2 }: { items: { label: string; value: ReactNode }[]; cols?: 2 | 3 | 4 }) {
  const grid = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[cols]
  return (
    <dl className={`grid gap-3 ${grid}`}>
      {items.map((i) => (
        <div key={i.label} className="rounded-2xl bg-surface-low p-3.5">
          <dt className="font-label text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{i.label}</dt>
          <dd className="mt-1 break-words font-semibold">{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function MoneyRows({
  rows,
  total,
}: {
  rows: { label: string; value: ReactNode; tone?: 'plus' | 'minus' }[]
  total?: { label: string; value: ReactNode }
}) {
  return (
    <dl className="space-y-2 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-soft">{r.label}</dt>
          <dd className={`font-semibold ${r.tone === 'plus' ? 'text-teal' : r.tone === 'minus' ? 'text-danger' : ''}`}>
            {r.value}
          </dd>
        </div>
      ))}
      {total && (
        <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2">
          <dt className="font-display font-bold">{total.label}</dt>
          <dd className="font-display text-2xl font-bold text-orange-deep">{total.value}</dd>
        </div>
      )}
    </dl>
  )
}

export function RuleBox({ title, rules, tone = 'violet' }: { title: string; rules: ReactNode[]; tone?: Tone }) {
  return (
    <section className="mt-8 rounded-[2rem] bg-white/90 p-6 shadow-soft">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <ShieldAlert size={18} className={tone === 'danger' ? 'text-danger' : 'text-violet'} /> {title}
      </h2>
      <ol className="mt-4 grid gap-3 md:grid-cols-2">
        {rules.map((r, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: danh sách tĩnh
          <li key={i} className="flex gap-3 rounded-2xl bg-surface-low p-4 text-sm text-ink-soft">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-xs font-bold ${TONE[tone]}`}
            >
              {i + 1}
            </span>
            <span>{r}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ------------------------------------------------------------- audit log */

export type AuditEntry = { at: string; actor: string; action: string; note?: string; tone?: Tone }

export function AuditTimeline({ entries, title = 'Sổ ký audit logs' }: { entries: AuditEntry[]; title?: string }) {
  return (
    <section className="rounded-[2rem] bg-white/95 p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <Pill tone="violet">Bất biến</Pill>
      </div>
      <ol className="mt-4 space-y-4">
        {[...entries]
          .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
          .map((e) => (
            <li key={`${e.at}-${e.action}`} className="flex gap-3">
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${e.tone ? TONE[e.tone].split(' ')[0] : 'bg-line'} ring-2 ring-white`}
              />
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-ink-soft">{formatDateTime(e.at)}</p>
                <p className="text-sm font-semibold">{e.action}</p>
                <p className="text-xs text-ink-soft">
                  {e.actor}
                  {e.note && ` — ${e.note}`}
                </p>
              </div>
            </li>
          ))}
      </ol>
    </section>
  )
}

/* ---------------------------------------------------------- decision form */

export type DecisionOption = { value: string; label: string; tone?: Tone; hint?: string }

/**
 * Biểu mẫu phán quyết của chuyên viên: chọn quyết định + lý do bắt buộc (ghi audit_logs.reason)
 * + checklist bắt buộc → ký duyệt.
 */
export function DecisionForm({
  title = 'Biểu mẫu phán quyết & ký số audit logs',
  options,
  checklist = [],
  minReason = 30,
  busy,
  done,
  onSubmit,
}: {
  title?: string
  options: DecisionOption[]
  checklist?: string[]
  minReason?: number
  busy?: boolean
  done?: string | null
  onSubmit: (decision: string, reason: string) => void
}) {
  const uid = useId()
  const [decision, setDecision] = useState(options[0]?.value ?? '')
  const [reason, setReason] = useState('')
  const [checked, setChecked] = useState<boolean[]>(() => checklist.map(() => false))
  const ready = reason.trim().length >= minReason && checked.every(Boolean) && !!decision

  if (done) {
    return (
      <Section title={title}>
        <p className="flex items-center gap-2 rounded-2xl bg-mint px-4 py-3 text-sm font-semibold text-[#0f5132]">
          <Check size={16} /> {done}
        </p>
      </Section>
    )
  }

  return (
    <Section title={title} subtitle="Quyết định được ghi bất biến vào sổ nhật ký (audit_logs.reason).">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={decision === o.value}
            onClick={() => setDecision(o.value)}
            className={`rounded-full px-4 py-2.5 font-label text-sm font-semibold transition ${
              decision === o.value
                ? o.tone === 'danger'
                  ? 'bg-danger text-white'
                  : 'bg-ink text-white'
                : 'bg-surface-low hover:bg-surface-high'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {options.find((o) => o.value === decision)?.hint && (
        <p className="mt-2 text-xs text-ink-soft">{options.find((o) => o.value === decision)?.hint}</p>
      )}
      <label
        htmlFor={`${uid}-reason`}
        className="mt-5 flex justify-between font-label text-xs font-semibold text-ink-soft"
      >
        <span>Căn cứ phán quyết *</span>
        <span>
          {minReason <= 1
            ? reason.trim().length > 0
              ? `${reason.trim().length} ký tự`
              : 'Không được để trống'
            : `${reason.trim().length} / tối thiểu ${minReason} ký tự`}
        </span>
      </label>
      <textarea
        id={`${uid}-reason`}
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className={`${inputClass} mt-1.5`}
        placeholder="Nêu căn cứ, bằng chứng đã đối chiếu và kết luận…"
      />
      {checklist.length > 0 && (
        <ul className="mt-4 space-y-2 rounded-2xl bg-surface-low p-4">
          {checklist.map((c, i) => (
            <li key={c}>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={(e) => setChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                  className="mt-0.5 h-4 w-4 accent-violet"
                />
                {c}
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => onSubmit(decision, reason.trim())}
          className="inline-flex items-center gap-3 rounded-full bg-ink py-2 pl-6 pr-2 font-label text-sm font-semibold text-white hover:bg-violet disabled:opacity-40"
        >
          {busy ? 'Đang ký…' : 'Ký duyệt & thi hành'}
          <span className="grid h-9 w-9 place-items-center rounded-full bg-orange">
            <ArrowRight size={16} />
          </span>
        </button>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------ misc tiles */

export function Countdown({ deadline, label }: { deadline: string; label: string }) {
  const ms = Date.parse(deadline) - Date.now()
  const over = ms <= 0
  const h = Math.floor(Math.abs(ms) / 3600_000)
  const m = Math.floor((Math.abs(ms) % 3600_000) / 60_000)
  return (
    <div className={`rounded-2xl p-4 text-center ${over ? 'bg-[#ffdad6]' : 'bg-peach/60'}`}>
      <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-ink-soft">{label}</p>
      <p className={`mt-1 font-mono text-3xl font-bold ${over ? 'text-danger' : 'text-orange-deep'}`}>
        {over ? '-' : ''}
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
      </p>
      <p className="text-xs text-ink-soft">Hạn: {formatDateTime(deadline)}</p>
    </div>
  )
}

export function MediaTile({ label, tone = 'violet', icon: Icon }: { label: string; tone?: Tone; icon?: LucideIcon }) {
  return (
    <div className={`grid aspect-[4/3] place-items-center rounded-2xl ${TONE[tone]} bg-opacity-60`}>
      <div className="flex flex-col items-center gap-2 px-3 text-center">
        {Icon && <Icon size={26} strokeWidth={1.5} />}
        <span className="font-label text-[11px] font-semibold">{label}</span>
      </div>
    </div>
  )
}

export function Avatar({ name, tone = 'violet' }: { name: string; tone?: Tone }) {
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${TONE[tone]}`}
    >
      {name
        .split(/\s+/)
        .slice(-2)
        .map((w) => w.charAt(0))
        .join('')
        .toUpperCase()}
    </span>
  )
}
