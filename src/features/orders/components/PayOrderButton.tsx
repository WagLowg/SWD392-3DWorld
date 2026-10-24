import { CreditCard, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { ApiClientError } from '../../../shared/api'
import { formatVnd } from '../../../shared/format'
import { useToast } from '../../../shared/ui/toast'
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
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-2 rounded-full bg-[#0068ff] px-5 py-2.5 font-label text-sm font-semibold text-white hover:opacity-90 ${className}`}
      >
        Mở ZaloPay <ExternalLink size={14} />
      </a>
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
            window.open(p.orderUrl, '_blank', 'noopener')
          })
          .catch((e) => toast(e instanceof ApiClientError ? e.message : 'Không tạo được thanh toán.', 'error'))
      }
      className={`inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2.5 font-label text-sm font-semibold text-white hover:bg-orange-deep disabled:opacity-50 ${className}`}
    >
      <CreditCard size={15} /> {pay.isPending ? 'Đang tạo…' : `Thanh toán ${formatVnd(amount)}`}
    </button>
  )
}
