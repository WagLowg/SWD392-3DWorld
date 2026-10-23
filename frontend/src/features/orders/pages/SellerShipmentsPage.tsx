import { ArrowRight, CheckCircle2, PackageX, Search, Timer, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../../../shared/format'
import { PageHeading } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { OrderStatusBadge, orderCode, ShipmentStatusBadge } from '../components/OrderParts'
import { useSellerOrders, useSellerShipmentsFor } from '../hooks/useOrders'
import type { Order, Shipment } from '../types/order.types'

const SHIPPING_STATES = ['PROCESSING', 'SHIPPED', 'DELIVERED', 'RECEIVED', 'RETURNED']

const TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'waiting', label: 'Chờ tạo vận đơn' },
  { value: 'SHIPPED', label: 'Đang vận chuyển' },
  { value: 'DELIVERED', label: 'Giao thành công' },
  { value: 'FAILED', label: 'Giao thất bại' },
  { value: 'RETURNED', label: 'Hoàn trả' },
]

type Row = { order: Order; shipment?: Shipment }

/**
 * MP 049 · Quản Lý Vận Chuyển Người Bán.
 * Backend chưa có API liệt kê toàn bộ vận đơn → gộp đơn của gian hàng + vận đơn từng đơn.
 */
export function SellerShipmentsPage() {
  const orders = useSellerOrders()
  const candidates = useMemo(() => (orders.data ?? []).filter((o) => SHIPPING_STATES.includes(o.status)), [orders.data])
  const shipmentQueries = useSellerShipmentsFor(candidates.map((o) => o.id))
  const [tab, setTab] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    document.title = 'Quản lý vận chuyển · 3DWorld'
  }, [])

  const rows: Row[] = candidates.flatMap((order, i) => {
    const list = shipmentQueries[i]?.data ?? []
    return list.length ? list.map((shipment) => ({ order, shipment })) : [{ order }]
  })
  const loadingShipments = shipmentQueries.some((s) => s.isLoading)
  const match = (r: Row) =>
    !tab || (tab === 'waiting' ? !r.shipment && r.order.status === 'PROCESSING' : r.shipment?.status === tab)
  const term = q.trim().toLowerCase()
  const visible = rows.filter(
    (r) =>
      match(r) &&
      (!term ||
        orderCode(r.order.id).toLowerCase().includes(term) ||
        r.shipment?.trackingNumber.toLowerCase().includes(term) ||
        r.shipment?.carrierName.toLowerCase().includes(term)),
  )
  const n = (s: string) => rows.filter((r) => r.shipment?.status === s).length

  return (
    <>
      <PageHeading
        eyebrow="Seller shipments · vận đơn xưởng"
        title="Quản Lý Vận Chuyển"
        accent="Bàn Giao & Theo Dõi Kiện Hàng."
        description="Theo dõi vận đơn của từng đơn con, cập nhật kết quả giao hàng và xử lý kiện giao thất bại hoặc hoàn trả."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Timer}
          tone="bg-peach text-orange-deep"
          label="Chờ tạo vận đơn"
          value={rows.filter((r) => !r.shipment && r.order.status === 'PROCESSING').length}
        />
        <Kpi icon={Truck} tone="bg-teal-soft text-teal" label="Đang vận chuyển" value={n('SHIPPED')} />
        <Kpi icon={CheckCircle2} tone="bg-mint text-[#0f5132]" label="Giao thành công" value={n('DELIVERED')} />
        <Kpi
          icon={PackageX}
          tone="bg-[#ffdad6] text-danger"
          label="Thất bại / hoàn trả"
          value={n('FAILED') + n('RETURNED')}
        />
      </div>

      <div className="mt-6 space-y-4 rounded-[2rem] bg-white/90 p-4 shadow-soft sm:p-5">
        <div className="flex items-center gap-3 rounded-full bg-surface-low px-4">
          <Search size={18} className="text-ink-soft" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã đơn, mã vận đơn hoặc hãng vận chuyển"
            aria-label="Tìm vận đơn"
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={tab === t.value}
              onClick={() => setTab(t.value)}
              className={`shrink-0 rounded-full px-4 py-2 font-label text-xs font-semibold ${
                tab === t.value ? 'bg-ink text-white' : 'bg-surface-low text-ink-soft hover:bg-surface-high'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <QueryState isLoading={orders.isLoading} error={orders.error} onRetry={() => orders.refetch()}>
          {!visible.length && !loadingShipments ? (
            <StatusBlock
              tone="empty"
              title="Không có vận đơn"
              body="Vận đơn xuất hiện khi bạn tạo vận đơn cho đơn đang chế tác."
            />
          ) : (
            <div className="overflow-x-auto rounded-[2rem] bg-white/95 shadow-soft">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="font-label text-[11px] uppercase tracking-widest text-ink-soft">
                  <tr className="border-b border-line">
                    <th className="px-5 py-4">Đơn con</th>
                    <th className="px-5 py-4">Hãng & mã vận đơn</th>
                    <th className="px-5 py-4">Trạng thái kiện</th>
                    <th className="px-5 py-4">Gửi / giao</th>
                    <th className="px-5 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map(({ order, shipment }) => (
                    <tr key={`${order.id}-${shipment?.id ?? 'none'}`} className="border-b border-line/60 last:border-0">
                      <td className="px-5 py-4">
                        <p className="font-display font-bold">{orderCode(order.id)}</p>
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-4">
                        {shipment ? (
                          <>
                            <p className="font-semibold">{shipment.carrierName}</p>
                            <p className="font-mono text-xs text-violet">{shipment.trackingNumber}</p>
                          </>
                        ) : (
                          <span className="text-ink-soft">Chưa tạo vận đơn</span>
                        )}
                      </td>
                      <td className="px-5 py-4">{shipment ? <ShipmentStatusBadge status={shipment.status} /> : '—'}</td>
                      <td className="px-5 py-4 text-xs text-ink-soft">
                        {shipment ? (
                          <>
                            <p>Gửi: {formatDateTime(shipment.shippedAt ?? shipment.createdAt)}</p>
                            <p>Giao: {formatDateTime(shipment.deliveredAt)}</p>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={shipment ? `/seller/shipments/${order.id}` : `/seller/orders/${order.id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-2 font-label text-xs font-semibold text-white hover:bg-violet"
                        >
                          {shipment ? 'Chi tiết vận đơn' : 'Tạo vận đơn'} <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </div>
    </>
  )
}

function Kpi({ icon: Icon, tone, label, value }: { icon: typeof Truck; tone: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-4 rounded-[1.75rem] bg-white/95 p-5 shadow-soft">
      <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}>
        <Icon size={20} />
      </span>
      <span>
        <span className="block font-display text-3xl font-bold">{value}</span>
        <span className="block font-label text-xs text-ink-soft">{label}</span>
      </span>
    </div>
  )
}
