import { ArrowLeft, Boxes, History, MapPin, Truck, Undo2, XCircle } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDateTime } from '../../../shared/format'
import { ErrorScreen } from '../../../shared/ui/ErrorScreen'
import { Breadcrumbs } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import {
  displayOrderCode,
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
import { ShippingAddressSnapshot } from '../components/ShippingAddressSnapshot'
import { useBuyerShipments, useOrder, useOrderHistory, useOrderPackages } from '../hooks/useOrders'
import { statusMeta } from '../lib/status'
import { useOrderPaymentsStore } from '../stores/order-payments.store'

/** MP 025 · Chi Tiết Đơn Hàng Người Mua — GET /api/orders/{id}, /history, /packages, /shipments. */
export function OrderDetailPage() {
  const orderId = Number(useParams().orderId)
  const orders = useOrder(orderId)
  const order = orders.data
  const shipments = useBuyerShipments(order ? orderId : undefined)
  const history = useOrderHistory(order ? orderId : undefined)
  const packages = useOrderPackages(order ? orderId : undefined)
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
                { label: `Chi tiết ${displayOrderCode(order)}` },
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
              value={<span className="font-display text-2xl font-bold">{displayOrderCode(order)}</span>}
            />
            <Info label="Xưởng chế tác" value={<StorefrontLabel id={order.storefrontId} />} />
            <Info label="Trạng thái" value={<OrderStatusBadge status={order.status} />} />
            <Info label="Đặt lúc" value={<span className="font-semibold">{formatDateTime(order.createdAt)}</span>} />
          </section>

          <section className="mt-6 rounded-[2rem] bg-white/95 p-6 shadow-soft sm:p-8">
            <h2 className="font-display text-xl font-bold">Tiến Trình Đơn Hàng</h2>
            <div className="mt-6">
              <OrderTimeline
                order={order}
                history={history.data}
                historyLoading={history.isLoading}
                historyError={history.isError}
              />
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
                    Hệ thống đang khởi tạo vận đơn. Hành trình sẽ xuất hiện sau khi xưởng bàn giao kiện hàng.
                  </p>
                )}
              </section>

              <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
                <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
                  <MapPin size={19} className="text-orange" /> Địa chỉ nhận hàng
                </h2>
                <ShippingAddressSnapshot snapshot={order.shippingAddressSnapshot} />
              </section>

              {!!packages.data?.length && (
                <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
                  <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
                    <Boxes size={19} className="text-violet" /> Kiện hàng ({packages.data.length})
                  </h2>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {packages.data.map((p) => (
                      <li key={p.id} className="rounded-2xl bg-surface-low p-4 text-sm">
                        <p className="font-semibold">
                          Kiện {p.index} · <span className="font-mono text-xs text-violet">{p.code}</span>
                        </p>
                        <p className="text-xs text-ink-soft">
                          Hộp {p.profileCode} · {p.packageWeightGrams} g · {p.items.reduce((s, i) => s + i.quantity, 0)}{' '}
                          món
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
                <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
                  <History size={19} className="text-orange" /> Lịch sử trạng thái
                </h2>
                {history.isLoading ? (
                  <div className="mt-4 h-16 animate-pulse rounded-2xl bg-surface-low" />
                ) : history.data?.length ? (
                  <ol className="mt-4 space-y-3 border-l-2 border-line pl-5">
                    {history.data.map((h) => (
                      <li key={h.id} className="relative text-sm">
                        <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-orange" />
                        <p className="font-semibold">
                          {h.fromStatus ? `${statusMeta(h.fromStatus).label} → ` : ''}
                          {statusMeta(h.toStatus).label}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {formatDateTime(h.changedAt)}
                          {h.reason ? ` · ${h.reason}` : ''}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-4 text-sm text-ink-soft">Chưa có thay đổi trạng thái.</p>
                )}
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
                {order.reservationExpiresAt && order.status === 'PENDING_PAYMENT' && (
                  <p className="mt-3 rounded-xl bg-peach/50 px-3 py-2 text-xs text-orange-deep">
                    Giữ chỗ tồn kho đến {formatDateTime(order.reservationExpiresAt)}
                  </p>
                )}
                {order.autoConfirmDueAt && order.status === 'DELIVERED' && (
                  <p className="mt-3 rounded-xl bg-surface-low px-3 py-2 text-xs text-ink-soft">
                    Hệ thống tự xác nhận nhận hàng lúc {formatDateTime(order.autoConfirmDueAt)}
                  </p>
                )}
                {order.refundDeadlineAt && (
                  <p className="mt-3 rounded-xl bg-teal-soft/60 px-3 py-2 text-xs text-teal">
                    Hạn yêu cầu hoàn tiền: {formatDateTime(order.refundDeadlineAt)}
                  </p>
                )}
                {order.status === 'CANCELLED' && (
                  <p className="mt-3 rounded-xl bg-[#ffdad6] px-3 py-2 text-xs text-danger">
                    Đã huỷ{order.cancelledAt ? ` lúc ${formatDateTime(order.cancelledAt)}` : ''}
                    {order.cancellationReason ? ` — ${order.cancellationReason}` : ''}
                  </p>
                )}
                <div className="mt-5 grid gap-2">
                  {order.status === 'PENDING_PAYMENT' && (
                    <PayOrderButton orderId={order.id} amount={order.totalAmount} className="justify-center" />
                  )}
                  {order.status === 'DELIVERED' && (
                    <span className="rounded-full bg-mint px-5 py-2.5 text-center font-label text-sm font-semibold text-[#0f5132]">
                      Staff đang đối soát xác nhận nhận hàng
                    </span>
                  )}
                  {['CREATED', 'PENDING_PAYMENT'].includes(order.status) && (
                    <Link
                      to={`/orders/${order.id}/cancel`}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-surface-low px-5 py-2.5 font-label text-sm font-semibold text-danger hover:bg-surface-high"
                    >
                      <XCircle size={15} /> Huỷ đơn
                    </Link>
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
