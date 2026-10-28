import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Flame,
  LayoutDashboard,
  Package,
  RotateCcw,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { INITIAL_STAFF_REFUNDS, INITIAL_STAFF_SHIPMENTS } from '../mocks/staffMockData'

export function StaffSidebar() {
  const { pathname } = useLocation()

  const pendingShipments = INITIAL_STAFF_SHIPMENTS.filter(
    (s) => s.status === 'SHIPPED' || s.status === 'FAILED',
  ).length

  const pendingRefunds = INITIAL_STAFF_REFUNDS.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW',
  ).length

  const isOverviewActive = pathname === '/portal/staff' || pathname === '/portal/staff/'
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
      className="space-y-4 rounded-[2rem] bg-white/80 p-4 shadow-soft backdrop-blur-xl lg:sticky lg:top-28"
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

        {/* 0. Tổng quan Dashboard */}
        <div>
          <NavLink
            to="/portal/staff"
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

        {/* 1. Module A: Shipping */}
        <div>
          <NavLink
            to="/portal/staff/shipments"
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
                to="/portal/staff/shipments"
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

        {/* 2. Module B: Refund */}
        <div>
          <NavLink
            to="/portal/staff/refunds"
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
                to="/portal/staff/refunds"
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

      {/* Demo helper banner */}
      <div className="rounded-2xl border border-dashed border-violet/30 bg-violet-soft/30 p-3.5 text-xs text-ink-soft">
        <p className="font-semibold text-violet">Chế độ Demo UI</p>
        <p className="mt-1 text-[11px] leading-relaxed">
          Giao diện xem trước dành cho thẩm định và đối soát. Các thao tác cập nhật là mô phỏng phía trình duyệt.
        </p>
      </div>

      {/* Return to portal */}
      <Link
        to="/portal"
        className="flex items-center gap-2 rounded-2xl px-4 py-2.5 font-label text-xs font-semibold text-ink-soft transition hover:bg-white hover:text-ink"
      >
        <ArrowLeft size={14} />
        <span>Về trang chủ Portal</span>
      </Link>
    </aside>
  )
}

