import { CheckCircle2, MapPin, Navigation, Package, PackageCheck, Truck, XCircle } from 'lucide-react'
import { formatDateTime } from '../../../shared/format'
import type { Shipment } from '../types/order.types'

type StepState = 'done' | 'current' | 'todo' | 'failed'

type Step = {
  key: string
  title: string
  body: string
  at?: string | null
  icon: typeof Package
  state: StepState
}

const FLOW = ['PREPARING', 'SHIPPED', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION', 'DELIVERED', 'RECEIVED'] as const

const STEP_CONTENT = [
  {
    key: 'PREPARING',
    title: 'Đang chuẩn bị',
    body: 'Vận đơn đã được tạo tự động và Seller đang chuẩn bị kiện hàng.',
    icon: Package,
  },
  {
    key: 'SHIPPED',
    title: 'Seller đã bàn giao',
    body: 'Seller đã bàn giao kiện hàng cho đơn vị vận chuyển.',
    icon: Truck,
  },
  {
    key: 'IN_TRANSIT',
    title: 'Đang vận chuyển',
    body: 'Staff xác nhận kiện hàng đang trên hành trình vận chuyển.',
    icon: Navigation,
  },
  {
    key: 'ARRIVED_AT_DESTINATION',
    title: 'Đã đến nơi',
    body: 'Kiện hàng đã đến điểm giao hàng đích.',
    icon: MapPin,
  },
  {
    key: 'DELIVERED',
    title: 'Đã giao hàng',
    body: 'Kiện hàng đã được giao tới người nhận.',
    icon: PackageCheck,
  },
  {
    key: 'RECEIVED',
    title: 'Đã nhận hàng',
    body: 'Người mua hoặc Staff đã xác nhận nhận hàng.',
    icon: CheckCircle2,
  },
] as const

/** Backend hiện chỉ trả createdAt, shippedAt và deliveredAt; các mốc khác chưa có timestamp riêng. */
export function shipmentSteps(shipment: Shipment): Step[] {
  const exceptional = shipment.status === 'FAILED' || shipment.status === 'RETURNED'
  const normalizedStatus = shipment.status === 'HANDED_TO_CARRIER' ? 'SHIPPED' : shipment.status
  const currentIndex = FLOW.indexOf(normalizedStatus as (typeof FLOW)[number])
  const safeIndex = exceptional ? 1 : Math.max(currentIndex, 0)

  const timestamps: Partial<Record<(typeof FLOW)[number], string | null | undefined>> = {
    PREPARING: shipment.createdAt,
    SHIPPED: shipment.shippedAt,
    DELIVERED: shipment.deliveredAt,
  }

  const steps: Step[] = STEP_CONTENT.map((item, index) => ({
    ...item,
    at: timestamps[item.key],
    state: index < safeIndex ? 'done' : index === safeIndex && !exceptional ? 'current' : 'todo',
  }))

  if (exceptional) {
    steps.push({
      key: shipment.status,
      title: shipment.status === 'RETURNED' ? 'Hoàn trả kiện hàng' : 'Vận chuyển thất bại',
      body:
        shipment.status === 'RETURNED'
          ? 'Kiện hàng đã được chuyển sang quy trình hoàn trả.'
          : 'Quá trình vận chuyển gặp sự cố và cần được xử lý.',
      icon: XCircle,
      state: 'failed',
    })
  }

  return steps
}

function timeLabel(step: Step) {
  if (step.at) return formatDateTime(step.at)
  if (step.state === 'current') return 'Trạng thái hiện tại'
  if (step.state === 'done') return 'Backend chưa trả thời gian'
  return 'Chưa diễn ra'
}

export function ShipmentProgress({ shipment }: { shipment: Shipment }) {
  const steps = shipmentSteps(shipment)
  return (
    <ol className="grid gap-5 sm:grid-cols-3 xl:grid-cols-6">
      {steps.map((step, index) => {
        const Icon = step.icon
        const tone =
          step.state === 'failed'
            ? 'bg-danger text-white'
            : step.state === 'done'
              ? 'bg-ink text-white'
              : step.state === 'current'
                ? 'bg-white text-orange ring-2 ring-orange'
                : 'bg-surface-high text-ink-soft'
        return (
          <li key={step.key} className="relative flex flex-col items-center text-center">
            {index > 0 && (
              <span
                className={`absolute right-1/2 top-6 hidden h-1 w-full -translate-y-1/2 xl:block ${step.state === 'todo' ? 'bg-surface-high' : step.state === 'failed' ? 'bg-danger' : 'bg-orange'}`}
              />
            )}
            <span className={`relative grid h-12 w-12 place-items-center rounded-full ${tone}`}>
              <Icon size={20} />
            </span>
            <span className="mt-3 font-display text-sm font-bold">{step.title}</span>
            <span className="text-xs text-ink-soft">{timeLabel(step)}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function ShipmentLog({ shipment }: { shipment: Shipment }) {
  const steps = shipmentSteps(shipment)
    .filter((step) => step.state !== 'todo')
    .reverse()

  return (
    <ol className="space-y-5">
      {steps.map((step, index) => (
        <li key={step.key} className="flex gap-4">
          <span
            className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ${index === 0 ? (step.state === 'failed' ? 'bg-danger' : 'bg-teal ring-4 ring-teal-soft') : 'bg-line'}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{step.title}</p>
              <span className="rounded-full bg-mint px-2 py-0.5 font-label text-[11px] font-semibold text-[#0f5132]">
                {timeLabel(step)}
              </span>
            </div>
            <p className="text-sm text-ink-soft">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
