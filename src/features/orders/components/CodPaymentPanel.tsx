import { Banknote, RefreshCw } from 'lucide-react'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { useCodPayment } from '../hooks/useOrders'
import type { CodPayment, PaymentMethod } from '../types/order.types'

export function codPaymentLabel(payment: CodPayment) {
  if (payment.collectionStatus === 'CANCELLED') return 'Nghĩa vụ COD đã huỷ'
  if (payment.collectionStatus === 'SETTLED' || payment.status === 'SUCCESS') return 'Đã đối soát COD'
  if (payment.collectionStatus === 'PENDING_SETTLEMENT') return 'Đã thu tiền, chờ đối soát về nền tảng'
  return 'Chờ đơn vị vận chuyển thu tiền'
}

export function CodPaymentPanel({
  orderId,
  paymentMethod,
  orderStatus,
}: {
  orderId: number
  paymentMethod: PaymentMethod | null | undefined
  orderStatus?: string
}) {
  const cod = useCodPayment(orderId, paymentMethod)

  if (paymentMethod !== 'COD') return null

  if (cod.isLoading) return <div className="h-20 animate-pulse rounded-2xl bg-surface-low" />
  if (cod.isError || !cod.data) {
    return (
      <div className="rounded-2xl bg-[#ffdad6] p-4 text-sm text-danger">
        <p>Không tải được trạng thái thanh toán COD.</p>
        <button
          type="button"
          onClick={() => cod.refetch()}
          className="mt-2 inline-flex items-center gap-1.5 font-label text-xs font-semibold underline"
        >
          <RefreshCw size={13} /> Thử lại
        </button>
      </div>
    )
  }

  const payment = cod.data
  const cancelled = orderStatus === 'CANCELLED' || payment.collectionStatus === 'CANCELLED'

  return (
    <div className="rounded-2xl bg-surface-low p-4 text-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-peach text-orange-deep">
          <Banknote size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Thanh toán khi nhận hàng (COD)</p>
          <p className="mt-0.5 text-xs text-ink-soft">{codPaymentLabel(payment)}</p>
        </div>
      </div>
      {!cancelled && (
        <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Số tiền cần thu</dt>
            <dd className="font-semibold">{formatVnd(payment.amountToCollect)}</dd>
          </div>
          {payment.collectedAt && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Đã thu lúc</dt>
              <dd className="text-right font-semibold">{formatDateTime(payment.collectedAt)}</dd>
            </div>
          )}
          {payment.settledAt && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Đối soát lúc</dt>
              <dd className="text-right font-semibold">{formatDateTime(payment.settledAt)}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}

