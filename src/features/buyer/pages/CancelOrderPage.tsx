import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatVnd } from '../../../shared/lib/format'
import { ErrorScreen } from '../../../shared/ui/ErrorScreen'
import { inputClass } from '../../../shared/ui/form'
import { Btn, DetailLayout, Hero, MoneyRows, Section } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { OrderItemRow, OrderStatusBadge, orderCode } from '../../orders/components/OrderParts'
import { useOrder } from '../../orders/hooks/useOrders'
import { useCancelRequest } from '../hooks/useBuyer'

const REASONS = ['Đặt nhầm phiên bản / số lượng', 'Muốn đổi địa chỉ giao hàng', 'Thời gian chế tác quá lâu', 'Tìm được sản phẩm khác', 'Lý do khác']

const MATRIX = [
  { stage: 'Trước chế tác', when: 'Chờ thanh toán / đã thanh toán', result: 'Huỷ ngay, hoàn 100%', tone: 'bg-mint text-[#0f5132]' },
  { stage: 'Đang chế tác', when: 'Xưởng đã tiếp nhận in', result: 'Cần xưởng đồng ý, có thể trừ chi phí vật liệu', tone: 'bg-peach text-orange-deep' },
  { stage: 'Đã bàn giao ship', when: 'Đã có vận đơn', result: 'Không huỷ được — dùng yêu cầu hoàn tiền', tone: 'bg-[#ffdad6] text-danger' },
]

/** MP 026 · Huỷ Đơn Hàng Con — POST /api/orders/{id}/cancel (chỉ đơn chưa thanh toán). */
export function CancelOrderPage() {
  const orderId = Number(useParams().orderId)
  const orders = useOrder(orderId)
  const cancel = useCancelRequest()
  const uid = useId()
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  const order = orders.data

  useEffect(() => {
    document.title = `Huỷ đơn ${orderCode(orderId)} · 3DWorld`
  }, [orderId])

  return (
    <QueryState isLoading={orders.isLoading} error={orders.error}>
        {!order ? (
          <ErrorScreen kind="404" detail={`Không tìm thấy đơn ${orderCode(orderId)}.`} />
        ) : (
          <>
            <Hero code="MP 026" eyebrow="Huỷ đơn hàng con" title={`Huỷ Đơn ${orderCode(order.id)}`} accent="Ma Trận Điều Kiện Huỷ & Hoàn Ký Quỹ." />
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {MATRIX.map((m) => (
                <div key={m.stage} className={`rounded-[1.75rem] p-5 ${m.tone}`}>
                  <p className="font-display text-lg font-bold">{m.stage}</p>
                  <p className="text-xs opacity-80">{m.when}</p>
                  <p className="mt-2 text-sm font-semibold">{m.result}</p>
                </div>
              ))}
            </div>
            <DetailLayout
              main={
                sent ? (
                  <Section title="Đã gửi yêu cầu huỷ">
                    <p className="flex items-center gap-2 rounded-2xl bg-mint p-4 text-sm text-[#0f5132]">
                      <CheckCircle2 size={18} /> Đơn {sent} đã được huỷ, tồn kho giữ chỗ đã được giải phóng.
                    </p>
                    <div className="mt-4">
                      <Btn to={`/orders/${order.id}`}>Về chi tiết đơn</Btn>
                    </div>
                  </Section>
                ) : (
                  <Section title="Xác nhận yêu cầu huỷ đơn con" aside={<OrderStatusBadge status={order.status} />}>
                    <ul className="space-y-2">
                      {order.items.map((i) => (
                        <OrderItemRow key={i.id} item={i} />
                      ))}
                    </ul>
                    {order.status === 'CANCELLED' ? (
                      <p className="mt-4 rounded-2xl bg-surface-low p-4 text-sm text-ink-soft">
                        Đơn đã huỷ{order.cancellationReason ? ` — lý do: ${order.cancellationReason}` : ''}.
                      </p>
                    ) : !['CREATED', 'PENDING_PAYMENT'].includes(order.status) ? (
                      <p className="mt-4 flex gap-2 rounded-2xl bg-[#ffdad6] p-4 text-sm text-danger">
                        <AlertTriangle size={16} className="shrink-0" /> Đơn đã thanh toán nên không huỷ trực tiếp được. Hãy dùng yêu cầu hoàn tiền.
                        <Btn to={`/refunds/new?orderId=${order.id}`} size="sm">
                          Yêu cầu hoàn tiền
                        </Btn>
                      </p>
                    ) : (
                      <>
                        <fieldset className="mt-5">
                          <legend className="mb-2 font-label text-xs font-semibold text-ink-soft">Lý do đề nghị huỷ *</legend>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {REASONS.map((r) => (
                              <label key={r} className={`flex cursor-pointer items-center gap-2 rounded-2xl p-3 text-sm ${reason === r ? 'bg-peach/60 ring-2 ring-orange' : 'bg-surface-low'}`}>
                                <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-orange" /> {r}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                        <label htmlFor={`${uid}-d`} className="mt-4 block">
                          <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Chi tiết lý do</span>
                          <textarea id={`${uid}-d`} rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} className={inputClass} />
                        </label>
                        <div className="mt-4 flex justify-end gap-2">
                          <Btn to={`/orders/${order.id}`}>Quay lại</Btn>
                          <Btn
                            variant="danger"
                            disabled={!reason || cancel.isPending}
                            onClick={() => cancel.mutate({ orderId: order.id, reason: [reason, detail].filter(Boolean).join(' — ') }, { onSuccess: (r) => setSent(r.requestId) })}
                          >
                            {cancel.isPending ? 'Đang huỷ…' : `Huỷ đơn (${formatVnd(order.totalAmount)})`}
                          </Btn>
                        </div>
                      </>
                    )}
                  </Section>
                )
              }
              aside={
                <Section title="Hệ quả & hoàn tiền">
                  <MoneyRows
                    rows={[
                      { label: 'Tiền hàng', value: formatVnd(order.subtotal) },
                      { label: 'Phí ship', value: formatVnd(order.shippingFee) },
                    ]}
                    total={{ label: 'Hoàn tối đa', value: formatVnd(order.totalAmount) }}
                  />
                  <p className="mt-3 text-xs text-ink-soft">Tồn kho giữ chỗ được giải phóng ngay khi huỷ thành công.</p>
                </Section>
              }
            />
          </>
        )}
      </QueryState>
  )
}
