import { AlertCircle, ArrowRight, Calendar, Hammer, Search, Truck, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { ApiNote, PageHeading } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { OrderItemRow, OrderStatusBadge, orderCode, StorefrontLabel } from '../components/OrderParts'
import { SellerOrderActions } from '../components/SellerActions'
import { useSellerOrders } from '../hooks/useOrders'
import { STATUS_FILTERS } from '../lib/status'
import type { Order } from '../types/order.types'

const EARNING = ['PAID', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RECEIVED']

/** MP 047 · Danh Sách Đơn Chế Tác (người bán). */
export function SellerOrdersPage() {
  const orders = useSellerOrders()
  const [params, setParams] = useSearchParams()
  const filter = params.get('status') ?? ''
  const [q, setQ] = useState('')

  useEffect(() => {
    document.title = 'Quản lý đơn chế tác · 3DWorld'
  }, [])

  const all = useMemo(
    () => [...(orders.data ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [orders.data],
  )
  const count = (s: string[]) => all.filter((o) => s.includes(o.status)).length
  const revenue = all.filter((o) => EARNING.includes(o.status)).reduce((s, o) => s + (Number(o.totalAmount) || 0), 0)
  const active = STATUS_FILTERS.find((f) => f.value === filter) ?? STATUS_FILTERS[0]
  const term = q.trim().toLowerCase()
  const visible = all.filter(
    (o) =>
      (!active.match.length || active.match.includes(o.status)) &&
      (!term ||
        orderCode(o.id).toLowerCase().includes(term) ||
        o.items.some((i) => i.sku.toLowerCase().includes(term))),
  )

  return (
    <>
      <PageHeading
        eyebrow="Seller orders · đơn chế tác xưởng"
        title="Quản Lý Đơn Chế Tác"
        accent="Tiếp Nhận, Đóng Gói & Bàn Giao."
        description="Seller tiếp nhận, soạn hàng và xác nhận bàn giao. Hệ thống tự tạo vận đơn GHTK; Staff phụ trách các trạng thái vận chuyển tiếp theo."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Chờ tiếp nhận"
          value={count(['PAID'])}
          icon={AlertCircle}
          tone="bg-peach text-orange-deep"
          hint="Đơn đã thanh toán"
        />
        <Kpi
          label="Đang soạn hàng"
          value={count(['PROCESSING'])}
          icon={Hammer}
          tone="bg-violet-soft text-violet"
          hint="Cần đóng gói và bàn giao"
        />
        <Kpi
          label="Đã bàn giao / đang giao"
          value={count(['SHIPPED', 'IN_TRANSIT'])}
          icon={Truck}
          tone="bg-teal-soft text-teal"
          hint="Chờ kết quả giao"
        />
        <Kpi
          label="Giá trị đơn đã thanh toán"
          value={formatVnd(revenue)}
          icon={Wallet}
          tone="bg-mint text-[#0f5132]"
          hint="Tạm tính, chưa trừ phí sàn"
        />
      </div>

      <div className="mt-6 space-y-4 rounded-[2rem] bg-white/90 p-4 shadow-soft sm:p-5">
        <div className="flex items-center gap-3 rounded-full bg-surface-low px-4">
          <Search size={18} className="text-ink-soft" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã đơn (#ORD-…) hoặc SKU"
            aria-label="Tìm đơn"
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={f.value === active.value}
              onClick={() => setParams(f.value ? { status: f.value } : {})}
              className={`shrink-0 rounded-full px-4 py-2 font-label text-xs font-semibold ${
                f.value === active.value ? 'bg-ink text-white' : 'bg-surface-low text-ink-soft hover:bg-surface-high'
              }`}
            >
              {f.label} ({f.match.length ? count(f.match) : all.length})
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <QueryState isLoading={orders.isLoading} error={orders.error} onRetry={() => orders.refetch()}>
          {!visible.length ? (
            <StatusBlock
              tone="empty"
              title={all.length ? 'Không có đơn phù hợp' : 'Chưa có đơn chế tác'}
              body={
                all.length
                  ? 'Thử bộ lọc hoặc từ khoá khác.'
                  : 'Đơn sẽ xuất hiện khi người mua đặt sản phẩm của gian hàng. Nếu bạn chưa có gian hàng, hãy đăng ký người bán.'
              }
            />
          ) : (
            visible.map((o) => <SellerOrderCard key={o.id} order={o} />)
          )}
        </QueryState>
      </div>
    </>
  )
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string
  value: number | string
  icon: typeof Truck
  tone: string
  hint: string
}) {
  return (
    <div className="rounded-[1.75rem] bg-white/95 p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-ink-soft">{label}</p>
        <span className={`grid h-10 w-10 place-items-center rounded-full ${tone}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      <p className="text-xs text-ink-soft">{hint}</p>
    </div>
  )
}

function SellerOrderCard({ order: o }: { order: Order }) {
  return (
    <article className="rounded-[2rem] bg-white/95 p-5 shadow-soft sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/seller/orders/${o.id}`} className="font-display text-xl font-bold hover:text-violet">
            {orderCode(o.id)}
          </Link>
          <StorefrontLabel id={o.storefrontId} />
          {o.paymentMethod === 'COD' && (
            <span className="rounded-full bg-peach px-2.5 py-1 font-label text-[10px] font-semibold text-orange-deep">
              COD
            </span>
          )}
          <OrderStatusBadge status={o.status} />
        </div>
        <span className="inline-flex items-center gap-1 font-label text-xs text-ink-soft">
          <Calendar size={13} /> {formatDateTime(o.createdAt)}
        </span>
      </header>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ul className="space-y-2">
          {o.items.map((i) => (
            <OrderItemRow key={i.id} item={i} />
          ))}
        </ul>
        <div className="flex flex-col justify-between gap-3 rounded-2xl bg-surface-low p-4 text-sm">
          <ApiNote>Vận đơn GHTK được hệ thống tự tạo; Seller không nhập hãng hoặc mã vận đơn thủ công.</ApiNote>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Phí ship xưởng</dt>
              <dd>{formatVnd(o.shippingFee)}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-ink-soft">Tổng thu đơn con</dt>
              <dd className="font-display text-2xl font-bold text-orange-deep">{formatVnd(o.totalAmount)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Link
          to={`/seller/orders/${o.id}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-4 py-2.5 font-label text-xs font-semibold hover:bg-surface-high"
        >
          Xem chi tiết đơn hàng <ArrowRight size={13} />
        </Link>
        <SellerOrderActions order={o} compact />
      </footer>
    </article>
  )
}
