import type { Tone } from '../../../shared/ui/kit'

type Map = Record<string, { label: string; tone: Tone }>

export const REFUND_STATUS: Map = {
  PENDING_STAFF: { label: 'Đang thẩm định', tone: 'violet' },
  NEEDS_EVIDENCE: { label: 'Cần bổ sung minh chứng', tone: 'orange' },
  SUCCEEDED: { label: 'Đã hoàn tiền', tone: 'green' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
}

export const REPORT_STATUS: Map = {
  PENDING: { label: 'Chờ duyệt', tone: 'orange' },
  INVESTIGATING: { label: 'Đang thẩm định', tone: 'violet' },
  RESOLVED_ACTION_TAKEN: { label: 'Đã xử lý', tone: 'green' },
  DISMISSED: { label: 'Đã bác bỏ', tone: 'neutral' },
}

export const TXN_STATUS: Map = {
  SUCCEEDED: { label: 'Thành công', tone: 'green' },
  FAILED: { label: 'Thất bại', tone: 'danger' },
  UNKNOWN: { label: 'Chờ đối soát', tone: 'violet' },
  PENDING: { label: 'Đang xử lý', tone: 'orange' },
  REFUNDED: { label: 'Đã hoàn', tone: 'teal' },
}

export const TARGET_TYPE: Record<string, string> = {
  PRODUCT: 'Sản phẩm',
  STOREFRONT: 'Gian hàng / xưởng',
  USER: 'Tài khoản',
}
