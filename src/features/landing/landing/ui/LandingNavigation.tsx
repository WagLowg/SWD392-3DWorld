import { LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { logout } from '../../../auth/services/session'
import { WORLDS } from '../../config/content'
import { ROUTES } from '../../config/routes'
import { Link } from '../../lib/PageLink'
import { useSession } from '../../lib/useSession'
import { S } from '../../state/scene'
import { useUI } from '../../state/store'
import { WORLD_ANCHORS, worldProgress } from '../../state/timeline'
import { scrollToTime } from '../director'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#B9A7FF" />
            <stop offset="1" stopColor="#7955FF" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="17" fill="url(#lg)" />
        <ellipse
          cx="32"
          cy="32"
          rx="29"
          ry="9"
          fill="none"
          stroke="#202027"
          strokeWidth="4.5"
          transform="rotate(-20 32 32)"
        />
        <rect x="46" y="10" width="9" height="9" rx="2.5" fill="#FFE58F" />
      </svg>
      <span className="font-display text-[1.15rem] font-bold tracking-tight">
        3D<span className="text-violet">World</span>
      </span>
    </span>
  )
}

export function LandingNavigation() {
  const active = useUI((s) => s.activeWorld)
  const [open, setOpen] = useState(false)
  const { user, isLoading: sessionLoading } = useSession()

  const go = (i: number) => {
    setOpen(false)
    scrollToTime(WORLD_ANCHORS[i])
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <nav
        aria-label="Primary"
        className="glass mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full py-2 pl-4 pr-2 font-nav"
      >
        <button
          type="button"
          className="border-0 bg-transparent p-0"
          onClick={() => scrollToTime(0)}
          aria-label="3DWorld — về đầu trang"
        >
          <Logo />
        </button>

        <ul className="hidden items-center gap-1 lg:flex">
          {WORLDS.map((w, i) => (
            <li key={w.id}>
              <a
                href={`#${w.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  go(i)
                }}
                aria-current={active === i ? 'true' : undefined}
                className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active === i ? 'bg-ink text-white' : 'text-ink/70 hover:bg-white hover:text-ink'
                }`}
              >
                {w.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">
          {sessionLoading ? (
            <span role="status" className="hidden h-9 w-24 animate-pulse rounded-full bg-white/70 sm:inline-block" aria-label="Đang khôi phục phiên đăng nhập" />
          ) : (
            <Link
              to={user ? ROUTES.aiStudio : ROUTES.signIn}
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink/80 hover:bg-white sm:inline-block"
            >
              {user ? user.name : 'Sign In'}
            </Link>
          )}
          {user && (
            <button
              type="button"
              onClick={() => void logout('/')}
              className="hidden h-9 w-9 items-center justify-center rounded-full text-ink/60 transition-colors hover:bg-white hover:text-red-600 sm:inline-flex"
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              <LogOut size={17} />
            </button>
          )}
          <button
            type="button"
            onClick={() => go(0)}
            className="hidden rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 sm:inline-block"
          >
            Explore 3DWorld
          </button>
          <button
            type="button"
            className="icon-btn lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              {open ? (
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M3 6h12M3 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="glass mx-auto mt-2 max-w-6xl rounded-3xl p-3 font-nav lg:hidden">
          <ul className="grid gap-1">
            {WORLDS.map((w, i) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-semibold ${
                    active === i ? 'bg-ink text-white' : 'hover:bg-white'
                  }`}
                >
                  {w.label}
                  <span className="text-xs opacity-50">0{i + 1}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {sessionLoading ? (
              <span role="status" className="h-11 animate-pulse rounded-2xl bg-white/70" aria-label="Đang khôi phục phiên đăng nhập" />
            ) : user ? (
              <button
                type="button"
                onClick={() => void logout('/')}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold"
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            ) : (
              <Link to={ROUTES.signIn} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold">
                Sign In
              </Link>
            )}
            <button
              type="button"
              onClick={() => go(0)}
              className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white"
            >
              Explore 3DWorld
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

/** Slim vertical progress rail — one clickable segment per world. */
export function WorldProgress() {
  const active = useUI((s) => s.activeWorld)
  const fills = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    let raf = 0
    const loop = () => {
      fills.current.forEach((el, i) => {
        if (el) el.style.transform = `scaleY(${worldProgress(S.t, i)})`
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <nav aria-label="World progress" className="fixed right-3 top-1/2 z-30 -translate-y-1/2 sm:right-6">
      <ol className="flex flex-col items-end gap-3">
        {WORLDS.map((w, i) => (
          <li key={w.id}>
            <button
              type="button"
              onClick={() => scrollToTime(WORLD_ANCHORS[i])}
              className="group flex items-center gap-3"
              aria-label={`Đi tới ${w.label}`}
              aria-current={active === i ? 'step' : undefined}
            >
              <span
                className={`eyebrow hidden whitespace-nowrap rounded-full bg-white/80 px-2.5 py-1 text-[0.62rem] text-ink transition-all duration-300 md:inline-block ${
                  active === i
                    ? 'opacity-100'
                    : 'translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                }`}
              >
                {w.label}
              </span>
              <span className="relative block h-9 w-[5px] overflow-hidden rounded-full bg-ink/12 sm:h-11">
                <span
                  ref={(el) => {
                    fills.current[i] = el
                  }}
                  className="absolute inset-0 origin-top rounded-full"
                  style={{ background: 'var(--accent)', transform: 'scaleY(0)' }}
                />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
