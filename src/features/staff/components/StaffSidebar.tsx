import {
  Flame,
  LayoutDashboard,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { logout } from '../../auth/services/session'
import { useSession } from '../../../shared/session/useSession'
import { useStaffRefunds, useStaffShipments } from '../services/staff.service'

export function StaffSidebar() {
  const { pathname } = useLocation()
  const { data: user } = useSession()
  const role = user?.roles?.includes('ADMIN') ? 'ADMIN' : 'PRINT_STAFF'
  const { shipments } = useStaffShipments()
  const { refunds } = useStaffRefunds()

  const pendingShipments = shipments.filter((s) =>
    ['HANDED_TO_CARRIER', 'SHIPPED', 'IN_TRANSIT', 'FAILED'].includes(s.status),
  ).length

  const pendingRefunds = refunds.filter((r) => r.status === 'PENDING').length

  const isOverviewActive = pathname === '/staff' || pathname === '/staff/'
  const isShippingActive = pathname.includes('/staff/shipments')
  const isRefundActive = pathname.includes('/staff/refunds')

  const tabClass = (isActive: boolean) =>
    `group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 font-label text-sm font-semibold transition ${
      isActive
        ? 'bg-ink text-white shadow-sm'
        : 'text-ink-soft hover:bg-white hover:text-ink hover:shadow-soft'
    }`

  return (
    <aside
      className="space-y-4 rounded-[2rem] bg-white/80 p-4 shadow-soft backdrop-blur-xl lg:sticky lg:top-8"
      aria-label="Staff Management Navigation"
    >
      {/* Header card */}
      <div className="rounded-[1.5rem] bg-surface-low p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange text-white shadow-soft">
            <Flame size={20} />
          </span>
          <div>
            <p className="font-label text-[11px] font-bold uppercase tracking-wider text-orange-deep">
              Khu Vực Vận Hành
            </p>
            <h2 className="font-display text-base font-bold text-ink">3DWorld Staff</h2>
          </div>
        </div>

        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-soft/60 px-2.5 py-1 text-[11px] font-medium text-violet">
          <ShieldCheck size={13} />
          <span>Vận hành & Hỗ trợ sàn</span>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="space-y-1.5">
        <div className="px-3 pb-1 pt-2 font-label text-[11px] font-bold uppercase tracking-widest text-ink-soft">
          Phân Hệ Quản Trị
        </div>

        {/* 1. Tổng quan Dashboard */}
        <div>
          <NavLink
            to="/staff"
            end
            className={tabClass(isOverviewActive)}
            title="Tổng quan vận hành"
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard size={18} className={isOverviewActive ? 'text-white' : 'text-violet'} />
              <span>Tổng quan</span>
            </div>
          </NavLink>
        </div>

        {/* 2. Module A: Shipping */}
        <div>
          <NavLink
            to="/staff/shipments"
            className={tabClass(isShippingActive)}
            title="Quản lý vận chuyển GHTK"
          >
            <div className="flex items-center gap-3">
              <Truck size={18} className={isShippingActive ? 'text-white' : 'text-teal'} />
              <span>Quản lý vận chuyển</span>
            </div>
            {pendingShipments > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  isShippingActive ? 'bg-white/20 text-white' : 'bg-teal-soft text-teal'
                }`}
              >
                {pendingShipments}
              </span>
            )}
          </NavLink>

          {isShippingActive && (
            <div className="ml-8 mt-1 space-y-1 border-l-2 border-line pl-3 text-xs">
              <NavLink
                to="/staff/shipments"
                end
                className={({ isActive }) =>
                  `block py-1.5 font-medium transition ${
                    isActive ? 'font-bold text-orange' : 'text-ink-soft hover:text-ink'
                  }`
                }
              >
                Danh sách vận đơn
              </NavLink>
              {pathname.match(/\/staff\/shipments\/\d+/) && (
                <span className="block py-1.5 font-bold text-violet">
                  Chi tiết vận đơn đang chọn
                </span>
              )}
            </div>
          )}
        </div>

        {/* 3. Module B: Refund */}
        <div>
          <NavLink
            to="/staff/refunds"
            className={tabClass(isRefundActive)}
            title="Quản lý yêu cầu khiếu nại hoàn tiền"
          >
            <div className="flex items-center gap-3">
              <RotateCcw size={18} className={isRefundActive ? 'text-white' : 'text-orange-deep'} />
              <span>Quản lý hoàn tiền</span>
            </div>
            {pendingRefunds > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  isRefundActive ? 'bg-white/20 text-white' : 'bg-peach text-orange-deep'
                }`}
              >
                {pendingRefunds}
              </span>
            )}
          </NavLink>

          {isRefundActive && (
            <div className="ml-8 mt-1 space-y-1 border-l-2 border-line pl-3 text-xs">
              <NavLink
                to="/staff/refunds"
                end
                className={({ isActive }) =>
                  `block py-1.5 font-medium transition ${
                    isActive ? 'font-bold text-orange' : 'text-ink-soft hover:text-ink'
                  }`
                }
              >
                Danh sách yêu cầu
              </NavLink>
              {pathname.match(/\/staff\/refunds\/\d+/) && (
                <span className="block py-1.5 font-bold text-violet">
                  Thẩm định hồ sơ đang chọn
                </span>
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="my-3 h-px bg-line" />

      {/* 4. Staff Identity & Logout */}
      <div className="border-t border-line pt-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-2xl bg-surface-low p-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-orange text-xs font-bold text-white shadow-soft">
            {user?.name?.charAt(0).toUpperCase() ?? 'S'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-ink">{user?.name ?? 'Nhân viên vận hành'}</p>
            <p className="truncate font-mono text-[10px] font-semibold text-teal">Role: {role}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => logout('/')}
          className="flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-2.5 font-label text-xs font-semibold text-danger transition hover:bg-[#ffdad6]/40"
          title="Đăng xuất khỏi hệ thống"
        >
          <div className="flex items-center gap-2.5">
            <LogOut size={15} />
            <span>Đăng xuất</span>
          </div>
        </button>
      </div>
    </aside>
  )
}
