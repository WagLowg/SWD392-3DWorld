import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatVnd } from '../../../shared/format'
import { Btn, Hero, Pill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { OrderItemRow, OrderStatusBadge, orderCode, StorefrontLabel } from '../../orders/components/OrderParts'
import { PayOrderButton } from '../../orders/components/PayOrderButton'
import { useMyOrders } from '../../orders/hooks/useOrders'
import { useOrderPaymentsStore } from '../../orders/stores/order-payments.store'

/** MP 022 · Kết Quả Đơn Hàng Độc Lập — dữ liệu đơn thật (/api/orders/mine?ids=…). */
export function OrderResultPage() {
  const [params] = useSearchParams()
  const ids = (params.get('ids') ?? '').split(',').map(Number).filter(Boolean)
  const orders = useMyOrders()
  const payments = useOrderPaymentsStore((s) => s.byOrder)

  useEffect(() => {
    document.title = 'Kết quả đặt hàng · 3DWorld'
  }, [])

  const list = (orders.data ?? []).filter((o) => !ids.length || ids.includes(o.id)).slice(0, ids.length || 5)
  const paid = list.filter((o) => !['CREATED', 'PENDING_PAYMENT', 'CANCELLED'].includes(o.status)).length
  const failed = list.filter((o) => o.status === 'CANCELLED').length

  return (
    <>
      <Hero
        code="MP 022"
        eyebrow="Kết quả đặt hàng"
        title="Kết Quả Đặt Hàng"
        accent="Xử Lý Độc Lập Từng Đơn Con."
        description="Mỗi đơn con được thanh toán và xử lý riêng — một đơn lỗi không ảnh hưởng các đơn khác."
      />
      <QueryState isLoading={orders.isLoading} error={orders.error}>
        {!list.length ? (
          <StatusBlock tone="empty" title="Không tìm thấy đơn" body="Không có đơn nào khớp với kết quả này." />
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              <Pill tone="green">{paid} đã thanh toán</Pill>
              <Pill tone="orange">{list.length - paid - failed} chờ thanh toán</Pill>
              {failed > 0 && <Pill tone="danger">{failed} đã huỷ</Pill>}
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {list.map((o) => {
                const pending = o.status === 'PENDING_PAYMENT' || o.status === 'CREATED'
                const Icon = pending ? Clock : o.status === 'CANCELLED' ? XCircle : CheckCircle2
                return (
                  <article key={o.id} className={`rounded-[2rem] bg-white/95 p-6 shadow-soft ${pending ? 'ring-2 ring-orange/50' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <Icon size={20} className={pending ? 'text-orange' : o.status === 'CANCELLED' ? 'text-danger' : 'text-teal'} />
                        <strong className="font-display text-lg">{orderCode(o.id)}</strong>
                        <StorefrontLabel id={o.storefrontId} />
                      </span>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <ul className="mt-4 space-y-2">
                      {o.items.map((i) => (
                        <OrderItemRow key={i.id} item={i} />
                      ))}
                    </ul>
                    <p className="mt-4 flex justify-between text-sm">
                      <span className="text-ink-soft">Tổng đơn con</span>
                      <strong className="font-display text-xl">{formatVnd(o.totalAmount)}</strong>
                    </p>
                    {payments[o.id] && <p className="mt-1 font-mono text-[11px] text-ink-soft">Giao dịch #{payments[o.id].transactionId}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {pending && <PayOrderButton orderId={o.id} amount={o.totalAmount} />}
                      {pending && <Btn to={`/orders/${o.id}/cancel`}>Huỷ đơn con này</Btn>}
                      <Btn to={`/orders/${o.id}`} variant="white">
                        Xem chi tiết
                      </Btn>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </QueryState>
    </>
  )
}
