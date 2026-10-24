import type { ReactNode } from 'react'

export const inputClass =
  'w-full rounded-2xl bg-surface-low px-4 py-3 text-sm outline-none ring-violet/40 transition focus:bg-white focus:ring-2 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger/50 disabled:opacity-60'

/** Ô nhập có nhãn + lỗi; `id` phải trùng id của input bên trong. */
export function Field({
  id,
  label,
  error,
  hint,
  aside,
  className = '',
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: ReactNode
  aside?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="font-label text-xs font-semibold text-ink-soft">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-soft">{hint}</p>
      ) : null}
    </div>
  )
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-danger">
      {message}
    </p>
  )
}

export function SubmitButton({
  busy,
  children,
  className = '',
}: {
  busy?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className={`inline-flex items-center justify-between gap-3 rounded-full bg-ink py-2 pl-6 pr-2 font-label text-sm font-semibold text-white transition hover:bg-violet disabled:opacity-50 ${className}`}
    >
      <span>{busy ? 'Đang xử lý…' : children}</span>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-orange">→</span>
    </button>
  )
}
