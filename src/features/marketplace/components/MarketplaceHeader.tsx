import { Bell, Box, LogOut, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSession } from '../../../shared/session/useSession'
import { goLogin, logout } from '../../auth/services/session'
import { useCart } from '../hooks/useCart'
import { ModuleSwitcher } from '../../../shared/ModuleSwitcher'

export function MarketplaceHeader() {
  const { data: user, isLoading: sessionLoading } = useSession()
  const { data: cart } = useCart()
  const count = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line/70 bg-white/90 text-ink shadow-soft backdrop-blur-xl">
      <div className="grid h-[72px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 sm:px-5 md:grid-cols-[minmax(210px,1fr)_auto_minmax(210px,1fr)] md:gap-5">
        <Link to="/" className="group flex min-w-0 shrink-0 items-center gap-2.5 justify-self-start" aria-label="3DWorld Chợ Đồ Chơi">
          <span className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-gradient-to-br from-violet to-[#8b6cff] text-white shadow-sm transition-transform group-hover:scale-105">
            <Box size={20} />
          </span>
          <span className="hidden font-display text-base font-bold leading-tight sm:grid">
            <span>3D<span className="text-violet">World</span></span>
            <small className="font-label text-[9px] font-bold tracking-[.13em] text-violet">MARKETPLACE</small>
          </span>
        </Link>

        <div className="hidden justify-self-center md:block"><ModuleSwitcher current="marketplace" theme="light" /></div>

        <div className="flex min-w-0 shrink-0 items-center gap-1.5 justify-self-end sm:gap-2">
          <Link
            to="/cart"
            aria-label={`Giỏ hàng${count ? `, ${count} sản phẩm` : ''}`}
            className="relative grid h-9 w-9 place-items-center rounded-[10px] bg-surface-low text-ink-soft transition-colors hover:bg-surface-high hover:text-ink"
          >
            <ShoppingBag size={19} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange px-1 font-label text-[10px] font-bold text-white ring-2 ring-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>

          <button type="button" className="hidden h-9 w-9 place-items-center rounded-[10px] bg-surface-low text-ink-soft transition-colors hover:bg-surface-high hover:text-ink sm:grid" aria-label="Thông báo" title="Thông báo">
            <Bell size={18} />
          </button>

          {sessionLoading ? (
            <span role="status" className="h-9 w-28 animate-pulse rounded-full bg-surface-low" aria-label="Đang khôi phục phiên đăng nhập" />
          ) : user ? (
            <>
              <a href="/portal/profile" className="flex items-center gap-2" title={user.email}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-orange to-orange-deep font-display text-sm font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[9rem] flex-col leading-tight sm:flex">
                  <span className="truncate font-label text-xs font-semibold text-ink">{user.name}</span>
                  <span className="truncate font-label text-[10px] text-ink-soft">{user.email}</span>
                </span>
              </a>
              <button
                type="button"
                onClick={() => void logout('/marketplace/')}
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="grid h-9 w-9 place-items-center rounded-[10px] bg-surface-low text-ink-soft transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => goLogin()}
              className="rounded-lg px-3 py-2 font-label text-sm font-semibold text-ink-soft hover:bg-surface-low hover:text-ink"
            >
              Đăng Nhập
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
