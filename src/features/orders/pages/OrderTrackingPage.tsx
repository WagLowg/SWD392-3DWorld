import { ArrowLeft, Copy, PackageSearch, ShieldCheck, Undo2 } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDateTime } from '../../../shared/format'
import { ErrorScreen } from '../../../shared/ui/ErrorScreen'
import { ApiNote, Breadcrumbs } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { useToast } from '../../../shared/ui/toast'
import { OrderStatusBadge, orderCode, REFUNDABLE, ShipmentStatusBadge } from '../components/OrderParts'
import { ShipmentLog, ShipmentProgress } from '../components/ShipmentTimeline'
import { useBuyerShipments, useMyOrders } from '../hooks/useOrders'
import type { Shipment } from '../types/order.types'

/** MP 027 · Theo Dõi Vận Chuyển Đơn Hàng */
export function OrderTrackingPage() {
  const orderId = Number(useParams().orderId)
  const orders = useMyOrders()
  const order = orders.data?.find((o) => o.id === orderId)
  const shipments = useBuyerShipments(order ? orderId : undefined)

  useEffect(() => {
    document.title = `Theo dõi vận chuyển ${orderCode(orderId)} · 3DWorld`
  }, [orderId])

  return (
    <QueryState isLoading={orders.isLoading} error={orders.error} onRetry={() => orders.refetch()}>
      {!order ? (
        <ErrorScreen kind="404" detail={`Không tìm thấy đơn ${orderCode(orderId)} trong tài khoản của bạn.`} />
      ) : (
        <>
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
              {
                label: `Chi tiết ${orderCode(order.id)}`,
                render: (l) => (
                  <Link to={`/orders/${order.id}`} className="hover:text-violet">
                    {l}
                  </Link>
                ),
              },
              { label: 'Theo dõi vận chuyển' },
            ]}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              to={`/orders/${order.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-label text-xs font-semibold shadow-soft"
            >
              <ArrowLeft size={14} /> Quay lại chi tiết đơn hàng
            </Link>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="mt-6">
            <QueryState isLoading={shipments.isLoading} error={shipments.error} onRetry={() => shipments.refetch()}>
              {!shipments.data?.length ? (
                <StatusBlock
                  tone="empty"
                  title="Chưa có vận đơn"
                  body="Xưởng chưa bàn giao kiện hàng cho đơn vị vận chuyển. Thông tin theo dõi sẽ xuất hiện khi có vận đơn."
                />
              ) : (
                <div className="space-y-6">
                  {shipments.data.map((s) => (
                    <ShipmentPanel key={s.id} orderId={order.id} shipment={s} />
                  ))}
                </div>
              )}
            </QueryState>
          </div>

          <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-white/95 p-6 shadow-soft">
            <div>
              <h2 className="font-display text-xl font-bold">Hành Động Khách Hàng</h2>
              <p className="text-sm text-ink-soft">
                Kiểm tra sản phẩm khi nhận. Nếu lỗi, vỡ hoặc sai mô tả, hãy gửi yêu cầu hoàn tiền.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {REFUNDABLE.includes(order.status) && (
                <Link
                  to={`/refunds/new?orderId=${order.id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-surface-low px-5 py-3 font-label text-sm font-semibold hover:bg-surface-high"
                >
                  <Undo2 size={15} /> Yêu cầu hoàn tiền
                </Link>
              )}
            </div>
            <ApiNote className="w-full">
              Trạng thái vận chuyển, xác nhận nhận hàng và hoàn hàng do Staff đối soát với GHTK rồi cập nhật. Người mua
              chỉ theo dõi hành trình và gửi yêu cầu hoàn tiền khi có sự cố.
            </ApiNote>
          </section>
        </>
      )}
    </QueryState>
  )
}

function ShipmentPanel({ orderId, shipment: s }: { orderId: number; shipment: Shipment }) {
  const toast = useToast()
  const copy = () =>
    navigator.clipboard
      .writeText(s.trackingNumber)
      .then(() => toast('Đã sao chép mã vận đơn.'))
      .catch(() => toast('Không sao chép được.', 'error'))

  return (
    <>
      <section className="grid gap-4 rounded-[2rem] bg-white/95 p-6 shadow-soft sm:grid-cols-4">
        <div>
          <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
            Mã đơn physical
          </p>
          <p className="mt-1 font-display text-2xl font-bold">{orderCode(orderId)}</p>
        </div>
        <div>
          <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
            Mã vận đơn (waybill)
          </p>
          <p className="mt-1 flex items-center gap-2 font-display text-xl font-bold text-violet">
            {s.trackingNumber}
            <button
              type="button"
              onClick={copy}
              aria-label="Sao chép mã vận đơn"
              className="text-ink-soft hover:text-violet"
            >
              <Copy size={15} />
            </button>
          </p>
        </div>
        <div>
          <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
            Hãng chuyển phát
          </p>
          <p className="mt-1 font-display text-xl font-bold">{s.carrierName}</p>
        </div>
        <div>
          <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
            Trạng thái kiện hàng
          </p>
          <div className="mt-1.5">
            <ShipmentStatusBadge status={s.status} />
          </div>
          <p className="mt-1 text-xs text-ink-soft">{formatDateTime(s.deliveredAt ?? s.shippedAt ?? s.createdAt)}</p>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold">Tiến Trình Chuyển Giao Vật Phẩm</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-peach px-3 py-1 font-label text-[11px] font-semibold text-orange-deep">
            <ShieldCheck size={12} /> Đóng gói chống sốc
          </span>
        </div>
        <div className="mt-8">
          <ShipmentProgress shipment={s} />
        </div>
      </section>

      <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft sm:p-8">
        <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
          <PackageSearch size={19} className="text-violet" /> Nhật Ký Lịch Trình
        </h2>
        <div className="mt-6">
          <ShipmentLog shipment={s} />
        </div>
      </section>
    </>
  )
}
