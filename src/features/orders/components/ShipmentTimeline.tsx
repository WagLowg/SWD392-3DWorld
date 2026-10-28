import { CheckCircle2, Package, PackageCheck, Truck, XCircle } from 'lucide-react'
import { formatDateTime } from '../../../shared/lib/format'
import type { Shipment } from '../types/order.types'

type Step = {
  key: string
  title: string
  body: string
  at?: string | null
  icon: typeof Package
  state: 'done' | 'current' | 'todo' | 'failed'
}

/** Dựng các mốc vận chuyển từ ShipmentResponse (Backend chưa có nhật ký sự kiện chi tiết). */
export function shipmentSteps(s: Shipment): Step[] {
  const failed = s.status === 'FAILED' || s.status === 'RETURNED'
  const delivered = s.status === 'DELIVERED' || !!s.deliveredAt
  return [
    {
      key: 'created',
      title: 'Tạo vận đơn',
      body: `Xưởng tạo vận đơn ${s.trackingNumber} với ${s.carrierName}.`,
      at: s.createdAt,
      icon: Package,
      state: 'done',
    },
    {
      key: 'shipped',
      title: 'Bàn giao vận chuyển',
      body: 'Kiện hàng đã đóng gói chống sốc và bàn giao cho bưu tá.',
      at: s.shippedAt,
      icon: Truck,
      state: s.shippedAt ? 'done' : 'current',
    },
    {
      key: 'transit',
      title: 'Đang vận chuyển',
      body: 'Kiện hàng đang trên đường đến địa chỉ nhận.',
      at: null,
      icon: PackageCheck,
      state: delivered || failed ? 'done' : s.shippedAt ? 'current' : 'todo',
    },
    failed
      ? {
          key: 'failed',
          title: s.status === 'RETURNED' ? 'Hoàn trả về xưởng' : 'Giao hàng thất bại',
          body: s.status === 'RETURNED' ? 'Kiện hàng đã được hoàn trả về xưởng.' : 'Bưu tá không giao được kiện hàng.',
          at: null,
          icon: XCircle,
          state: 'failed',
        }
      : {
          key: 'delivered',
          title: 'Giao hàng thành công',
          body: 'Kiện hàng đã giao tới người nhận.',
          at: s.deliveredAt,
          icon: CheckCircle2,
          state: delivered ? 'done' : 'todo',
        },
  ]
}

export function ShipmentProgress({ shipment }: { shipment: Shipment }) {
  const steps = shipmentSteps(shipment)
  return (
    <ol className="grid gap-6 sm:grid-cols-4">
      {steps.map((st, i) => {
        const Icon = st.icon
        const tone =
          st.state === 'failed'
            ? 'bg-danger text-white'
            : st.state === 'done'
              ? i === steps.length - 1
                ? 'bg-[#0f5132] text-white'
                : 'bg-orange text-white'
              : st.state === 'current'
                ? 'bg-white text-orange ring-2 ring-orange'
                : 'bg-surface-high text-ink-soft'
        return (
          <li key={st.key} className="relative flex flex-col items-center text-center">
            {i > 0 && (
              <span
                className={`absolute right-1/2 top-6 hidden h-1 w-full -translate-y-1/2 sm:block ${st.state === 'todo' ? 'bg-surface-high' : 'bg-orange'}`}
              />
            )}
            <span className={`relative grid h-12 w-12 place-items-center rounded-full ${tone}`}>
              <Icon size={20} />
            </span>
            <span className="mt-3 font-display text-sm font-bold">{st.title}</span>
            <span className="text-xs text-ink-soft">
              {st.at ? formatDateTime(st.at) : st.state === 'todo' ? 'Chưa diễn ra' : ''}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function ShipmentLog({ shipment }: { shipment: Shipment }) {
  const steps = shipmentSteps(shipment)
    .filter((s) => s.state !== 'todo')
    .reverse()
  return (
    <ol className="space-y-5">
      {steps.map((st, i) => (
        <li key={st.key} className="flex gap-4">
          <span
            className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ${i === 0 ? (st.state === 'failed' ? 'bg-danger' : 'bg-teal ring-4 ring-teal-soft') : 'bg-line'}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{st.title}</p>
              {st.at && (
                <span className="rounded-full bg-mint px-2 py-0.5 font-label text-[11px] font-semibold text-[#0f5132]">
                  {formatDateTime(st.at)}
                </span>
              )}
            </div>
            <p className="text-sm text-ink-soft">{st.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
