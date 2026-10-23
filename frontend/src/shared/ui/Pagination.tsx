import { ChevronLeft, ChevronRight } from 'lucide-react'

/** `page` là 0-based như Backend. */
export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const pages = pageWindow(page, totalPages)
  const btn =
    'grid h-10 min-w-10 place-items-center rounded-full px-3 font-label text-sm font-semibold transition-colors'

  return (
    <nav aria-label="Phân trang" className="mt-10 flex items-center justify-center gap-1.5">
      <button
        type="button"
        aria-label="Trang trước"
        disabled={page <= 0}
        onClick={() => onChange(page - 1)}
        className={`${btn} bg-white shadow-soft hover:bg-surface-low disabled:opacity-40`}
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map((p) =>
        p < 0 ? (
          <span key={p} className="px-1 text-ink-soft">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
            className={`${btn} ${p === page ? 'bg-ink text-white' : 'bg-white shadow-soft hover:bg-surface-low'}`}
          >
            {p + 1}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="Trang sau"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
        className={`${btn} bg-white shadow-soft hover:bg-surface-low disabled:opacity-40`}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}

function pageWindow(page: number, total: number) {
  const set = new Set([0, total - 1, page - 1, page, page + 1].filter((p) => p >= 0 && p < total))
  const sorted = [...set].sort((a, b) => a - b)
  const out: number[] = []
  sorted.forEach((p, i) => {
    // khoảng trống dùng số âm khác nhau làm key ổn định
    if (i > 0 && p - sorted[i - 1] > 1) out.push(-i)
    out.push(p)
  })
  return out
}
