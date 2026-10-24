import { type ReactNode, useState } from 'react'

/** Nút cần xác nhận tại chỗ (thay cho window.confirm) cho thao tác xoá / huỷ. */
export function ConfirmButton({
  onConfirm,
  busy,
  children,
  confirmLabel = 'Xác nhận',
  className = '',
  danger = true,
}: {
  onConfirm: () => void
  busy?: boolean
  children: ReactNode
  confirmLabel?: string
  className?: string
  danger?: boolean
}) {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <button type="button" disabled={busy} onClick={() => setAsking(true)} className={className}>
        {children}
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-low p-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          onConfirm()
          setAsking(false)
        }}
        className={`rounded-full px-3 py-1.5 font-label text-xs font-semibold text-white ${danger ? 'bg-danger' : 'bg-ink'}`}
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="rounded-full px-3 py-1.5 font-label text-xs font-semibold text-ink-soft"
      >
        Huỷ
      </button>
    </span>
  )
}
