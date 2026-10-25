/**
 * Đọc tham số trang kết quả thanh toán và quy đổi trạng thái Backend → trạng thái hiển thị.
 *
 * URL hỗ trợ (backend đặt làm redirect URL của ZaloPay, hoặc frontend tự mở):
 *   /marketplace/payment/result?type=order&id=123
 *   /marketplace/payment/result?type=order&ids=123,124        (nhiều đơn con cùng lần checkout)
 *   /marketplace/payment/result?type=subscription&id=45
 *   /marketplace/payment/result?sourceType=PHYSICAL_ORDER&sourceId=123
 * ZaloPay tự gắn thêm: status, apptransid, amount, checksum… — chỉ dùng làm gợi ý, không tin tuyệt đối.
 */

export type PaymentKind = 'order' | 'subscription'

/** confirming: đang chờ callback · success · failed · timeout: hết thời gian chờ mà chưa xác nhận được. */
export type PaymentState = 'confirming' | 'success' | 'failed' | 'timeout'

export type PaymentResultParams = {
  kind: PaymentKind | null
  ids: number[]
  /** status=1 là ZaloPay báo thành công; null khi không có tham số. */
  gatewaySuccess: boolean | null
  gatewayCode: string | null
  appTransId: string | null
}

const toIds = (raw: string | null) =>
  (raw ?? '')
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)

export function parsePaymentParams(params: URLSearchParams): PaymentResultParams {
  const type = (params.get('type') ?? params.get('sourceType') ?? '').toUpperCase()
  const kind: PaymentKind | null = ['ORDER', 'PHYSICAL_ORDER'].includes(type)
    ? 'order'
    : type === 'SUBSCRIPTION'
      ? 'subscription'
      : null
  const status = params.get('status')
  return {
    kind,
    ids: [...new Set([...toIds(params.get('ids')), ...toIds(params.get('id')), ...toIds(params.get('sourceId'))])],
    gatewaySuccess: status === null ? null : status === '1',
    gatewayCode: status,
    appTransId: params.get('apptransid') ?? params.get('appTransId'),
  }
}

export function paymentResultUrl(kind: PaymentKind, ids: number[] = []) {
  const q = new URLSearchParams({ type: kind })
  if (ids.length === 1) q.set('id', String(ids[0]))
  else if (ids.length > 1) q.set('ids', ids.join(','))
  return `/marketplace/payment/result?${q.toString()}`
}

const ORDER_PAID = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RECEIVED', 'RETURNED']
const ORDER_UNPAID = ['CREATED', 'PENDING_PAYMENT']

/** Trạng thái 1 đơn: đã trả tiền → success; huỷ → failed; còn chờ → confirming (hoặc failed nếu ZaloPay báo lỗi). */
export function orderPaymentState(status: string | undefined, gatewaySuccess: boolean | null): PaymentState {
  const s = status?.toUpperCase() ?? ''
  if (ORDER_PAID.includes(s)) return 'success'
  if (s === 'CANCELLED') return 'failed'
  if (ORDER_UNPAID.includes(s) && gatewaySuccess === false) return 'failed'
  return 'confirming'
}

const SUB_PAID = ['PAID', 'ACTIVE', 'SUCCEEDED', 'SUCCESS', 'EXPIRED']
const SUB_FAILED = ['FAILED', 'CANCELLED', 'CANCELED']

export function subscriptionPaymentState(status: string | undefined, gatewaySuccess: boolean | null): PaymentState {
  const s = status?.toUpperCase() ?? ''
  if (SUB_PAID.includes(s)) return 'success'
  if (SUB_FAILED.includes(s)) return 'failed'
  if (gatewaySuccess === false) return 'failed'
  return 'confirming'
}

/** Gộp trạng thái nhiều đơn: còn đơn chờ → confirming; tất cả thành công → success; còn lại → failed. */
export function combineStates(states: PaymentState[]): PaymentState {
  if (!states.length) return 'confirming'
  if (states.some((s) => s === 'confirming')) return 'confirming'
  if (states.some((s) => s === 'timeout')) return 'timeout'
  return states.every((s) => s === 'success') ? 'success' : 'failed'
}

/** Mã lỗi ZaloPay phổ biến trên redirect URL. */
export function gatewayMessage(code: string | null) {
  if (code === null || code === '1') return null
  if (code === '-49') return 'Bạn đã huỷ giao dịch trên ZaloPay.'
  return `ZaloPay báo giao dịch không thành công (mã ${code}).`
}

export const POLL_INTERVAL_MS = 3_000
export const POLL_TIMEOUT_MS = 90_000
