import { Check, Package, Store, X } from 'lucide-react'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { ProductMedia } from '../../marketplace/components/ProductMedia'
import { formatAttributes } from '../../marketplace/lib/format'
import { useVariantIndexStore } from '../../marketplace/stores/variant-index.store'
import { flowIndex, ORDER_FLOW, shipmentMeta, statusMeta, TONE_CLASS } from '../lib/status'
import type { Order, OrderHistoryEntry, OrderItem } from '../types/order.types'

export function orderCode(id: number) {
  return `#ORD-${String(id).padStart(5, '0')}`
}

/** Mã đơn Backend sinh (orderCode) nếu có, không thì mã suy từ id. */
export function displayOrderCode(order: Pick<Order, 'id' | 'orderCode'>) {
  return order.orderCode || orderCode(order.id)
}

export function OrderStatusBadge({ status }: { status: string }) {
  const m = statusMeta(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-label text-[11px] font-semibold ${TONE_CLASS[m.tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {m.label}
      <span className="font-mono text-[10px] opacity-60">{status}</span>
    </span>
  )
}

export function ShipmentStatusBadge({ status }: { status: string }) {
  const m = shipmentMeta(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-label text-[11px] font-semibold ${TONE_CLASS[m.tone]}`}
    >
      {m.label}
    </span>
  )
}

/** Món trong đơn: tên & thuộc tính từ bản chụp OrderItemResponse; ảnh lấy từ chỉ mục variant nếu có. */
export function OrderItemRow({ item }: { item: OrderItem }) {
  const info = useVariantIndexStore((s) => s.variants[item.variantId])
  const title = item.productTitle || info?.title
  const attributes = item.attributes ?? info?.attributes
  return (
    <li className="flex items-center gap-4 rounded-2xl bg-surface-low/70 p-3">
      {info ? (
        <ProductMedia src={info.image} alt="" seed={info.productId} className="h-16 w-16 shrink-0 rounded-xl" />
      ) : (
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-soft to-peach text-ink-soft">
          <Package size={22} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        {info ? (
          <a
            href={`/marketplace/${info.productId}`}
            className="block truncate font-display text-base font-bold hover:text-violet"
          >
            {title}
          </a>
        ) : (
          <p className="truncate font-display text-base font-bold">{title || `Vật phẩm ${item.sku}`}</p>
        )}
        <p className="font-mono text-[11px] text-ink-soft">
          SKU: {item.sku} · SL: x{item.quantity}
        </p>
        {attributes && <p className="text-xs text-violet">{formatAttributes(attributes)}</p>}
      </div>
      <div className="text-right">
        <p className="font-display text-lg font-bold">{formatVnd(item.lineTotal)}</p>
        {item.quantity > 1 && <p className="font-label text-[11px] text-ink-soft">{formatVnd(item.unitPrice)} / món</p>}
      </div>
    </li>
  )
}

export function StorefrontLabel({ id }: { id: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-low px-2.5 py-1 font-label text-[11px] font-semibold">
      <Store size={11} className="text-violet" /> Xưởng #{id}
    </span>
  )
}

/** Tiến trình đơn: thanh toán → soạn hàng → bàn giao → vận chuyển → giao/nhận. */
export function OrderTimeline({
  order,
  history = [],
  historyLoading = false,
  historyError = false,
}: {
  order: Order
  history?: OrderHistoryEntry[]
  historyLoading?: boolean
  historyError?: boolean
}) {
  const closed = order.status === 'CANCELLED' || order.status === 'RETURNED'
  const current = flowIndex(order.status)
  const changedAtByStatus = new Map<string, string>()

  for (const entry of [...history].sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())) {
    if (!changedAtByStatus.has(entry.toStatus)) changedAtByStatus.set(entry.toStatus, entry.changedAt)
  }

  const stepTime = (status: string) => {
    const value = changedAtByStatus.get(status) ?? (status === 'PENDING_PAYMENT' ? order.createdAt : undefined)
    if (value) return { value, label: formatDateTime(value) }
    if (historyLoading) return { value: undefined, label: 'Đang tải…' }
    if (historyError) return { value: undefined, label: 'Không tải được' }
    return { value: undefined, label: 'Chưa cập nhật' }
  }

  return (
    <div>
      <ol className="grid grid-cols-3 gap-y-6 sm:grid-cols-7">
        {ORDER_FLOW.map((s, i) => {
          const done = !closed && current >= i
          const active = !closed && current === i
          const m = statusMeta(s)
          const time = stepTime(s)
          return (
            <li key={s} className="relative flex flex-col items-center text-center">
              {i > 0 && (
                <span
                  className={`absolute right-1/2 top-5 hidden h-1 w-full -translate-y-1/2 sm:block ${done ? 'bg-orange' : 'bg-surface-high'}`}
                />
              )}
              <span
                className={`relative grid h-10 w-10 place-items-center rounded-full font-display text-sm font-bold ${
                  active
                    ? 'bg-orange text-white ring-4 ring-peach'
                    : done
                      ? 'bg-ink text-white'
                      : 'bg-surface-high text-ink-soft'
                }`}
              >
                {done && !active ? <Check size={16} /> : i + 1}
              </span>
              <span className={`mt-2 font-label text-xs font-semibold ${done ? '' : 'text-ink-soft'}`}>{m.label}</span>
              <time
                dateTime={time.value}
                className={`mt-1 max-w-24 font-label text-[10px] leading-tight ${time.value ? 'text-ink-soft' : 'text-ink-soft/60'}`}
              >
                {time.label}
              </time>
            </li>
          )
        })}
      </ol>
      {closed && (
        <p className="mt-5 flex items-center gap-2 rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-danger">
          <X size={16} /> {statusMeta(order.status).hint}
        </p>
      )}
      {!closed && statusMeta(order.status).hint && (
        <p className="mt-5 rounded-2xl bg-surface-low px-4 py-3 text-sm text-ink-soft">
          {statusMeta(order.status).hint}
        </p>
      )}
    </div>
  )
}

export function OrderMoney({ order }: { order: Order }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-soft">Tiền hàng</dt>
        <dd className="font-semibold">{formatVnd(order.subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-soft">Phí vận chuyển</dt>
        <dd className="font-semibold">{formatVnd(order.shippingFee)}</dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-line pt-2">
        <dt className="font-display font-bold">Tổng thanh toán</dt>
        <dd className="font-display text-2xl font-bold text-orange-deep">{formatVnd(order.totalAmount)}</dd>
      </div>
      <div className="flex justify-between text-xs text-ink-soft">
        <dt>Đặt lúc</dt>
        <dd>{formatDateTime(order.createdAt)}</dd>
      </div>
    </dl>
  )
}

/** Trạng thái cho phép yêu cầu hoàn tiền (đã thanh toán). */
export const REFUNDABLE = ['PAID', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RECEIVED', 'RETURNED']
