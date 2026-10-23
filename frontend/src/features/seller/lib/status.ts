import type { Tone } from '../../../shared/ui/kit'

type Map = Record<string, { label: string; tone: Tone }>

export const PRODUCT_STATUS: Map = {
  PUBLISHED: { label: 'Đang mở bán', tone: 'green' },
  PENDING_REVIEW: { label: 'Chờ thẩm định', tone: 'violet' },
  DRAFT: { label: 'Bản nháp', tone: 'neutral' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
  HIDDEN: { label: 'Tạm ẩn', tone: 'orange' },
}

export const APPLICATION_STATUS: Map = {
  DRAFT: { label: 'Bản nháp', tone: 'neutral' },
  PENDING: { label: 'Chờ phê duyệt', tone: 'violet' },
  NEEDS_INFO: { label: 'Cần bổ sung hồ sơ', tone: 'orange' },
  VERIFIED: { label: 'Đã xác thực', tone: 'green' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
}

export const STOREFRONT_STATUS: Map = {
  ACTIVE: { label: 'Đang hoạt động', tone: 'green' },
  EXPIRING: { label: 'Sắp hết hạn', tone: 'orange' },
  EXPIRED: { label: 'Hết hạn gói', tone: 'danger' },
  SUSPENDED: { label: 'Tạm đình chỉ', tone: 'danger' },
}

export const DISPUTE_STATUS: Map = {
  NEEDS_RESPONSE: { label: 'Cần phản hồi', tone: 'orange' },
  ARBITRATION: { label: 'Chờ trọng tài', tone: 'violet' },
  REFUNDED: { label: 'Đã hoàn tiền', tone: 'green' },
  REJECTED: { label: 'Khiếu nại bị bác', tone: 'neutral' },
}

export const EARNING_STATUS: Map = {
  PENDING: { label: 'Chờ mở khoá 72h', tone: 'orange' },
  RELEASED: { label: 'Đã giải ngân', tone: 'green' },
  HELD: { label: 'Phong toả tranh chấp', tone: 'danger' },
}

export const PAYMENT_STATUS: Map = {
  SUCCEEDED: { label: 'Thành công', tone: 'green' },
  FAILED: { label: 'Thất bại', tone: 'danger' },
  PENDING: { label: 'Đang xử lý', tone: 'orange' },
  UNKNOWN: { label: 'Chờ đối soát', tone: 'violet' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
}
