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

/* -------------------------------------------------- appTransId → nghiệp vụ */

/**
 * Backend dùng một redirect URL cố định (ZALOPAY_REDIRECT_URL=/payment-result) không kèm mã đơn,
 * nên khi tạo liên kết ZaloPay frontend ghi lại appTransId → đơn / gói để trang kết quả tra ngược.
 * Chỉ có tác dụng trên trình duyệt đã bấm thanh toán.
 */
type PaymentAttempt = { kind: PaymentKind; id: number; at: number }

const ATTEMPTS_KEY = '3dworld.payment-attempts'
const ATTEMPT_TTL_MS = 7 * 86_400_000

function readAttempts(): Record<string, PaymentAttempt> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? '{}')
    return raw && typeof raw === 'object' ? (raw as Record<string, PaymentAttempt>) : {}
  } catch {
    return {}
  }
}

export function rememberPaymentAttempt(appTransId: string | null | undefined, kind: PaymentKind, id: number) {
  if (!appTransId) return
  try {
    const now = Date.now()
    const kept = Object.fromEntries(Object.entries(readAttempts()).filter(([, a]) => now - a.at < ATTEMPT_TTL_MS))
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ ...kept, [appTransId]: { kind, id, at: now } }))
  } catch {
    // trình duyệt chặn localStorage → trang kết quả sẽ hỏi người dùng chọn đơn
  }
}

export function lookupPaymentAttempt(appTransId: string | null | undefined): PaymentAttempt | undefined {
  return appTransId ? readAttempts()[appTransId] : undefined
}

/** Điền kind/ids từ appTransId khi URL không có type/id (redirect cố định của Backend). */
export function resolvePaymentParams(p: PaymentResultParams): PaymentResultParams {
  if (p.kind && (p.ids.length || p.kind === 'subscription')) return p
  const hit = lookupPaymentAttempt(p.appTransId)
  return hit ? { ...p, kind: hit.kind, ids: [hit.id] } : p
}

export const POLL_INTERVAL_MS = 3_000
export const POLL_TIMEOUT_MS = 90_000
