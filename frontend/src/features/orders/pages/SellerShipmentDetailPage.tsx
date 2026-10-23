import { ArrowLeft, Camera, PackageSearch } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDateTime } from '../../../shared/format'
import { ErrorScreen } from '../../../shared/ui/ErrorScreen'
import { ApiNote, Breadcrumbs } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { OrderStatusBadge, orderCode, ShipmentStatusBadge } from '../components/OrderParts'
import { ShipmentEventActions } from '../components/SellerActions'
import { ShipmentLog, ShipmentProgress } from '../components/ShipmentTimeline'
import { useSellerOrders, useSellerShipments } from '../hooks/useOrders'

/** MP 050 · Chi Tiết Vận Đơn & Bằng Chứng Giao Nhận (người bán). */
export function SellerShipmentDetailPage() {
  const orderId = Number(useParams().orderId)
  const orders = useSellerOrders()
  const order = orders.data?.find((o) => o.id === orderId)
  const shipments = useSellerShipments(order ? orderId : undefined)

  useEffect(() => {
    document.title = `Vận đơn ${orderCode(orderId)} · 3DWorld`
  }, [orderId])

  return (
    <QueryState isLoading={orders.isLoading} error={orders.error} onRetry={() => orders.refetch()}>
      {!order ? (
        <ErrorScreen kind="404" detail={`Không tìm thấy đơn ${orderCode(orderId)} trong gian hàng của bạn.`} />
      ) : (
        <>
          <Breadcrumbs
            items={[
              {
                label: 'Vận chuyển',
                render: (l) => (
                  <Link to="/seller/shipments" className="hover:text-violet">
                    {l}
                  </Link>
                ),
              },
              { label: `Vận đơn ${orderCode(order.id)}` },
            ]}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              to="/seller/shipments"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-label text-xs font-semibold shadow-soft"
            >
              <ArrowLeft size={14} /> Danh sách vận đơn
            </Link>
            <Link to={`/seller/orders/${order.id}`} className="font-label text-xs font-semibold text-violet">
              Xem đơn chế tác →
            </Link>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="mt-6">
            <QueryState isLoading={shipments.isLoading} error={shipments.error} onRetry={() => shipments.refetch()}>
              {!shipments.data?.length ? (
                <StatusBlock
                  tone="empty"
                  title="Đơn chưa có vận đơn"
                  body="Tạo vận đơn ở trang chi tiết đơn chế tác."
                />
              ) : (
                <div className="space-y-6">
                  {shipments.data.map((s) => (
                    <div key={s.id} className="space-y-6">
                      <section className="grid gap-4 rounded-[2rem] bg-white/95 p-6 shadow-soft sm:grid-cols-4">
                        <Info
                          label="Mã vận đơn"
                          value={<span className="font-display text-xl font-bold text-violet">{s.trackingNumber}</span>}
                        />
                        <Info
                          label="Hãng chuyển phát"
                          value={<span className="font-display text-lg font-bold">{s.carrierName}</span>}
                        />
                        <Info label="Trạng thái" value={<ShipmentStatusBadge status={s.status} />} />
                        <Info
                          label="Tạo lúc"
                          value={<span className="font-semibold">{formatDateTime(s.createdAt)}</span>}
                        />
                      </section>

                      <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft sm:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h2 className="font-display text-xl font-bold">Tiến trình kiện hàng</h2>
                          <ShipmentEventActions shipment={s} orderId={order.id} />
                        </div>
                        <div className="mt-8">
                          <ShipmentProgress shipment={s} />
                        </div>
                      </section>

                      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                        <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
                          <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
                            <PackageSearch size={19} className="text-violet" /> Nhật ký vận đơn
                          </h2>
                          <div className="mt-6">
                            <ShipmentLog shipment={s} />
                          </div>
                        </section>
                        <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
                          <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
                            <Camera size={19} className="text-orange" /> Bằng chứng giao nhận
                          </h2>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            {['Biên lai chữ ký', 'Ảnh hiện trường'].map((t) => (
                              <div
                                key={t}
                                className="grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-line text-center text-xs text-ink-soft"
                              >
                                {t}
                              </div>
                            ))}
                          </div>
                          <ApiNote className="mt-3">Chưa có API lưu ảnh / chữ ký bằng chứng giao nhận.</ApiNote>
                        </section>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </QueryState>
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
