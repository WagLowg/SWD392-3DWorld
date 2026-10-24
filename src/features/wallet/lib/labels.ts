import type { Tone } from '../../../shared/ui/kit'

export const BUCKET_LABEL = { available: 'Khả dụng', pending: 'Chờ mở khoá', held: 'Tạm giữ' } as const

export const LEDGER_TYPE: Record<string, { label: string; tone: Tone }> = {
  TOPUP: { label: 'Nạp tiền', tone: 'green' },
  PAYMENT: { label: 'Thanh toán', tone: 'orange' },
  EARNING: { label: 'Doanh thu chờ', tone: 'violet' },
  RELEASE: { label: 'Giải ngân', tone: 'green' },
  HOLD: { label: 'Tạm giữ', tone: 'danger' },
  PAYOUT: { label: 'Rút tiền', tone: 'teal' },
  REFUND: { label: 'Hoàn tiền', tone: 'teal' },
}

export const PAYOUT_STATUS: Record<string, { label: string; tone: Tone }> = {
  PROCESSING: { label: 'Đang xử lý', tone: 'orange' },
  SUCCEEDED: { label: 'Thành công', tone: 'green' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
  UNKNOWN: { label: 'Đang đối soát', tone: 'violet' },
}
