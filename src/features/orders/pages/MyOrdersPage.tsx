import { ArrowRight, Calendar, CheckCircle2, RotateCcw, Search, ShieldCheck, Truck, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { ApiNote, PageHeading } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { OrderItemRow, OrderStatusBadge, orderCode, REFUNDABLE, StorefrontLabel } from '../components/OrderParts'
import { PayOrderButton } from '../components/PayOrderButton'
import { useMyOrders } from '../hooks/useOrders'
import { STATUS_FILTERS } from '../lib/status'
import type { Order } from '../types/order.types'

/** MP 024 · Đơn Hàng Của Tôi */
export function MyOrdersPage() {
  const orders = useMyOrders()
  const [params, setParams] = useSearchParams()
  const filter = params.get('status') ?? ''
  const [q, setQ] = useState('')

  useEffect(() => {
    document.title = 'Đơn hàng của tôi · 3DWorld'
  }, [])

  const all = useMemo(
    () => [...(orders.data ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [orders.data],
  )
  const counts = Object.fromEntries(
    STATUS_FILTERS.map((f) => [
      f.value,
      f.match.length ? all.filter((o) => f.match.includes(o.status)).length : all.length,
    ]),
  )
  const active = STATUS_FILTERS.find((f) => f.value === filter) ?? STATUS_FILTERS[0]
  const term = q.trim().toLowerCase()
  const visible = all.filter(
    (o) =>
      (!active.match.length || active.match.includes(o.status)) &&
      (!term ||
        orderCode(o.id).toLowerCase().includes(term) ||
        String(o.id).includes(term) ||
        o.items.some((i) => i.sku.toLowerCase().includes(term))),
  )

  return (
    <>
      <PageHeading
        eyebrow="Quản trị đơn hàng vật lý"
        title="Đơn Hàng Của Tôi"
        accent="Theo Dõi Đơn Vật Lý Đa Xưởng."
        description="Mỗi xưởng chế tác là một đơn con riêng với lộ trình vận chuyển và trạng thái thanh toán độc lập."
      />

      <div className="mt-8 space-y-4 rounded-[2rem] bg-white/90 p-4 shadow-soft sm:p-5">
        <div className="flex items-center gap-3 rounded-full bg-surface-low px-4">
          <Search size={18} className="text-ink-soft" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã đơn (#ORD-…) hoặc SKU"
            aria-label="Tìm đơn hàng"
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
                f.value === active.value ? 'bg-orange text-white' : 'bg-surface-low text-ink-soft hover:bg-surface-high'
              }`}
            >
              {f.label} ({counts[f.value] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <QueryState isLoading={orders.isLoading} error={orders.error} onRetry={() => orders.refetch()}>
          {!visible.length ? (
            <StatusBlock
              tone="empty"
              title={all.length ? 'Không có đơn phù hợp' : 'Bạn chưa có đơn hàng nào'}
              body={
                all.length
                  ? 'Thử bộ lọc hoặc từ khoá khác.'
                  : 'Khám phá Chợ Đồ Chơi và đặt vật phẩm in 3D đầu tiên nhé.'
              }
              action={
                <a
                  href="/marketplace/"
                  className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
                >
                  Đến Chợ Đồ Chơi
                </a>
              }
            />
          ) : (
            visible.map((o) => <OrderCard key={o.id} order={o} />)
          )}
        </QueryState>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: 'Bảo vệ người mua',
            body: 'Yêu cầu hoàn tiền khi sản phẩm lỗi, vỡ hoặc sai mô tả.',
          },
          { icon: Truck, title: 'Đa xưởng phân tách', body: 'Mỗi xưởng giao kiện riêng, bạn theo dõi từng vận đơn.' },
          {
            icon: RotateCcw,
            title: 'Tự huỷ đơn quá hạn',
            body: 'Đơn chờ thanh toán quá hạn sẽ tự huỷ và giải phóng tồn kho.',
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-3 rounded-[1.75rem] bg-white/80 p-5 shadow-soft">
            <Icon size={20} className="shrink-0 text-violet" />
            <span>
              <span className="block font-display font-bold">{title}</span>
              <span className="block text-xs text-ink-soft">{body}</span>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

function OrderCard({ order: o }: { order: Order }) {
  const shipped = ['SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RECEIVED', 'RETURNED'].includes(o.status)
  return (
    <article className="rounded-[2rem] bg-white/95 p-5 shadow-soft sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/orders/${o.id}`} className="font-display text-xl font-bold hover:text-violet">
            {orderCode(o.id)}
          </Link>
          <StorefrontLabel id={o.storefrontId} />
          {o.paymentMethod === 'COD' && (
            <span className="rounded-full bg-peach px-2.5 py-1 font-label text-[10px] font-semibold text-orange-deep">
              COD
            </span>
          )}
        </div>
        <OrderStatusBadge status={o.status} />
      </header>
      <ul className="mt-4 space-y-2">
        {o.items.map((i) => (
          <OrderItemRow key={i.id} item={i} />
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 font-label text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1">
          <Calendar size={13} /> Đặt lúc {formatDateTime(o.createdAt)}
        </span>
        <span>Phí ship: {formatVnd(o.shippingFee)}</span>
        <span className="font-semibold text-ink">Tổng thanh toán: {formatVnd(o.totalAmount)}</span>
      </div>
      {o.status === 'DELIVERED' && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-peach/50 p-4 text-sm">
          <CheckCircle2 size={18} className="text-orange-deep" />
          <span className="flex-1">Kiện hàng đã giao. Kiểm tra sản phẩm và gửi yêu cầu hoàn tiền nếu có sự cố.</span>
          <ApiNote>Staff sẽ đối soát GHTK và cập nhật trạng thái xác nhận nhận hàng.</ApiNote>
        </div>
      )}
      <footer className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        {REFUNDABLE.includes(o.status) && (
          <Link
            to={`/refunds?orderId=${o.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-4 py-2.5 font-label text-xs font-semibold hover:bg-surface-high"
          >
            <Undo2 size={14} /> Yêu cầu hoàn tiền
          </Link>
        )}
        {shipped && (
          <Link
            to={`/orders/${o.id}/tracking`}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-4 py-2.5 font-label text-xs font-semibold hover:bg-surface-high"
          >
            <Truck size={14} /> Tra cứu kiện hàng
          </Link>
        )}
        {o.status === 'PENDING_PAYMENT' && o.paymentMethod !== 'COD' && o.onlinePaymentRequired !== false && (
          <PayOrderButton orderId={o.id} amount={o.totalAmount} />
        )}
        <Link
          to={`/orders/${o.id}`}
          className="inline-flex items-center gap-2 rounded-full bg-ink py-1.5 pl-4 pr-1.5 font-label text-xs font-semibold text-white hover:bg-violet"
        >
          Xem chi tiết đơn
          <span className="grid h-7 w-7 place-items-center rounded-full bg-orange">
            <ArrowRight size={13} />
          </span>
        </Link>
      </footer>
    </article>
  )
}
