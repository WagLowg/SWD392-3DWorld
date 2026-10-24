import { Box, ShoppingBag } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { goLogin } from '../../auth/services/session'
import { useCart } from '../hooks/useCart'
import { useSession } from '../../../shared/session/useSession'

const NAV = [
  { label: 'AI Studio', href: '/ai/' },
  { label: '3D Studio', href: '/studio/' },
  { label: 'Chợ Đồ Chơi', to: '/' },
  { label: 'Đặt In 3D', href: '/pod/' },
] as const

const navItem = 'rounded-full px-4 py-2 font-label text-sm font-semibold transition-colors'

export function MarketplaceHeader() {
  const { data: user } = useSession()
  const { data: cart } = useCart()
  const count = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 md:pt-4">
      <div className="pointer-events-auto mx-auto flex h-16 w-full max-w-[1320px] items-center justify-between gap-3 rounded-full bg-white/85 px-3 shadow-soft backdrop-blur-xl sm:px-5">
        <Link to="/" className="group flex shrink-0 items-center gap-2" aria-label="3DWorld Chợ Đồ Chơi">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet to-[#8b6cff] text-white shadow-sm transition-transform group-hover:scale-105">
            <Box size={18} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">
            3D<span className="text-violet">World</span>
          </span>
        </Link>

        <nav
          aria-label="Chuyển module 3DWorld"
          className="hidden items-center gap-1 rounded-full bg-surface-low p-1 md:flex"
        >
          {NAV.map((item) =>
            'to' in item ? (
              <NavLink
                key={item.label}
                to={item.to}
                end={false}
                className={`${navItem} bg-violet text-white shadow-sm`}
                aria-current="page"
              >
                {item.label}
              </NavLink>
            ) : (
              <a key={item.label} href={item.href} className={`${navItem} text-ink-soft hover:text-ink`}>
                {item.label}
              </a>
            ),
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            to="/cart"
            aria-label={`Giỏ hàng${count ? `, ${count} sản phẩm` : ''}`}
            className="relative grid h-10 w-10 place-items-center rounded-full bg-surface-low transition-colors hover:bg-surface-high"
          >
            <ShoppingBag size={19} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange px-1 font-label text-[10px] font-bold text-white ring-2 ring-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>

          {user ? (
            <a href="/portal/profile" className="flex items-center gap-2" title={user.email}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-orange to-orange-deep font-display text-sm font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[9rem] flex-col leading-tight sm:flex">
                <span className="truncate font-label text-sm font-semibold">{user.name}</span>
                <span className="truncate font-label text-[11px] text-ink-soft">{user.email}</span>
              </span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => goLogin()}
              className="hidden px-2 font-label text-sm font-semibold text-ink-soft hover:text-ink sm:inline-flex"
            >
              Đăng Nhập
            </button>
          )}

          <a
            href="/ai/studio"
            className="hidden items-center gap-2 rounded-full bg-ink py-1.5 pl-4 pr-1.5 font-label text-sm font-semibold text-white transition hover:bg-violet lg:inline-flex"
          >
            Bắt Đầu Sáng Tạo
            <span className="grid h-7 w-7 place-items-center rounded-full bg-orange">→</span>
          </a>
        </div>
      </div>
    </header>
  )
}
