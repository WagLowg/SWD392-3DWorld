import {
  Check,
  ClipboardList,
  Copy,
  CreditCard,
  MapPin,
  Package,
  PartyPopper,
  Store,
  Truck,
  Wallet,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDateTime, formatVnd } from '../../../shared/lib/format'
import { ProductMedia } from '../../marketplace/components/ProductMedia'
import { useCatalog } from '../../marketplace/hooks/useCatalog'
import { formatAttributes, resolveMediaUrl } from '../../marketplace/lib/format'
import { useVariantIndexStore } from '../../marketplace/stores/variant-index.store'
import { ORDER_FLOW, shipmentMeta, statusMeta, TONE_CLASS } from '../lib/status'
import type { Order, OrderHistoryEntry, OrderItem, OrderStatus } from '../types/order.types'

export function orderCode(id: number) {
  return `#ORD-${String(id).padStart(5, '0')}`
}

/** Mã đơn Backend sinh (orderCode) nếu có, không thì mã suy từ id. */
export function displayOrderCode(order: Pick<Order, 'id' | 'orderCode'>) {
  return order.orderCode || orderCode(order.id)
}

/** Rút gọn mã dạng "ORD-<uuid>" thành "ORD-C88BA313" để hiển thị. */
export function shortOrderCode(order: Pick<Order, 'id' | 'orderCode'>) {
  const full = displayOrderCode(order)
  const m = /^([A-Z]+)-([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.exec(full)
  return m ? `${m[1]}-${m[2].toUpperCase()}` : full
}

/** Mã đơn gọn một dòng + nút sao chép mã đầy đủ. */
export function OrderCode({ order, className = '' }: { order: Pick<Order, 'id' | 'orderCode'>; className?: string }) {
  const full = displayOrderCode(order)
  const short = shortOrderCode(order)
  const [copied, setCopied] = useState(false)
  const copy = () =>
    navigator.clipboard
      ?.writeText(full)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {})
  return (
    <span className={`inline-flex max-w-full items-center gap-2 ${className}`}>
      <span title={full} className="truncate whitespace-nowrap">
        {short}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label="Sao chép mã đơn"
        title={copied ? 'Đã sao chép' : 'Sao chép mã đầy đủ'}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-low text-ink-soft transition hover:bg-surface-high hover:text-ink"
      >
        {copied ? <Check size={13} className="text-teal" /> : <Copy size={13} />}
      </button>
    </span>
  )
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
  const catalog = useCatalog({ page: 0, size: 50 }, !info)

  const matchedProduct = useMemo(() => {
    if (info) return null
    const cleanTitle = (item.productTitle || '').trim().toLowerCase()
    return catalog.data?.items.find((p) => p.title.trim().toLowerCase() === cleanTitle)
  }, [info, catalog.data?.items, item.productTitle])

  const productId = info?.productId || matchedProduct?.id || item.variantId || 12
  const title = item.productTitle || info?.title || matchedProduct?.title
  const attributes = item.attributes ?? info?.attributes
  const displayImage = info?.image || matchedProduct?.thumbnailUrl
  const productHref = `/marketplace/${productId}`

  return (
    <li className="flex items-center gap-4 rounded-2xl bg-surface-low/70 p-3 transition hover:bg-surface-low">
      <a href={productHref} className="group shrink-0 block" title="Xem chi tiết sản phẩm">
        {displayImage ? (
          <img
            src={resolveMediaUrl(displayImage)}
            alt={title || ''}
            className="h-16 w-16 shrink-0 rounded-xl object-cover transition duration-200 group-hover:scale-105"
          />
        ) : info ? (
          <ProductMedia
            src={info.image}
            alt=""
            seed={info.productId}
            className="h-16 w-16 shrink-0 rounded-xl transition duration-200 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-soft to-peach text-ink-soft transition duration-200 group-hover:scale-105">
            <Package size={22} />
          </span>
        )}
      </a>
      <div className="min-w-0 flex-1">
        <a
          href={productHref}
          className="block truncate font-display text-base font-bold text-ink transition hover:text-orange"
          title="Bấm để xem sản phẩm trong Chợ Đồ Chơi"
        >
          {title || `Vật phẩm ${item.sku}`}
        </a>
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

/** Tiến trình đơn online có bước thanh toán; COD đi thẳng từ CREATED sang PROCESSING. */
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
  const isCod = order.paymentMethod === 'COD' || order.onlinePaymentRequired === false
  const flow: OrderStatus[] = isCod ? ['CREATED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RECEIVED'] : ORDER_FLOW
  const normalizedStatus = (order.status === 'IN_TRANSIT' ? 'SHIPPED' : order.status) as OrderStatus
  const current = flow.indexOf(normalizedStatus)
  const changedAtByStatus = new Map<string, string>()

  for (const entry of [...history].sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())) {
    if (!changedAtByStatus.has(entry.toStatus)) changedAtByStatus.set(entry.toStatus, entry.changedAt)
  }

  const stepTime = (status: string) => {
    const value =
      changedAtByStatus.get(status) ??
      (status === 'CREATED' || status === 'PENDING_PAYMENT' ? order.createdAt : undefined)
    if (value) return { value, label: formatDateTime(value) }
    if (historyLoading) return { value: undefined, label: 'Đang tải…' }
    if (historyError) return { value: undefined, label: 'Không tải được' }
    return { value: undefined, label: 'Chưa cập nhật' }
  }

  const n = flow.length
  const progress = closed || current < 0 ? 0 : current / (n - 1)
  const currentMeta = statusMeta(order.status)

  return (
    <div>
      {/* Desktop: ngang */}
      <div className="relative hidden sm:block">
        <div
          aria-hidden="true"
          className="absolute top-6 h-1.5 -translate-y-1/2 rounded-full bg-surface-high"
          style={{ left: `calc(100% / ${2 * n})`, right: `calc(100% / ${2 * n})` }}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet via-orange to-orange transition-[width] duration-700"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {flow.map((s, i) => (
            <TimelineStep key={s} status={s} index={i} current={closed ? -1 : current} time={stepTime(s)} />
          ))}
        </ol>
      </div>

      {/* Mobile: dọc */}
      <ol className="relative space-y-5 sm:hidden">
        <span
          aria-hidden="true"
          className="absolute bottom-6 left-6 top-6 w-1 -translate-x-1/2 rounded-full bg-surface-high"
        >
          <span
            className="block w-full rounded-full bg-gradient-to-b from-violet to-orange transition-[height] duration-700"
            style={{ height: `${progress * 100}%` }}
          />
        </span>
        {flow.map((s, i) => (
          <TimelineStep key={s} status={s} index={i} current={closed ? -1 : current} time={stepTime(s)} vertical />
        ))}
      </ol>

      {closed && (
        <p className="mt-6 flex items-center gap-3 rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-danger">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70">
            <X size={16} />
          </span>
          {currentMeta.hint}
        </p>
      )}
      {!closed && currentMeta.hint && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-violet-soft bg-gradient-to-r from-violet-soft/60 to-peach/50 px-4 py-3">
          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-orange shadow-soft">
            <StepIcon status={normalizedStatus} size={16} />
          </span>
          <div className="min-w-0">
            <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-violet">
              Hiện tại · {currentMeta.label}
            </p>
            <p className="text-sm text-ink">{currentMeta.hint}</p>
          </div>
        </div>
      )}
    </div>
  )
}

const STEP_ICONS: Record<string, typeof Package> = {
  CREATED: ClipboardList,
  PENDING_PAYMENT: Wallet,
  PAID: CreditCard,
  PROCESSING: Package,
  SHIPPED: Truck,
  IN_TRANSIT: Truck,
  DELIVERED: MapPin,
  RECEIVED: PartyPopper,
}

function StepIcon({ status, size = 18 }: { status: string; size?: number }) {
  const Icon = STEP_ICONS[status] ?? Package
  return <Icon size={size} />
}

function TimelineStep({
  status,
  index,
  current,
  time,
  vertical = false,
}: {
  status: OrderStatus
  index: number
  current: number
  time: { value?: string; label: string }
  vertical?: boolean
}) {
  const done = current > index
  const active = current === index
  const m = statusMeta(status)

  const dot = (
    <span className="relative z-10 grid h-12 w-12 shrink-0 place-items-center">
      {active && <span className="absolute inset-0 rounded-full bg-orange/30 motion-safe:animate-ping" />}
      <span
        className={`relative grid h-12 w-12 place-items-center rounded-full border-4 border-white transition ${
          active
            ? 'bg-orange text-white shadow-lift'
            : done
              ? 'bg-gradient-to-br from-violet to-[#8b6cff] text-white shadow-soft'
              : 'bg-surface-low text-ink-soft/70'
        }`}
      >
        {done ? <Check size={18} strokeWidth={3} /> : <StepIcon status={status} />}
      </span>
    </span>
  )

  const text = (
    <>
      <span
        className={`font-label text-[13px] font-semibold ${active ? 'text-orange' : done ? 'text-ink' : 'text-ink-soft'}`}
      >
        {m.label}
      </span>
      <time
        dateTime={time.value}
        className={`mt-0.5 font-label text-[11px] leading-tight ${time.value ? 'text-ink-soft' : 'text-ink-soft/55'}`}
      >
        {time.label}
      </time>
    </>
  )

  if (vertical) {
    return (
      <li className="relative flex items-center gap-4" aria-current={active ? 'step' : undefined}>
        {dot}
        <span className="flex min-w-0 flex-col">{text}</span>
      </li>
    )
  }

  return (
    <li className="flex flex-col items-center px-1 text-center" aria-current={active ? 'step' : undefined}>
      {dot}
      <span className="mt-3 flex flex-col items-center">{text}</span>
    </li>
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
