import { Star } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatDateTime } from '../../../shared/lib/format'
import { ErrorScreen } from '../../../shared/ui/ErrorScreen'
import { inputClass } from '../../../shared/ui/form'
import { AuditTimeline, Btn, DetailLayout, Hero, MockNotice, Section } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { OrderItemRow, OrderStatusBadge, orderCode } from '../../../features/orders/components/OrderParts'
import { useMyOrders } from '../../../features/orders/hooks/useOrders'
import { useReviews, useSaveReview } from '../../../features/buyer/hooks/useBuyer'

/** MP 031 · Nhật Ký Đánh Giá & Xác Nhận Đơn Hàng */
export function OrderReviewPage() {
  const orderId = Number(useParams().orderId)
  const orders = useMyOrders()
  const reviews = useReviews()
  const save = useSaveReview()
  const uid = useId()
  const order = orders.data?.find((o) => o.id === orderId)
  const existing = reviews.data?.find((r) => r.orderId === orderId)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (existing) {
      setRating(existing.rating)
      setComment(existing.comment)
    }
  }, [existing])

  useEffect(() => {
    document.title = `Đánh giá ${orderCode(orderId)} · 3DWorld`
  }, [orderId])

  return (
    <>
      <MockNotice api="POST /api/orders/{id}/review" />
      <QueryState isLoading={orders.isLoading} error={orders.error}>
        {!order ? (
          <ErrorScreen kind="404" detail={`Không tìm thấy đơn ${orderCode(orderId)}.`} />
        ) : (
          <>
            <Hero code="MP 031" eyebrow="Nghiệm thu đơn hàng" title="Đánh Giá Đơn Hàng" accent="Phản Hồi Cho Xưởng Chế Tác." />
            <DetailLayout
              main={
                <>
                  <Section title={`${orderCode(order.id)} · Xưởng #${order.storefrontId}`} aside={<OrderStatusBadge status={order.status} />}>
                    <ul className="space-y-2">
                      {order.items.map((i) => (
                        <OrderItemRow key={i.id} item={i} />
                      ))}
                    </ul>
                  </Section>
                  <Section title="Khung đánh giá & phản hồi thực tế">
                    {!['DELIVERED', 'RECEIVED'].includes(order.status) && (
                      <p className="mb-4 rounded-2xl bg-peach/60 p-3 text-sm text-orange-deep">Chỉ đánh giá được sau khi đơn đã giao.</p>
                    )}
                    <fieldset className="flex gap-1 border-0 p-0">
                      <legend className="sr-only">Số sao</legend>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" aria-pressed={rating === n} aria-label={`${n} sao`} onClick={() => setRating(n)}>
                          <Star size={30} className={n <= rating ? 'fill-orange text-orange' : 'text-line'} />
                        </button>
                      ))}
                    </fieldset>
                    <label htmlFor={`${uid}-c`} className="mt-4 block">
                      <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Nhận xét (≥ 10 ký tự)</span>
                      <textarea id={`${uid}-c`} rows={4} value={comment} onChange={(e) => setComment(e.target.value)} className={inputClass} />
                    </label>
                    <div className="mt-4 flex justify-end">
                      <Btn
                        variant="primary"
                        disabled={comment.trim().length < 10 || save.isPending || !['DELIVERED', 'RECEIVED'].includes(order.status)}
                        onClick={() => save.mutate({ orderId: order.id, product: `${order.items.length} vật phẩm`, storefront: `Xưởng #${order.storefrontId}`, rating, comment: comment.trim() })}
                      >
                        {existing ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
                      </Btn>
                    </div>
                  </Section>
                </>
              }
              aside={
                <>
                  {existing?.reply && (
                    <Section title="Phản hồi từ xưởng">
                      <p className="text-sm italic text-ink-soft">“{existing.reply}”</p>
                    </Section>
                  )}
                  <AuditTimeline
                    entries={[
                      { at: order.createdAt, actor: 'Bạn', action: 'Đặt hàng', tone: 'violet' },
                      ...(existing ? [{ at: existing.at, actor: 'Bạn', action: `Đánh giá ${existing.rating}★`, note: formatDateTime(existing.at), tone: 'orange' as const }] : []),
                    ]}
                    title="Nhật ký đơn hàng"
                  />
                </>
              }
            />
          </>
        )}
      </QueryState>
    </>
  )
}
