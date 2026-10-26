import { CreditCard, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { ApiClientError } from '../../../shared/api'
import { formatVnd } from '../../../shared/format'
import { useToast } from '../../../shared/ui/toast'
import { paymentResultUrl } from '../../marketplace/lib/payment'
import { usePayOrder } from '../hooks/useOrders'

/** Tạo liên kết ZaloPay cho đơn chờ thanh toán (POST /api/payments/zalopay). */
export function PayOrderButton({
  orderId,
  amount,
  className = '',
}: {
  orderId: number
  amount: number
  className?: string
}) {
  const pay = usePayOrder()
  const toast = useToast()
  const [url, setUrl] = useState<string>()

  if (url) {
    return (
      <>
        <a
          href={url}
          className={`inline-flex items-center gap-2 rounded-full bg-[#0068ff] px-5 py-2.5 font-label text-sm font-semibold text-white hover:opacity-90 ${className}`}
        >
          Mở ZaloPay <ExternalLink size={14} />
        </a>
        <a
          href={paymentResultUrl('order', [orderId])}
          className={`inline-flex items-center gap-2 rounded-full bg-surface-low px-5 py-2.5 font-label text-sm font-semibold hover:bg-surface-high ${className}`}
        >
          Tôi đã thanh toán — kiểm tra kết quả
        </a>
      </>
    )
  }
  return (
    <button
      type="button"
      disabled={pay.isPending}
      onClick={() =>
        pay
          .mutateAsync(orderId)
          .then((p) => {
            setUrl(p.orderUrl)
            // Giữ cùng browsing context để access token trong sessionStorage còn nguyên khi ZaloPay trả về.
            window.location.assign(p.orderUrl)
          })
          .catch((e) => toast(e instanceof ApiClientError ? e.message : 'Không tạo được thanh toán.', 'error'))
      }
      className={`inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2.5 font-label text-sm font-semibold text-white hover:bg-orange-deep disabled:opacity-50 ${className}`}
    >
      <CreditCard size={15} /> {pay.isPending ? 'Đang tạo…' : `Thanh toán ${formatVnd(amount)}`}
    </button>
  )
}
