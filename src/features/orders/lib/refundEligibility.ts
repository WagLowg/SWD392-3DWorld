import type { Order } from '../types/order.types'

const REFUND_READY_STATUSES = new Set(['RECEIVED', 'COMPLETED'])
const NON_BLOCKING_REFUND_STATUSES = new Set(['REJECTED', 'FAILED'])

export type RefundEligibilityReason =
  | 'ORDER_NOT_RECEIVED'
  | 'DEADLINE_UNAVAILABLE'
  | 'REFUND_WINDOW_EXPIRED'
  | 'REFUND_ALREADY_EXISTS'

export type RefundEligibility = { eligible: true; reason: null } | { eligible: false; reason: RefundEligibilityReason }

export function isBlockingRefundStatus(status: string): boolean {
  return !NON_BLOCKING_REFUND_STATUSES.has(status.trim().toUpperCase())
}

export function refundEligibility(
  order: Pick<Order, 'status' | 'refundDeadlineAt'>,
  options: { now?: number; hasBlockingRefund?: boolean } = {},
): RefundEligibility {
  if (!REFUND_READY_STATUSES.has(order.status.trim().toUpperCase())) {
    return { eligible: false, reason: 'ORDER_NOT_RECEIVED' }
  }

  if (options.hasBlockingRefund) {
    return { eligible: false, reason: 'REFUND_ALREADY_EXISTS' }
  }

  const deadline = order.refundDeadlineAt ? Date.parse(order.refundDeadlineAt) : Number.NaN
  if (!Number.isFinite(deadline)) {
    return { eligible: false, reason: 'DEADLINE_UNAVAILABLE' }
  }

  if ((options.now ?? Date.now()) >= deadline) {
    return { eligible: false, reason: 'REFUND_WINDOW_EXPIRED' }
  }

  return { eligible: true, reason: null }
}

export function canRequestRefund(
  order: Pick<Order, 'status' | 'refundDeadlineAt'>,
  options?: { now?: number; hasBlockingRefund?: boolean },
): boolean {
  return refundEligibility(order, options).eligible
}

export function refundEligibilityMessage(reason: RefundEligibilityReason): string {
  return {
    ORDER_NOT_RECEIVED: 'Chỉ đơn hàng đã xác nhận nhận hàng mới có thể yêu cầu hoàn tiền.',
    DEADLINE_UNAVAILABLE: 'Đơn hàng chưa có thời hạn hoàn tiền hợp lệ. Vui lòng tải lại hoặc liên hệ hỗ trợ.',
    REFUND_WINDOW_EXPIRED: 'Đơn hàng đã hết thời hạn được phép yêu cầu hoàn tiền.',
    REFUND_ALREADY_EXISTS: 'Đơn hàng đã có yêu cầu hoàn tiền đang xử lý hoặc đã hoàn tất.',
  }[reason]
}
