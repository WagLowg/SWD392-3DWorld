import { Hammer, Truck } from 'lucide-react'
import { ApiClientError } from '../../../shared/api'
import { useToast } from '../../../shared/ui/toast'
import { useSellerOrderActions } from '../hooks/useOrders'
import type { Order } from '../types/order.types'

function useRun() {
  const toast = useToast()
  return (p: Promise<unknown>, ok: string) =>
    p.then(() => toast(ok)).catch((e) => toast(e instanceof ApiClientError ? e.message : 'Thao tác thất bại.', 'error'))
}

/**
 * Seller chỉ điều khiển hai mốc nội bộ: bắt đầu soạn hàng và xác nhận đã bàn giao.
 * Vận đơn được Backend/GHTK tạo tự động; các trạng thái vận chuyển tiếp theo do Staff cập nhật.
 */
export function SellerOrderActions({ order, compact = false }: { order: Order; compact?: boolean }) {
  const { updateStatus } = useSellerOrderActions()
  const run = useRun()

  if (order.status === 'PAID' || order.status === 'CREATED') {
    return (
      <button
        type="button"
        disabled={updateStatus.isPending}
        onClick={() =>
          run(
            updateStatus.mutateAsync({ orderId: order.id, status: 'PROCESSING' }),
            'Đã tiếp nhận — đơn chuyển sang Đang soạn hàng.',
          )
        }
        className="inline-flex items-center gap-2 rounded-full bg-violet px-4 py-2.5 font-label text-xs font-semibold text-white disabled:opacity-50"
      >
        <Hammer size={14} /> Bắt đầu soạn hàng
      </button>
    )
  }

  if (order.status === 'PROCESSING') {
    return (
      <button
        type="button"
        disabled={updateStatus.isPending}
        onClick={() =>
          run(
            updateStatus.mutateAsync({ orderId: order.id, status: 'SHIPPED' }),
            'Đã ghi nhận bàn giao kiện hàng cho đơn vị vận chuyển.',
          )
        }
        className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 font-label text-xs font-semibold text-white hover:bg-violet disabled:opacity-50"
      >
        <Truck size={14} /> Đã bàn giao vận chuyển
      </button>
    )
  }

  if (!compact && ['SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RECEIVED', 'RETURNED'].includes(order.status)) {
    return (
      <span className="rounded-full bg-surface-low px-4 py-2.5 font-label text-xs font-semibold text-ink-soft">
        Trạng thái vận chuyển do Staff cập nhật
      </span>
    )
  }

  if (!compact && order.status === 'PENDING_PAYMENT') {
    return <span className="font-label text-xs text-ink-soft">Chờ người mua thanh toán trước khi soạn hàng.</span>
  }

  return null
}
