import type { OrderStatus } from '../types/order.types'

type Tone = 'neutral' | 'orange' | 'violet' | 'teal' | 'green' | 'danger'

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone; hint: string }> = {
  CREATED: { label: 'Mới tạo', tone: 'neutral', hint: 'Đơn vừa được tạo.' },
  PENDING_PAYMENT: {
    label: 'Chờ thanh toán',
    tone: 'orange',
    hint: 'Đơn đang giữ chỗ tồn kho, chờ thanh toán. Đơn quá hạn sẽ tự huỷ.',
  },
  PAID: { label: 'Đã thanh toán', tone: 'violet', hint: 'Đang chờ xưởng tiếp nhận và chế tác.' },
  PROCESSING: { label: 'Đang chế tác', tone: 'violet', hint: 'Xưởng đang in, hoàn thiện và đóng gói.' },
  SHIPPED: { label: 'Đang vận chuyển', tone: 'teal', hint: 'Kiện hàng đã giao cho đơn vị vận chuyển.' },
  DELIVERED: { label: 'Đã giao hàng', tone: 'green', hint: 'Bưu tá đã giao kiện hàng thành công.' },
  RECEIVED: { label: 'Đã nhận hàng', tone: 'green', hint: 'Người mua đã xác nhận nhận hàng.' },
  CANCELLED: { label: 'Đã huỷ', tone: 'danger', hint: 'Đơn đã huỷ, tồn kho được giải phóng.' },
  RETURNED: { label: 'Hoàn trả', tone: 'danger', hint: 'Kiện hàng bị hoàn trả về xưởng.' },
}

export const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-surface-high text-ink-soft',
  orange: 'bg-peach text-orange-deep',
  violet: 'bg-violet-soft text-violet',
  teal: 'bg-teal-soft text-teal',
  green: 'bg-mint text-[#0f5132]',
  danger: 'bg-[#ffdad6] text-danger',
}

export function statusMeta(status: string) {
  return ORDER_STATUS[status as OrderStatus] ?? { label: status, tone: 'neutral' as Tone, hint: '' }
}

/** Các bước hiển thị trên timeline người mua. */
export const ORDER_FLOW: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RECEIVED']

export function flowIndex(status: string) {
  const i = ORDER_FLOW.indexOf(status as OrderStatus)
  return i === -1 ? (status === 'CREATED' ? 0 : -1) : i
}

/** Bộ lọc nhanh theo trạng thái (người mua & người bán). */
export const STATUS_FILTERS: { value: string; label: string; match: string[] }[] = [
  { value: '', label: 'Tất cả', match: [] },
  { value: 'pending', label: 'Chờ thanh toán', match: ['CREATED', 'PENDING_PAYMENT'] },
  { value: 'making', label: 'Đang chế tác', match: ['PAID', 'PROCESSING'] },
  { value: 'shipping', label: 'Đang vận chuyển', match: ['SHIPPED'] },
  { value: 'done', label: 'Đã giao / nhận', match: ['DELIVERED', 'RECEIVED'] },
  { value: 'closed', label: 'Huỷ / hoàn trả', match: ['CANCELLED', 'RETURNED'] },
]

export const SHIPMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  CREATED: { label: 'Đã tạo vận đơn', tone: 'neutral' },
  SHIPPED: { label: 'Đang vận chuyển', tone: 'teal' },
  IN_TRANSIT: { label: 'Đang vận chuyển', tone: 'teal' },
  DELIVERED: { label: 'Giao thành công', tone: 'green' },
  FAILED: { label: 'Giao thất bại', tone: 'danger' },
  RETURNED: { label: 'Hoàn trả', tone: 'danger' },
}

export function shipmentMeta(status: string) {
  return SHIPMENT_STATUS[status] ?? { label: status, tone: 'neutral' as Tone }
}
