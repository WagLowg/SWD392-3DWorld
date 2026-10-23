import { ArrowLeft, MapPin, Truck, Undo2 } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDateTime } from '../../../shared/format'
import { ErrorScreen } from '../../../shared/ui/ErrorScreen'
import { ApiNote, Breadcrumbs } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import {
  OrderItemRow,
  OrderMoney,
  OrderStatusBadge,
  OrderTimeline,
  orderCode,
  REFUNDABLE,
  ShipmentStatusBadge,
  StorefrontLabel,
} from '../components/OrderParts'
import { PayOrderButton } from '../components/PayOrderButton'
import { useBuyerShipments, useMyOrders } from '../hooks/useOrders'
import { useOrderPaymentsStore } from '../stores/order-payments.store'

/** MP 025 · Chi Tiết Đơn Hàng Người Mua (lấy từ /api/orders/mine — chưa có API chi tiết riêng). */
export function OrderDetailPage() {
  const orderId = Number(useParams().orderId)
  const orders = useMyOrders()
  const order = orders.data?.find((o) => o.id === orderId)
  const shipments = useBuyerShipments(order ? orderId : undefined)
  const payment = useOrderPaymentsStore((s) => s.byOrder[orderId])

  useEffect(() => {
    document.title = `Đơn ${orderCode(orderId)} · 3DWorld`
  }, [orderId])

  return (
    <QueryState isLoading={orders.isLoading} error={orders.error} onRetry={() => orders.refetch()}>
      {!order ? (
        <ErrorScreen kind="404" detail={`Không tìm thấy đơn ${orderCode(orderId)} trong tài khoản của bạn.`} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Breadcrumbs
              items={[
                {
                  label: 'Đơn hàng của tôi',
                  render: (l) => (
                    <Link to="/orders" className="hover:text-violet">
                      {l}
                    </Link>
                  ),
                },
                { label: `Chi tiết ${orderCode(order.id)}` },
              ]}
            />
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-label text-xs font-semibold shadow-soft"
            >
              <ArrowLeft size={14} /> Quay lại danh sách
            </Link>
          </div>

          <section className="mt-4 grid gap-4 rounded-[2rem] bg-white/95 p-6 shadow-soft sm:grid-cols-4">
            <Info
              label="Mã đơn physical"
              value={<span className="font-display text-2xl font-bold">{orderCode(order.id)}</span>}
            />
            <Info label="Xưởng chế tác" value={<StorefrontLabel id={order.storefrontId} />} />
            <Info label="Trạng thái" value={<OrderStatusBadge status={order.status} />} />
            <Info label="Đặt lúc" value={<span className="font-semibold">{formatDateTime(order.createdAt)}</span>} />
          </section>

          <section className="mt-6 rounded-[2rem] bg-white/95 p-6 shadow-soft sm:p-8">
            <h2 className="font-display text-xl font-bold">Tiến Trình Đơn Hàng</h2>
            <div className="mt-6">
              <OrderTimeline order={order} />
            </div>
          </section>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
                <h2 className="font-display text-xl font-bold">Vật phẩm trong đơn ({order.items.length})</h2>
                <ul className="mt-4 space-y-2">
                  {order.items.map((i) => (
                    <OrderItemRow key={i.id} item={i} />
                  ))}
                </ul>
              </section>

              <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
                    <Truck size={19} className="text-teal" /> Vận đơn
                  </h2>
                  {!!shipments.data?.length && (
                    <Link to={`/orders/${order.id}/tracking`} className="font-label text-sm font-semibold text-violet">
                      Theo dõi chi tiết →
                    </Link>
                  )}
                </div>
                {shipments.isLoading ? (
                  <div className="mt-4 h-16 animate-pulse rounded-2xl bg-surface-low" />
                ) : shipments.data?.length ? (
                  <ul className="mt-4 space-y-2">
                    {shipments.data.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-low p-4"
                      >
                        <span>
                          <span className="block font-semibold">{s.carrierName}</span>
                          <span className="font-mono text-xs text-violet">{s.trackingNumber}</span>
                        </span>
                        <ShipmentStatusBadge status={s.status} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 rounded-2xl bg-surface-low p-4 text-sm text-ink-soft">
                    Xưởng chưa tạo vận đơn. Vận đơn xuất hiện khi kiện hàng được bàn giao cho đơn vị vận chuyển.
                  </p>
                )}
              </section>

              <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
                <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
                  <MapPin size={19} className="text-orange" /> Địa chỉ nhận hàng
                </h2>
                <ApiNote className="mt-3">
                  OrderResponse chưa trả bản chụp địa chỉ giao hàng (shippingAddressSnapshot) — sẽ hiển thị khi Backend
                  bổ sung.
                </ApiNote>
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-28">
              <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
                <h2 className="font-display text-xl font-bold">Thanh toán</h2>
                <div className="mt-4">
                  <OrderMoney order={order} />
                </div>
                {payment && (
                  <p className="mt-3 rounded-xl bg-surface-low px-3 py-2 font-mono text-[11px] text-ink-soft">
                    Giao dịch ZaloPay #{payment.transactionId}
                  </p>
                )}
                <div className="mt-5 grid gap-2">
                  {order.status === 'PENDING_PAYMENT' && (
                    <PayOrderButton orderId={order.id} amount={order.totalAmount} className="justify-center" />
                  )}
                  {REFUNDABLE.includes(order.status) && (
                    <Link
                      to={`/refunds/new?orderId=${order.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-surface-low px-5 py-2.5 font-label text-sm font-semibold hover:bg-surface-high"
                    >
                      <Undo2 size={15} /> Yêu cầu hoàn tiền
                    </Link>
                  )}
                </div>
                {['CREATED', 'PENDING_PAYMENT'].includes(order.status) && (
                  <ApiNote className="mt-3">
                    Người mua chưa có API huỷ đơn; đơn chờ thanh toán quá hạn sẽ tự huỷ.
                  </ApiNote>
                )}
              </section>
            </aside>
          </div>
        </>
      )}
    </QueryState>
  )
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-ink-soft">{label}</p>
      <div className="mt-1.5">{value}</div>
    </div>
  )
}
