import { CheckCircle2, Hammer, PackageX, Truck, Undo2, XCircle } from 'lucide-react'
import { useId, useState } from 'react'
import { ApiClientError } from '../../../services/http'
import { ConfirmButton } from '../../../shared/ui/ConfirmButton'
import { inputClass } from '../../../shared/ui/form'
import { useToast } from '../../../shared/ui/toast'
import { useSellerOrderActions } from '../hooks/useOrders'
import type { Order, Shipment, ShipmentEvent } from '../types/order.types'

export const CARRIERS = ['GHN Express', 'Giao Hàng Tiết Kiệm', 'Viettel Post', 'VNPost', 'J&T Express']

/** Trạng thái có thể huỷ theo máy trạng thái Backend. */
const CANCELLABLE = ['CREATED', 'PENDING_PAYMENT', 'PAID', 'PROCESSING']

function useRun() {
  const toast = useToast()
  return (p: Promise<unknown>, ok: string) =>
    p.then(() => toast(ok)).catch((e) => toast(e instanceof ApiClientError ? e.message : 'Thao tác thất bại.', 'error'))
}

/** Hành động chính cho một đơn của người bán, theo đúng trạng thái hiện tại. */
export function SellerOrderActions({ order, compact = false }: { order: Order; compact?: boolean }) {
  const { updateStatus, createShipment } = useSellerOrderActions()
  const run = useRun()
  const [shipping, setShipping] = useState(false)
  const busy = updateStatus.isPending || createShipment.isPending

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {CANCELLABLE.includes(order.status) && (
        <ConfirmButton
          busy={busy}
          confirmLabel="Huỷ đơn"
          onConfirm={() =>
            run(
              updateStatus.mutateAsync({ orderId: order.id, status: 'CANCELLED' }),
              'Đã huỷ đơn, tồn kho được giải phóng.',
            )
          }
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 font-label text-xs font-semibold text-ink-soft hover:text-danger"
        >
          <XCircle size={14} /> Huỷ đơn
        </ConfirmButton>
      )}
      {order.status === 'PAID' && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(
              updateStatus.mutateAsync({ orderId: order.id, status: 'PROCESSING' }),
              'Đã tiếp nhận — đơn chuyển sang Đang chế tác.',
            )
          }
          className="inline-flex items-center gap-2 rounded-full bg-violet px-4 py-2.5 font-label text-xs font-semibold text-white disabled:opacity-50"
        >
          <Hammer size={14} /> Tiếp nhận & bắt đầu chế tác
        </button>
      )}
      {(order.status === 'PAID' || order.status === 'PROCESSING') &&
        (shipping ? (
          <CreateShipmentForm
            busy={createShipment.isPending}
            onCancel={() => setShipping(false)}
            onSubmit={(carrierName) =>
              run(
                createShipment.mutateAsync({ orderId: order.id, carrierName }),
                'Đã tạo vận đơn — đơn chuyển sang Đang vận chuyển.',
              ).then(() => setShipping(false))
            }
          />
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setShipping(true)}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 font-label text-xs font-semibold text-white hover:bg-violet disabled:opacity-50"
          >
            <Truck size={14} /> Tạo vận đơn bưu tá
          </button>
        ))}
      {!compact && order.status === 'PENDING_PAYMENT' && (
        <span className="font-label text-xs text-ink-soft">Chờ người mua thanh toán trước khi chế tác.</span>
      )}
    </div>
  )
}

function CreateShipmentForm({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean
  onSubmit: (carrier: string) => void
  onCancel: () => void
}) {
  const uid = useId()
  const [carrier, setCarrier] = useState(CARRIERS[0])
  const [custom, setCustom] = useState('')
  const value = carrier === 'other' ? custom.trim() : carrier
  return (
    <div className="flex w-full flex-wrap items-end gap-2 rounded-2xl bg-surface-low p-3 sm:w-auto">
      <label htmlFor={`${uid}-carrier`} className="sr-only">
        Đơn vị vận chuyển
      </label>
      <select
        id={`${uid}-carrier`}
        value={carrier}
        onChange={(e) => setCarrier(e.target.value)}
        className={`${inputClass} w-auto bg-white py-2`}
      >
        {CARRIERS.map((c) => (
          <option key={c}>{c}</option>
        ))}
        <option value="other">Khác…</option>
      </select>
      {carrier === 'other' && (
        <input
          aria-label="Tên đơn vị vận chuyển"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Tên hãng"
          className={`${inputClass} w-40 bg-white py-2`}
        />
      )}
      <button
        type="button"
        disabled={busy || !value}
        onClick={() => onSubmit(value)}
        className="rounded-full bg-ink px-4 py-2.5 font-label text-xs font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Đang tạo…' : 'Tạo vận đơn'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full px-3 py-2.5 font-label text-xs font-semibold text-ink-soft"
      >
        Huỷ
      </button>
    </div>
  )
}

const EVENTS: { event: ShipmentEvent; label: string; icon: typeof CheckCircle2; tone: string; ok: string }[] = [
  {
    event: 'DELIVERED',
    label: 'Giao thành công',
    icon: CheckCircle2,
    tone: 'bg-[#0f5132] text-white',
    ok: 'Đã ghi nhận giao thành công.',
  },
  {
    event: 'FAILED',
    label: 'Giao thất bại',
    icon: PackageX,
    tone: 'bg-orange text-white',
    ok: 'Đã ghi nhận giao thất bại.',
  },
  { event: 'RETURNED', label: 'Hoàn trả', icon: Undo2, tone: 'bg-danger text-white', ok: 'Đã ghi nhận hoàn trả.' },
]

/** Cập nhật sự kiện vận đơn (PATCH /api/shipments/{id}/event). */
export function ShipmentEventActions({ shipment, orderId }: { shipment: Shipment; orderId: number }) {
  const { shipmentEvent } = useSellerOrderActions()
  const run = useRun()
  const open = !['DELIVERED', 'RETURNED'].includes(shipment.status)
  if (!open) return null
  return (
    <div className="flex flex-wrap gap-2">
      {EVENTS.map(({ event, label, icon: Icon, tone, ok }) => (
        <ConfirmButton
          key={event}
          busy={shipmentEvent.isPending}
          danger={event !== 'DELIVERED'}
          confirmLabel={label}
          onConfirm={() => run(shipmentEvent.mutateAsync({ shipmentId: shipment.id, orderId, event }), ok)}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-label text-xs font-semibold ${tone}`}
        >
          <Icon size={14} /> {label}
        </ConfirmButton>
      ))}
    </div>
  )
}
