import { Check, Package, Store, X } from 'lucide-react'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { formatAttributes } from '../../marketplace/lib/format'
import { ProductMedia } from '../../marketplace/components/ProductMedia'
import { useVariantIndexStore } from '../../marketplace/stores/variant-index.store'
import { ORDER_FLOW, flowIndex, shipmentMeta, statusMeta, TONE_CLASS } from '../lib/status'
import type { Order, OrderItem } from '../types/order.types'

export function orderCode(id: number) {
  return `#ORD-${String(id).padStart(5, '0')}`
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

/** Món trong đơn: tên & ảnh lấy từ chỉ mục variant (OrderItemResponse chỉ có SKU). */
export function OrderItemRow({ item }: { item: OrderItem }) {
  const info = useVariantIndexStore((s) => s.variants[item.variantId])
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
            {info.title}
          </a>
        ) : (
          <p className="truncate font-display text-base font-bold">Vật phẩm {item.sku}</p>
        )}
        <p className="font-mono text-[11px] text-ink-soft">
          SKU: {item.sku} · SL: x{item.quantity}
        </p>
        {info && <p className="text-xs text-violet">{formatAttributes(info.attributes)}</p>}
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

/** Tiến trình đơn: Chờ thanh toán → Đã thanh toán → Chế tác → Vận chuyển → Đã giao → Đã nhận. */
export function OrderTimeline({ order }: { order: Order }) {
  const closed = order.status === 'CANCELLED' || order.status === 'RETURNED'
  const current = flowIndex(order.status)
  return (
    <div>
      <ol className="grid grid-cols-3 gap-y-6 sm:grid-cols-6">
        {ORDER_FLOW.map((s, i) => {
          const done = !closed && current >= i
          const active = !closed && current === i
          const m = statusMeta(s)
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
export const REFUNDABLE = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RECEIVED', 'RETURNED']
