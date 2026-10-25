import { useQuery } from '@tanstack/react-query'
import { Box, LogOut, ShoppingBag } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { hasStoredSession, isSeller, logout } from '../../auth/services/session'
import { http } from '../../../shared/api'
import { loginHref } from '../../../shared/modules'
import { useSession } from '../../../shared/session/useSession'
import { ErrorScreen } from '../../../shared/ui/ErrorScreen'
import { LoginRequired } from '../../../shared/ui/LoginRequired'
import { Toaster } from '../../../shared/ui/toast'

const SITE_NAV = [
  { label: 'AI Studio', href: '/ai/' },
  { label: '3D Studio', href: '/studio/' },
  { label: 'Chợ Đồ Chơi', href: '/marketplace/' },
  { label: 'Đặt In 3D', href: '/pod/' },
]

const BUYER_TABS = [
  { to: '/orders', label: 'Đơn Hàng Của Tôi' },
  { to: '/refunds', label: 'Hoàn Tiền' },
  { to: '/models', label: 'Thư Viện 3D' },
  { to: '/profile', label: 'Hồ Sơ' },
  { to: '/addresses', label: 'Sổ Địa Chỉ' },
  { to: '/bank-accounts', label: 'Tài Khoản Ngân Hàng' },
  { to: '/reports', label: 'Báo Cáo Vi Phạm' },
]

const SELLER_TABS = [
  { to: '/seller', label: 'Tổng Quan', end: true },
  { to: '/seller/products', label: 'Sản Phẩm' },
  { to: '/seller/inventory', label: 'Tồn Kho' },
  { to: '/seller/orders', label: 'Đơn Chế Tác' },
  { to: '/seller/shipments', label: 'Vận Chuyển' },
  { to: '/seller/storefront', label: 'Gian Hàng' },
  { to: '/seller/subscription', label: 'Gói Thuê Bao' },
  { to: '/seller/register', label: 'Xác Thực' },
]

const OPS_TABS = [
  { to: '/ops/products', label: 'Duyệt Sản Phẩm' },
  { to: '/ops/reports', label: 'Báo Cáo Vi Phạm' },
  { to: '/ops/storefronts', label: 'Xác Thực Người Bán' },
  { to: '/ops/users', label: 'Người Dùng' },
]

const isAdmin = (roles: string[] | undefined) => !!roles?.some((r) => /ADMIN/i.test(r))

/** Khung chung cho các màn tài khoản / đơn hàng / người bán (Stitch MP 010–050). */
export function AccountLayout() {
  const { pathname } = useLocation()

  // biome-ignore lint/correctness/useExhaustiveDependencies: cuộn lên đầu khi đổi trang
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#FFF7EC] via-[#FFF2E5] to-[#FFE2CC] font-body text-ink antialiased">
      <SiteHeader />
      <main className="flex-1 pb-20 pt-28 md:pt-32">
        <Outlet />
      </main>
      <SiteFooter />
      <Toaster />
    </div>
  )
}

/** Yêu cầu đăng nhập; phân biệt chưa đăng nhập và phiên hết hạn (MP-104). */
export function RequireUser({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useSession()
  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1320px] space-y-4 px-4 md:px-8">
        <div className="h-28 animate-pulse rounded-[2rem] bg-white/70" />
        <div className="h-72 animate-pulse rounded-[2rem] bg-white/70" />
      </div>
    )
  }
  if (!user) {
    return hasStoredSession() ? (
      <ErrorScreen kind="session" />
    ) : (
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <LoginRequired title="Đăng nhập để tiếp tục" body="Trang này dành cho tài khoản 3DWorld của bạn." />
      </div>
    )
  }
  return <>{children}</>
}

/** Thanh tab tài khoản: người mua + (nếu là người bán) khu vực người bán. */
export function AccountTabs() {
  const { data: user } = useSession()
  const { pathname } = useLocation()
  const seller = isSeller(user) || pathname.startsWith('/seller')
  const admin = isAdmin(user?.roles) || pathname.startsWith('/ops')
  const tab = ({ isActive }: { isActive: boolean }) =>
    `shrink-0 rounded-full px-4 py-2 font-label text-xs font-semibold transition ${
      isActive ? 'bg-orange text-white shadow-sm' : 'text-ink-soft hover:bg-white hover:text-ink'
    }`
  return (
    <nav
      aria-label="Tài khoản"
      className="mx-auto mb-8 flex max-w-[1320px] gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:px-8"
    >
      <div className="flex gap-1 rounded-full bg-white/80 p-1 shadow-soft">
        {BUYER_TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={tab}>
            {t.label}
          </NavLink>
        ))}
        <a href="/marketplace/cart" className={tab({ isActive: false })}>
          Giỏ Hàng
        </a>
        {!seller && (
          <NavLink to="/seller/register" className={tab}>
            Bán Hàng
          </NavLink>
        )}
      </div>
      {seller && (
        <div className="ml-2 flex gap-1 rounded-full bg-ink/90 p-1 shadow-soft">
          <span className="self-center px-3 font-label text-[10px] font-semibold uppercase tracking-widest text-white/60">
            Người bán
          </span>
          {SELLER_TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `shrink-0 rounded-full px-4 py-2 font-label text-xs font-semibold ${isActive ? 'bg-orange text-white' : 'text-white/80 hover:text-white'}`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      )}
      {admin && (
        <div className="ml-2 flex gap-1 rounded-full bg-violet/90 p-1 shadow-soft">
          <span className="self-center px-3 font-label text-[10px] font-semibold uppercase tracking-widest text-white/70">
            Quản trị
          </span>
          {OPS_TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `shrink-0 rounded-full px-4 py-2 font-label text-xs font-semibold ${isActive ? 'bg-orange text-white' : 'text-white/85 hover:text-white'}`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}

function SiteHeader() {
  const { data: user } = useSession()
  const { data: cartCount } = useQuery({
    queryKey: ['cart', 'count'],
    queryFn: async ({ signal }) => {
      const res = await http.get<{ data?: { items?: { quantity: number }[] } }>('/api/cart', { signal })
      return (res.data?.items ?? []).reduce((s, i) => s + i.quantity, 0)
    },
    enabled: !!user,
    staleTime: 60_000,
  })

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 md:pt-4">
      <div className="pointer-events-auto mx-auto flex h-16 w-full max-w-[1320px] items-center justify-between gap-3 rounded-full bg-white/85 px-3 shadow-soft backdrop-blur-xl sm:px-5">
        <a href="/" className="group flex shrink-0 items-center gap-2" aria-label="3DWorld">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet to-[#8b6cff] text-white shadow-sm transition-transform group-hover:scale-105">
            <Box size={18} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">
            3D<span className="text-violet">World</span>
          </span>
        </a>
        <nav
          aria-label="Chuyển module 3DWorld"
          className="hidden items-center gap-1 rounded-full bg-surface-low p-1 md:flex"
        >
          {SITE_NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-full px-4 py-2 font-label text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <a
            href="/marketplace/cart"
            aria-label={`Giỏ hàng${cartCount ? `, ${cartCount} sản phẩm` : ''}`}
            className="relative grid h-10 w-10 place-items-center rounded-full bg-surface-low hover:bg-surface-high"
          >
            <ShoppingBag size={19} />
            {!!cartCount && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange px-1 font-label text-[10px] font-bold text-white ring-2 ring-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </a>
          {user ? (
            <>
              <NavLink to="/profile" className="flex items-center gap-2" title={user.email}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-orange to-orange-deep font-display text-sm font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[9rem] flex-col leading-tight sm:flex">
                  <span className="truncate font-label text-sm font-semibold">{user.name}</span>
                  <span className="truncate font-label text-[11px] text-teal">
                    {user.emailVerified ? '✓ Đã xác thực' : user.email}
                  </span>
                </span>
              </NavLink>
              <button
                type="button"
                onClick={() => logout('/')}
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="grid h-10 w-10 place-items-center rounded-full bg-surface-low hover:bg-surface-high"
              >
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <a
              href={loginHref()}
              className="rounded-full bg-ink px-5 py-2.5 font-label text-sm font-semibold text-white hover:bg-violet"
            >
              Đăng Nhập
            </a>
          )}
        </div>
      </div>
    </header>
  )
}

function SiteFooter() {
  return (
    <footer className="bg-white/70 px-4 pb-8 pt-12 backdrop-blur md:px-8">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-start justify-between gap-8">
        <div className="max-w-sm">
          <a href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet to-[#8b6cff] text-white">
              <Box size={18} />
            </span>
            <span className="font-display text-xl font-bold">
              3D<span className="text-violet">World</span>
            </span>
          </a>
          <p className="mt-3 text-sm text-ink-soft">
            Tài khoản 3DWorld dùng chung cho AI Studio, 3D Studio, Chợ Đồ Chơi và Đặt In 3D.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-10 gap-y-2 text-sm text-ink-soft">
          <a href="/marketplace/" className="hover:text-violet">
            Chợ Đồ Chơi
          </a>
          <a href="/portal/orders" className="hover:text-violet">
            Đơn hàng
          </a>
          <a href="/portal/models" className="hover:text-violet">
            Thư viện 3D
          </a>
          <a href="/portal/" className="hover:text-violet">
            Bản đồ FRD
          </a>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-[1320px] border-t border-line pt-5 font-label text-xs text-ink-soft">
        © {new Date().getFullYear()} 3DWorld. Múi giờ hệ thống: Asia/Ho_Chi_Minh (UTC+7).
      </p>
    </footer>
  )
}
