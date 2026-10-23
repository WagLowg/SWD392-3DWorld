import { ArrowLeft, ArrowRight, MapPin, Truck } from 'lucide-react'
import { useEffect } from 'react'
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
  ShipmentStatusBadge,
  StorefrontLabel,
} from '../components/OrderParts'
import { SellerOrderActions, ShipmentEventActions } from '../components/SellerActions'
import { useSellerOrders, useSellerShipments } from '../hooks/useOrders'

/** MP 048 · Chi Tiết Đơn Chế Tác & Vận Chuyển (người bán). */
export function SellerOrderDetailPage() {
  const orderId = Number(useParams().orderId)
  const orders = useSellerOrders()
  const order = orders.data?.find((o) => o.id === orderId)
  const shipments = useSellerShipments(order ? orderId : undefined)

  useEffect(() => {
    document.title = `Đơn chế tác ${orderCode(orderId)} · 3DWorld`
  }, [orderId])

  return (
    <QueryState isLoading={orders.isLoading} error={orders.error} onRetry={() => orders.refetch()}>
      {!order ? (
        <ErrorScreen kind="404" detail={`Không tìm thấy đơn ${orderCode(orderId)} trong gian hàng của bạn.`} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Breadcrumbs
              items={[
                {
                  label: 'Đơn chế tác',
                  render: (l) => (
                    <Link to="/seller/orders" className="hover:text-violet">
                      {l}
                    </Link>
                  ),
                },
                { label: orderCode(order.id) },
              ]}
            />
            <Link
              to="/seller/orders"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-label text-xs font-semibold shadow-soft"
            >
              <ArrowLeft size={14} /> Danh sách đơn
            </Link>
          </div>

          <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-white/95 p-6 shadow-soft">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-bold">{orderCode(order.id)}</h1>
              <StorefrontLabel id={order.storefrontId} />
              <OrderStatusBadge status={order.status} />
            </div>
            <span className="font-label text-xs text-ink-soft">Tạo lúc {formatDateTime(order.createdAt)}</span>
          </section>

          <section className="mt-6 rounded-[2rem] bg-white/95 p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold">Tiến trình & thao tác</h2>
              <SellerOrderActions order={order} />
            </div>
            <div className="mt-6">
              <OrderTimeline order={order} />
            </div>
          </section>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
                <h2 className="font-display text-xl font-bold">Vật phẩm cần chế tác ({order.items.length})</h2>
                <ul className="mt-4 space-y-2">
                  {order.items.map((i) => (
                    <OrderItemRow key={i.id} item={i} />
                  ))}
                </ul>
              </section>

              <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
                    <Truck size={19} className="text-teal" /> Vận đơn
                  </h2>
                  {!!shipments.data?.length && (
                    <Link
                      to={`/seller/shipments/${order.id}`}
                      className="inline-flex items-center gap-1 font-label text-sm font-semibold text-violet"
                    >
                      Chi tiết vận đơn <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
                <QueryState isLoading={shipments.isLoading} error={shipments.error} onRetry={() => shipments.refetch()}>
                  {shipments.data?.length ? (
                    <ul className="mt-4 space-y-3">
                      {shipments.data.map((s) => (
                        <li key={s.id} className="space-y-3 rounded-2xl bg-surface-low p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              <span className="block font-semibold">{s.carrierName}</span>
                              <span className="font-mono text-xs text-violet">{s.trackingNumber}</span>
                            </span>
                            <ShipmentStatusBadge status={s.status} />
                          </div>
                          <ShipmentEventActions shipment={s} orderId={order.id} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 rounded-2xl bg-surface-low p-4 text-sm text-ink-soft">
                      Chưa có vận đơn. Khi đơn đã thanh toán hoặc đang chế tác, bấm “Tạo vận đơn bưu tá” để bàn giao
                      kiện hàng.
                    </p>
                  )}
                </QueryState>
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-28">
              <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
                <h2 className="font-display text-xl font-bold">Doanh thu đơn con</h2>
                <div className="mt-4">
                  <OrderMoney order={order} />
                </div>
              </section>
              <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
                <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
                  <MapPin size={17} className="text-orange" /> Người nhận
                </h2>
                <ApiNote className="mt-3">OrderResponse chưa trả tên / SĐT / địa chỉ người nhận cho người bán.</ApiNote>
              </section>
            </aside>
          </div>
        </>
      )}
    </QueryState>
  )
}
