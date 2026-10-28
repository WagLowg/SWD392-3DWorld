import type { Order } from '../types/order.types'

export const AUTO_CONFIRM_RECHECK_MS = 15_000

/**
 * Chỉ lên lịch đọc lại trạng thái từ Backend. Frontend không tự chuyển DELIVERED -> RECEIVED.
 */
export function autoConfirmRefetchInterval(value: Order | Order[] | undefined, now = Date.now()): number | false {
  const orders = Array.isArray(value) ? value : value ? [value] : []
  const dueTimes = orders
    .filter((order) => order.status === 'DELIVERED' && order.autoConfirmDueAt)
    .map((order) => Date.parse(order.autoConfirmDueAt as string))
    .filter(Number.isFinite)

  if (!dueTimes.length) return false

  const remaining = Math.min(...dueTimes) - now
  return remaining > 0 ? remaining + 1_000 : AUTO_CONFIRM_RECHECK_MS
}

