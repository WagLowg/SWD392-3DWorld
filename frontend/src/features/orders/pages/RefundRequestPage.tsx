import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Info, ShieldCheck, Undo2 } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { ApiClientError } from '../../../services/http'
import { formatVnd } from '../../../shared/format'
import { Field, FormError, inputClass, SubmitButton } from '../../../shared/ui/form'
import { ApiNote, PageHeading } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { OrderItemRow, OrderStatusBadge, orderCode, REFUNDABLE } from '../components/OrderParts'
import { useMyOrders, useRefund } from '../hooks/useOrders'
import { useOrderPaymentsStore } from '../stores/order-payments.store'
import type { Order, Payment } from '../types/order.types'

const REASONS = [
  'Sản phẩm bị vỡ / hư hại khi vận chuyển',
  'Sản phẩm lỗi in (nứt lớp, sai kích thước)',
  'Giao sai sản phẩm / sai phiên bản',
  'Không nhận được hàng',
  'Lý do khác',
]

const schema = z.object({
  orderId: z.coerce.number().int().positive('Chọn đơn hàng.'),
  transactionId: z.coerce.number({ message: 'Nhập mã giao dịch.' }).int().positive('Nhập mã giao dịch ZaloPay.'),
  amount: z.coerce.number({ message: 'Nhập số tiền.' }).positive('Số tiền phải lớn hơn 0.'),
  reasonType: z.string().min(1, 'Chọn lý do.'),
  detail: z.string().trim().max(1000, 'Tối đa 1000 ký tự.').optional(),
})
type Values = z.input<typeof schema>

/** MP 028 · Tạo Yêu Cầu Hoàn Tiền (POST /api/payments/{transactionId}/refund). */
export function RefundRequestPage() {
  const orders = useMyOrders()
  const [params] = useSearchParams()

  useEffect(() => {
    document.title = 'Yêu cầu hoàn tiền · 3DWorld'
  }, [])

  const eligible = useMemo(() => (orders.data ?? []).filter((o) => REFUNDABLE.includes(o.status)), [orders.data])

  return (
    <>
      <PageHeading
        eyebrow="Khiếu nại & hoàn tiền"
        title="Yêu Cầu Hoàn Tiền"
        accent="Bảo Vệ Người Mua 3DWorld."
        description="Gửi yêu cầu hoàn tiền cho đơn đã thanh toán khi sản phẩm lỗi, vỡ, sai mô tả hoặc không nhận được hàng. Tiền hoàn về qua cổng ZaloPay."
      />
      <div className="mt-8">
        <QueryState isLoading={orders.isLoading} error={orders.error} onRetry={() => orders.refetch()}>
          {!eligible.length ? (
            <StatusBlock
              tone="empty"
              title="Chưa có đơn đủ điều kiện hoàn tiền"
              body="Chỉ đơn đã thanh toán (từ trạng thái Đã thanh toán trở đi) mới gửi được yêu cầu hoàn tiền."
              action={
                <Link
                  to="/orders"
                  className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
                >
                  Xem đơn hàng
                </Link>
              }
            />
          ) : (
            <RefundForm orders={eligible} initialOrderId={Number(params.get('orderId')) || eligible[0].id} />
          )}
        </QueryState>
      </div>
    </>
  )
}

function RefundForm({ orders, initialOrderId }: { orders: Order[]; initialOrderId: number }) {
  const uid = useId()
  const refund = useRefund()
  const payments = useOrderPaymentsStore((s) => s.byOrder)
  const [result, setResult] = useState<Payment | null>(null)
  const start = orders.find((o) => o.id === initialOrderId) ?? orders[0]
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      orderId: start.id,
      transactionId: payments[start.id]?.transactionId ?? ('' as unknown as number),
      amount: start.totalAmount,
      reasonType: '',
      detail: '',
    },
  })

  const orderId = Number(watch('orderId'))
  const order = orders.find((o) => o.id === orderId) ?? start
  const reasonType = watch('reasonType')

  // Đổi đơn → điền lại số tiền & mã giao dịch đã ghi nhớ
  useEffect(() => {
    setValue('amount', order.totalAmount)
    setValue('transactionId', (payments[order.id]?.transactionId ?? '') as unknown as number)
  }, [order, payments, setValue])

  const submit = handleSubmit(async (raw) => {
    const v = schema.parse(raw)
    if (v.amount > order.totalAmount) {
      setError('amount', { message: `Không vượt quá ${formatVnd(order.totalAmount)}.` })
      return
    }
    try {
      const reason = [v.reasonType, v.detail].filter(Boolean).join(' — ')
      setResult(await refund.mutateAsync({ transactionId: v.transactionId, input: { amount: v.amount, reason } }))
    } catch (e) {
      setError('root', { message: e instanceof ApiClientError ? e.message : 'Không gửi được yêu cầu hoàn tiền.' })
    }
  })

  if (result) {
    return (
      <div className="flex flex-col items-center rounded-[2rem] bg-white/95 px-6 py-14 text-center shadow-soft">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-mint text-[#0f5132]">
          <CheckCircle2 size={36} />
        </span>
        <h2 className="mt-5 font-display text-2xl font-bold">Đã gửi yêu cầu hoàn tiền</h2>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          Yêu cầu hoàn {formatVnd(result.amount)} cho đơn {orderCode(order.id)} đã được gửi tới cổng thanh toán. Trạng
          thái: <strong className="text-ink">{result.status}</strong>.
        </p>
        <p className="mt-1 font-mono text-xs text-ink-soft">
          Mã giao dịch hoàn: #{result.transactionId} · {result.appTransId}
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to={`/orders/${order.id}`}
            className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
          >
            Xem đơn hàng
          </Link>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="rounded-full bg-surface-low px-6 py-3 font-label text-sm font-semibold"
          >
            Gửi yêu cầu khác
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
          <h2 className="font-display text-xl font-bold">1. Chọn đơn hàng</h2>
          <Field id={`${uid}-order`} label="Đơn hàng đã thanh toán *" error={errors.orderId?.message} className="mt-4">
            <select id={`${uid}-order`} className={inputClass} {...register('orderId')}>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {orderCode(o.id)} · Xưởng #{o.storefrontId} · {formatVnd(o.totalAmount)}
                </option>
              ))}
            </select>
          </Field>
          <div className="mt-4 flex items-center justify-between">
            <OrderStatusBadge status={order.status} />
            <span className="font-display text-lg font-bold">{formatVnd(order.totalAmount)}</span>
          </div>
          <ul className="mt-3 space-y-2">
            {order.items.map((i) => (
              <OrderItemRow key={i.id} item={i} />
            ))}
          </ul>
        </section>

        <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
          <h2 className="font-display text-xl font-bold">2. Lý do hoàn tiền</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {REASONS.map((r) => (
              <label
                key={r}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl p-3 text-sm ${reasonType === r ? 'bg-peach/60 ring-2 ring-orange' : 'bg-surface-low'}`}
              >
                <input type="radio" value={r} className="accent-orange" {...register('reasonType')} />
                {r}
              </label>
            ))}
          </div>
          {errors.reasonType && <p className="mt-2 text-xs text-danger">{errors.reasonType.message}</p>}
          <Field id={`${uid}-detail`} label="Mô tả chi tiết" error={errors.detail?.message} className="mt-4">
            <textarea
              id={`${uid}-detail`}
              rows={4}
              placeholder="Mô tả tình trạng sản phẩm, thời điểm nhận hàng…"
              className={inputClass}
              {...register('detail')}
            />
          </Field>
          <ApiNote className="mt-3">
            API hoàn tiền chưa hỗ trợ đính kèm ảnh / video bằng chứng (MP 028 có ô tải bằng chứng).
          </ApiNote>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-28">
        <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
          <h2 className="font-display text-xl font-bold">3. Số tiền hoàn</h2>
          <Field
            id={`${uid}-tx`}
            label="Mã giao dịch ZaloPay *"
            error={errors.transactionId?.message}
            hint={
              payments[order.id]
                ? 'Đã điền từ lần thanh toán trên thiết bị này.'
                : 'Xem trong lịch sử thanh toán ZaloPay.'
            }
            className="mt-4"
          >
            <input
              id={`${uid}-tx`}
              inputMode="numeric"
              className={`${inputClass} font-mono`}
              {...register('transactionId')}
            />
          </Field>
          <Field
            id={`${uid}-amount`}
            label="Số tiền yêu cầu hoàn (VND) *"
            error={errors.amount?.message}
            hint={`Tối đa ${formatVnd(order.totalAmount)}.`}
            className="mt-4"
          >
            <input
              id={`${uid}-amount`}
              inputMode="numeric"
              className={`${inputClass} font-display text-lg font-bold`}
              {...register('amount')}
            />
          </Field>
          <div className="mt-4">
            <FormError message={errors.root?.message} />
          </div>
          <SubmitButton busy={refund.isPending} className="mt-4 w-full">
            Gửi yêu cầu hoàn tiền
          </SubmitButton>
          <ApiNote className="mt-3">
            OrderResponse chưa có transactionId — mã được ghi nhớ khi bạn thanh toán ZaloPay trên trình duyệt này.
          </ApiNote>
        </section>
        <div className="space-y-3 rounded-[1.75rem] bg-white/80 p-5 text-xs text-ink-soft shadow-soft">
          <p className="flex gap-2">
            <ShieldCheck size={15} className="shrink-0 text-teal" /> Tiền hoàn được trả về đúng phương thức đã thanh
            toán.
          </p>
          <p className="flex gap-2">
            <Undo2 size={15} className="shrink-0 text-violet" /> Có thể yêu cầu hoàn một phần hoặc toàn bộ giá trị đơn
            con.
          </p>
          <p className="flex gap-2">
            <Info size={15} className="shrink-0 text-orange" /> Đơn thanh toán khi nhận hàng (COD) không hoàn qua cổng
            ZaloPay.
          </p>
        </div>
      </aside>
    </form>
  )
}
