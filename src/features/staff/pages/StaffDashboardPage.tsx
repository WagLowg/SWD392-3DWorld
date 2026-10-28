import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Flame,
  LayoutDashboard,
  PackageCheck,
  RotateCcw,
  Shield,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../../../shared/lib/format'
import { Hero, Pill, Section, StatCard, StatGrid } from '../../../shared/ui/kit'
import { StaffHeader } from '../components/StaffHeader'
import { StaffRefundBadge, StaffShipmentBadge } from '../components/StaffStatusBadge'
import { useStaffRefunds, useStaffShipments } from '../mocks/staffMockData'
import type { ShipmentStatus, RefundStatus } from '../types/staff.types'

interface ActivityItem {
  id: string
  kind: 'SHIPPING' | 'REFUND'
  title: string
  description: string
  code: string
  timestamp: string
  link: string
  statusElement: React.ReactNode
}

export function StaffDashboardPage() {
  const { refunds: staffRefunds } = useStaffRefunds()
  const { shipments: staffShipments } = useStaffShipments()

  useEffect(() => {
    document.title = 'Tổng quan vận hành (Staff) · 3DWorld'
  }, [])

  // KPI counts dynamically calculated from existing mock records
  const shippingKpi = useMemo(() => {
    return {
      total: staffShipments.length,
      pending: staffShipments.filter((s) => s.status === 'PENDING').length,
      shipped: staffShipments.filter((s) => s.status === 'SHIPPED').length,
      delivered: staffShipments.filter((s) => s.status === 'DELIVERED').length,
      failed: staffShipments.filter((s) => s.status === 'FAILED').length,
      returned: staffShipments.filter((s) => s.status === 'RETURNED').length,
    }
  }, [staffShipments])

  const refundKpi = useMemo(() => {
    return {
      total: staffRefunds.length,
      submitted: staffRefunds.filter((r) => r.status === 'SUBMITTED').length,
      underReview: staffRefunds.filter((r) => r.status === 'UNDER_REVIEW').length,
      needsInfo: staffRefunds.filter((r) => r.status === 'NEEDS_INFO').length,
      approved: staffRefunds.filter((r) => r.status === 'APPROVED').length,
      rejected: staffRefunds.filter((r) => r.status === 'REJECTED').length,
    }
  }, [staffRefunds])

  // Recent activity compiled from shipment events & refund history
  const recentActivities: ActivityItem[] = useMemo(() => {
    const list: ActivityItem[] = []

    // Shipment events
    for (const s of staffShipments) {
      for (const ev of s.events) {
        list.push({
          id: `ship-${s.id}-${ev.id}`,
          kind: 'SHIPPING',
          title: ev.title,
          description: `${s.storefrontName} → ${s.recipientName} (${s.recipientProvince})`,
          code: s.trackingNumber,
          timestamp: ev.timestamp,
          link: `/staff/shipments/${s.id}`,
          statusElement: <StaffShipmentBadge status={s.status} />,
        })
      }
    }

    // Refund history
    for (const r of staffRefunds) {
      for (const h of r.history) {
        list.push({
          id: `ref-${r.id}-${h.id}`,
          kind: 'REFUND',
          title: h.action,
          description: h.note ? `${h.actor} — ${h.note}` : `${h.actor} — Đơn ${r.orderCode}`,
          code: r.code,
          timestamp: h.timestamp,
          link: `/staff/refunds/${r.id}`,
          statusElement: <StaffRefundBadge status={r.status} />,
        })
      }
    }

    // Sort descending by timestamp, take top 6
    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6)
  }, [staffRefunds, staffShipments])

  return (
    <div className="space-y-8">
      {/* 4.1 Header with role indicator, operating area, demo indicator */}
      <StaffHeader />

      <Hero
        code="STF-DASH-01"
        eyebrow="Bàn Làm Việc Nhân Viên Vận Hành"
        title="Tổng Quan Vận Hành"
        accent="Trung Tâm Quản Lý Vận Chuyển & Yêu Cầu Hoàn Tiền."
        description="Theo dõi toàn diện trạng thái luân chuyển bưu kiện GHTK và các yêu cầu khiếu nại, hoàn tiền sản phẩm 3D. Mọi số liệu và thao tác hiển thị là dữ liệu mô phỏng trong môi trường xem trước."
      />

      {/* 4.5 Quick Navigation Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/staff/shipments"
          className="group flex items-center justify-between rounded-[2rem] border border-teal/20 bg-gradient-to-r from-teal-soft/40 to-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal text-white shadow-soft">
              <Truck size={24} />
            </span>
            <div>
              <p className="font-label text-xs font-bold uppercase tracking-wider text-teal">
                Phân hệ vận chuyển
              </p>
              <h3 className="font-display text-lg font-bold text-ink">Xem danh sách vận đơn</h3>
              <p className="mt-0.5 text-xs text-ink-soft">
                Theo dõi {shippingKpi.total} vận đơn GHTK và xử lý giao nhận
              </p>
            </div>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-teal shadow-soft transition group-hover:bg-teal group-hover:text-white">
            <ArrowRight size={18} />
          </span>
        </Link>

        <Link
          to="/staff/refunds"
          className="group flex items-center justify-between rounded-[2rem] border border-orange/20 bg-gradient-to-r from-peach/40 to-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange text-white shadow-soft">
              <RotateCcw size={24} />
            </span>
            <div>
              <p className="font-label text-xs font-bold uppercase tracking-wider text-orange-deep">
                Phân hệ khiếu nại
              </p>
              <h3 className="font-display text-lg font-bold text-ink">Xem yêu cầu hoàn tiền</h3>
              <p className="mt-0.5 text-xs text-ink-soft">
                Thẩm định {refundKpi.total} hồ sơ khiếu nại lỗi sản xuất và vận chuyển
              </p>
            </div>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-orange shadow-soft transition group-hover:bg-orange group-hover:text-white">
            <ArrowRight size={18} />
          </span>
        </Link>
      </div>

      {/* 4.2 Dashboard Shipping Overview */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              1. Vận chuyển sàn (GHTK)
            </h2>
            <p className="text-xs text-ink-soft">
              Thống kê tiến trình bưu kiện sau khi người bán bàn giao cho đơn vị vận chuyển
            </p>
          </div>
          <Link
            to="/staff/shipments"
            className="inline-flex items-center gap-2 rounded-full bg-surface-low px-4 py-2 font-label text-xs font-semibold text-ink transition hover:bg-ink hover:text-white"
          >
            <span>Quản lý vận chuyển</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <StatGrid>
          <StatCard
            label="Chờ vận chuyển"
            value={shippingKpi.pending}
            hint="Chờ bàn giao bưu tá"
            icon={Clock}
            tone="neutral"
            to="/staff/shipments"
          />
          <StatCard
            label="Đang vận chuyển"
            value={shippingKpi.shipped}
            hint="Kiện hàng đang luân chuyển"
            icon={Truck}
            tone="teal"
            to="/staff/shipments"
          />
          <StatCard
            label="Giao thành công"
            value={shippingKpi.delivered}
            hint="Đã phát tới người mua"
            icon={CheckCircle2}
            tone="green"
            to="/staff/shipments"
          />
          <StatCard
            label="Giao thất bại"
            value={shippingKpi.failed}
            hint="Cần theo dõi phát lại"
            icon={AlertTriangle}
            tone="orange"
            to="/staff/shipments"
          />
          <StatCard
            label="Đã chuyển hoàn"
            value={shippingKpi.returned}
            hint="Trả lại xưởng sản xuất"
            icon={RotateCcw}
            tone="danger"
            to="/staff/shipments"
          />
        </StatGrid>
      </div>

      {/* 4.3 Dashboard Refund Overview */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              2. Yêu cầu khiếu nại & hoàn tiền
            </h2>
            <p className="text-xs text-ink-soft">
              Hồ sơ do người mua mở trong cửa sổ 72 giờ từ khi nhận hàng
            </p>
          </div>
          <Link
            to="/staff/refunds"
            className="inline-flex items-center gap-2 rounded-full bg-surface-low px-4 py-2 font-label text-xs font-semibold text-ink transition hover:bg-ink hover:text-white"
          >
            <span>Quản lý hoàn tiền</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <StatGrid>
          <StatCard
            label="Tổng số yêu cầu"
            value={refundKpi.total}
            hint="Hồ sơ khiếu nại đã tiếp nhận"
            icon={FileText}
            tone="neutral"
            to="/staff/refunds"
          />
          <StatCard
            label="Chờ tiếp nhận"
            value={refundKpi.submitted}
            hint="Hồ sơ mới gửi"
            icon={Clock}
            tone="orange"
            to="/staff/refunds"
          />
          <StatCard
            label="Đang thẩm định"
            value={refundKpi.underReview}
            hint="Đang đối chiếu chứng cứ"
            icon={AlertCircle}
            tone="violet"
            to="/staff/refunds"
          />
          <StatCard
            label="Cần bổ sung bằng chứng"
            value={refundKpi.needsInfo}
            hint="Chờ khách bổ sung ảnh/video"
            icon={RotateCcw}
            tone="orange"
            to="/staff/refunds"
          />
          <StatCard
            label="Đã duyệt (Chờ Admin)"
            value={refundKpi.approved}
            hint="Chờ Admin giải ngân"
            icon={CheckCircle2}
            tone="green"
            to="/staff/refunds"
          />
          <StatCard
            label="Đã từ chối"
            value={refundKpi.rejected}
            hint="Không đủ điều kiện"
            icon={XCircle}
            tone="danger"
            to="/staff/refunds"
          />
        </StatGrid>
      </div>

      {/* 4.4 Recent Activity Section */}
      <Section
        title="Nhật ký hoạt động vận hành gần đây"
        subtitle="Tổng hợp sự kiện cập nhật vận đơn và xử lý khiếu nại gần nhất (Dữ liệu mô phỏng)"
        aside={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-1 font-label text-xs font-medium text-ink-soft">
            <Activity size={13} className="text-violet" />
            <span>Mô phỏng thời gian thực</span>
          </span>
        }
      >
        <div className="divide-y divide-line/60">
          {recentActivities.map((act) => (
            <div
              key={act.id}
              className="flex flex-col gap-3 py-4 transition first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs ${
                    act.kind === 'SHIPPING'
                      ? 'bg-teal-soft text-teal'
                      : 'bg-peach text-orange-deep'
                  }`}
                >
                  {act.kind === 'SHIPPING' ? <Truck size={17} /> : <RotateCcw size={17} />}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-label text-xs font-semibold uppercase tracking-wider text-ink-soft">
                      {act.kind === 'SHIPPING' ? 'Vận đơn' : 'Khiếu nại'} ·
                    </span>
                    <span className="font-mono text-xs font-bold text-ink">{act.code}</span>
                    <span className="text-xs text-ink-soft">•</span>
                    <span className="text-xs font-semibold text-ink">{act.title}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-soft">{act.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {act.statusElement}
                <span className="font-mono text-[11px] text-ink-soft">
                  {formatDateTime(act.timestamp)}
                </span>
                <Link
                  to={act.link}
                  className="rounded-full bg-surface-low px-3 py-1.5 font-label text-xs font-semibold text-ink transition hover:bg-ink hover:text-white"
                >
                  Chi tiết
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
