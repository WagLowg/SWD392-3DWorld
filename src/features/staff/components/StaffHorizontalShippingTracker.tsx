import { Check, MapPin, Package, PackageCheck, Truck, XCircle } from 'lucide-react'
import { formatDateTime } from '../../../shared/format'
import type { ShipmentStatus, StaffShipment } from '../types/staff.types'

const FLOW: { status: ShipmentStatus; label: string; icon: typeof Package }[] = [
  { status: 'PREPARING', label: 'Chờ Seller bàn giao', icon: Package },
  { status: 'SHIPPED', label: 'Đã bàn giao', icon: Truck },
  { status: 'IN_TRANSIT', label: 'Đang vận chuyển', icon: Truck },
  { status: 'ARRIVED_AT_DESTINATION', label: 'Đã đến điểm giao', icon: MapPin },
  { status: 'DELIVERED', label: 'Đã giao hàng', icon: PackageCheck },
  { status: 'RECEIVED', label: 'Đã nhận hàng', icon: Check },
]

const LEGACY_STATUS: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
  PENDING: 'PREPARING',
  PENDING_PICKUP: 'PREPARING',
  HANDED_TO_CARRIER: 'SHIPPED',
}

function eventTime(shipment: StaffShipment, status: ShipmentStatus) {
  if (status === 'PREPARING') return shipment.createdAt ?? shipment.shippedAt
  if (status === 'SHIPPED') return shipment.shippedAt
  if (status === 'DELIVERED') return shipment.deliveredAt
  return (
    shipment.auditHistory?.find((entry) => entry.newStatus === status)?.timestamp ??
    shipment.events.find((entry) => entry.status === status)?.timestamp
  )
}

export function StaffHorizontalShippingTracker({ shipment }: { shipment: StaffShipment }) {
  const normalized = LEGACY_STATUS[shipment.status] ?? shipment.status
  const currentIndex = FLOW.findIndex((step) => step.status === normalized)
  const exception = normalized === 'FAILED' || normalized === 'RETURNED'

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
        <div>
          <h3 className="font-display text-base font-bold">Tiến trình vận đơn</h3>
          <p className="mt-1 text-xs text-ink-soft">Seller bàn giao ở SHIPPED; Staff tiếp quản từ IN_TRANSIT trở đi.</p>
        </div>
        <span className="font-mono text-xs font-semibold text-violet">{shipment.trackingNumber}</span>
      </div>

      <ol className="mt-6 grid gap-5 sm:grid-cols-3 xl:grid-cols-6">
        {FLOW.map((step, index) => {
          const Icon = step.icon
          const done = !exception && currentIndex >= index
          const active = !exception && currentIndex === index
          const at = eventTime(shipment, step.status)
          return (
            <li key={step.status} className="relative flex flex-col items-center text-center">
              {index > 0 && (
                <span
                  className={`absolute right-1/2 top-5 hidden h-1 w-full xl:block ${done ? 'bg-orange' : 'bg-surface-high'}`}
                />
              )}
              <span
                className={`relative grid h-10 w-10 place-items-center rounded-full ${active ? 'bg-orange text-white ring-4 ring-peach' : done ? 'bg-ink text-white' : 'bg-surface-high text-ink-soft'}`}
              >
                {done && !active ? <Check size={16} /> : <Icon size={17} />}
              </span>
              <span className="mt-2 font-label text-xs font-semibold">{step.label}</span>
              <span className="mt-1 font-mono text-[9px] text-ink-soft">{step.status}</span>
              <time dateTime={at ?? undefined} className="mt-1 text-[10px] text-ink-soft">
                {at ? formatDateTime(at) : active ? 'Đang xử lý' : 'Chưa cập nhật'}
              </time>
            </li>
          )
        })}
      </ol>

      {exception && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#ffdad6] p-4 text-danger">
          <XCircle className="mt-0.5 shrink-0" size={18} />
          <div>
            <p className="font-semibold">
              {normalized === 'RETURNED' ? 'Kiện hàng đã hoàn trả' : 'Giao hàng thất bại'}
            </p>
            <p className="text-xs">
              Trạng thái hiện tại: {normalized}. Staff chỉ được tiếp tục theo các chuyển trạng thái Backend cho phép.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
