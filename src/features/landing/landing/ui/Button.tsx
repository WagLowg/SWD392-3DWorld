import { useRef } from 'react'
import { Link } from '../../lib/PageLink'

const Arrow = () => (
  <span className="arrow" aria-hidden>
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7h9M7.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
)

type Props = {
  children: React.ReactNode
  to?: string
  onClick?: () => void
  variant?: 'primary' | 'ghost'
  arrow?: boolean
  className?: string
  ariaLabel?: string
}

/** CTA with a gentle magnetic pull toward the cursor and an animated arrow. */
export function MagneticButton({ children, to, onClick, variant = 'primary', arrow = variant === 'primary', className = '', ariaLabel }: Props) {
  const ref = useRef<HTMLElement>(null)
  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * 0.22
    const y = (e.clientY - (r.top + r.height / 2)) * 0.3
    ref.current.style.setProperty('--mx', `${x}px`)
    ref.current.style.setProperty('--my', `${y}px`)
  }
  const leave = () => {
    ref.current?.style.setProperty('--mx', '0px')
    ref.current?.style.setProperty('--my', '0px')
  }
  const cls = `btn ${variant === 'primary' ? 'btn-primary' : 'btn-ghost'} interactive ${className}`
  const content = (
    <>
      <span>{children}</span>
      {arrow && <Arrow />}
    </>
  )
  if (to)
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} to={to} className={cls} onPointerMove={move} onPointerLeave={leave} aria-label={ariaLabel}>
        {content}
      </Link>
    )
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} type="button" onClick={onClick} className={cls} onPointerMove={move} onPointerLeave={leave} aria-label={ariaLabel}>
      {content}
    </button>
  )
}

export function Eyebrow({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="eyebrow inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-ink ring-1 ring-black/5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
      {children}
      <span className="text-ink/40">{index}</span>
    </div>
  )
}
