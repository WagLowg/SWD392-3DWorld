import { Box, Boxes, ChevronRight, LayoutDashboard, LogOut, Menu, ShieldCheck, Store, UsersRound } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { hasStoredSession, isAdmin, logout } from '../../../shared/session/session'
import { useSession } from '../../../shared/session/useSession'
import { ErrorScreen } from '../../../shared/ui/ErrorScreen'
import { LoginRequired } from '../../../shared/ui/LoginRequired'
import { Toaster } from '../../../shared/ui/toast'

const NAVIGATION = [
  { label: 'Tổng quan', icon: LayoutDashboard, disabled: true },
  { label: 'Quản lý gian hàng', icon: Store, to: '/admin/storefronts' },
  { label: 'Kiểm duyệt sản phẩm', icon: Boxes, disabled: true },
  { label: 'Quản lý người dùng', icon: UsersRound, disabled: true },
  { label: 'Báo cáo vi phạm', icon: ShieldCheck, disabled: true },
]

function AdminGuard({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useSession()

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f5ff]">
        <span className="h-11 w-11 animate-spin rounded-full border-4 border-violet-soft border-t-violet" />
      </div>
    )
  }

  if (!user) {
    return hasStoredSession() ? (
      <ErrorScreen kind="session" />
    ) : (
      <div className="grid min-h-screen place-items-center bg-[#f7f5ff] px-4">
        <LoginRequired title="Đăng nhập tài khoản quản trị" body="Khu vực này chỉ dành cho quản trị viên 3DWorld." />
      </div>
    )
  }

  if (!isAdmin(user)) return <ErrorScreen kind="403" />
  return <>{children}</>
}

export function AdminLayout() {
  const { data: user } = useSession()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: đóng menu và cuộn lên đầu sau mỗi lần đổi route
  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eee7ff_0,transparent_32%),linear-gradient(180deg,#faf9ff_0%,#f5f3fb_100%)] font-body text-ink antialiased">
        <button
          type="button"
          aria-label="Mở menu quản trị"
          onClick={() => setOpen(true)}
          className="fixed left-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-2xl bg-ink text-white shadow-lg lg:hidden"
        >
          <Menu size={20} />
        </button>

        {open && (
          <button
            type="button"
            aria-label="Đóng menu quản trị"
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[278px] flex-col border-r border-white/10 bg-[#17151f] px-4 py-5 text-white shadow-2xl transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <a href="/" className="flex items-center gap-3 rounded-2xl px-3 py-2">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet to-[#8b6cff] shadow-lg shadow-violet/20">
              <Box size={21} />
            </span>
            <span>
              <span className="block font-display text-xl font-bold">3DWorld</span>
              <span className="block font-label text-[10px] font-bold uppercase tracking-[.2em] text-[#b8aaff]">
                Admin Console
              </span>
            </span>
          </a>

          <p className="mb-3 mt-9 px-3 font-label text-[11px] font-bold uppercase tracking-[.18em] text-white/40">
            Quản trị hệ thống
          </p>
          <nav className="space-y-1.5" aria-label="Điều hướng quản trị">
            {NAVIGATION.map((item) => {
              const Icon = item.icon
              const to = item.to
              if (item.disabled || !to) {
                return (
                  <div
                    key={item.label}
                    className="flex cursor-not-allowed items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-white/35"
                    title="Sẽ phát triển ở giai đoạn sau"
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[9px] uppercase">Sau</span>
                  </div>
                )
              }
              return (
                <NavLink
                  key={item.label}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-gradient-to-r from-violet to-[#8069f3] text-white shadow-lg shadow-violet/20'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  <ChevronRight size={15} className="ml-auto" />
                </NavLink>
              )
            })}
          </nav>

          <div className="mt-auto border-t border-white/10 pt-4">
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f0782b] font-display font-bold">
                {user?.name?.charAt(0).toUpperCase() ?? 'A'}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{user?.name ?? 'Quản trị viên'}</span>
                <span className="block truncate text-[11px] text-white/45">{user?.email}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => logout('/')}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut size={18} /> Đăng xuất
            </button>
          </div>
        </aside>

        <main className="min-h-screen px-4 pb-12 pt-20 sm:px-6 lg:ml-[278px] lg:px-10 lg:pt-9">
          <div className="mx-auto max-w-[1500px]">
            <Outlet />
          </div>
        </main>
        <Toaster />
      </div>
    </AdminGuard>
  )
}
