import type { Tone } from '../../../shared/ui/kit'
import type { OpsDomain } from '../data/ops.fixtures'

type Map = Record<string, { label: string; tone: Tone }>

export const OPS_STATUS: Record<OpsDomain, Map> = {
  storefront: {
    PENDING: { label: 'Chờ duyệt', tone: 'orange' },
    NEEDS_INFO: { label: 'Cần bổ sung', tone: 'violet' },
    VERIFIED: { label: 'Đã xác thực', tone: 'green' },
    REJECTED: { label: 'Bị từ chối', tone: 'danger' },
    LOCKED: { label: 'Tạm khoá an ninh', tone: 'danger' },
  },
  product: {
    PENDING: { label: 'Chờ thẩm định', tone: 'orange' },
    CHANGES_REQUESTED: { label: 'Yêu cầu chỉnh sửa', tone: 'violet' },
    APPROVED: { label: 'Đã duyệt mở bán', tone: 'green' },
    REJECTED: { label: 'Từ chối & khoá', tone: 'danger' },
  },
  report: {
    PENDING: { label: 'Chờ thẩm định', tone: 'orange' },
    NEEDS_EVIDENCE: { label: 'Cần bổ sung bằng chứng', tone: 'violet' },
    LOCKED: { label: 'Đang tạm khoá niêm yết', tone: 'danger' },
    ACTION_TAKEN: { label: 'Đã gỡ niêm yết', tone: 'green' },
    DISMISSED: { label: 'Đã bác bỏ', tone: 'neutral' },
  },
  order: {
    MAKING: { label: 'Chờ chế tác / in', tone: 'violet' },
    COUNTDOWN_72H: { label: 'Đếm ngược 72h', tone: 'teal' },
    CANCEL_REQUESTED: { label: 'Yêu cầu huỷ cần duyệt', tone: 'orange' },
    DISPUTE: { label: 'Tranh chấp / đóng băng', tone: 'danger' },
    CANCELLED: { label: 'Đã huỷ & hoàn', tone: 'neutral' },
    FROZEN: { label: 'Đóng băng', tone: 'danger' },
  },
  shipment: {
    IN_TRANSIT: { label: 'Đang vận chuyển', tone: 'teal' },
    OUT_FOR_DELIVERY: { label: 'Đang phát hàng', tone: 'violet' },
    FAILED_DELIVERY: { label: 'Giao thất bại', tone: 'danger' },
    RETURNING: { label: 'Chờ hoàn về xưởng', tone: 'orange' },
    DELIVERED: { label: 'Giao thành công', tone: 'green' },
    REDISPATCHED: { label: 'Đã điều vận lại', tone: 'violet' },
  },
  cod: {
    IN_WINDOW: { label: 'Trong cửa sổ 72h', tone: 'violet' },
    MISMATCH: { label: 'Chênh lệch / nghi vấn', tone: 'danger' },
    SETTLED: { label: 'Đã quyết toán', tone: 'green' },
    HOLD: { label: 'Treo chờ đối chiếu', tone: 'orange' },
  },
  refund: {
    PENDING: { label: 'Chờ thẩm định (72h)', tone: 'orange' },
    NEEDS_VIDEO: { label: 'Cần bổ sung video', tone: 'violet' },
    APPROVED: { label: 'Chấp thuận hoàn tiền', tone: 'green' },
    REJECTED: { label: 'Bác bỏ khiếu nại', tone: 'danger' },
  },
  finance: {
    UNKNOWN: { label: 'Trạng thái UNKNOWN', tone: 'violet' },
    MISMATCH: { label: 'Lệch số tiền', tone: 'danger' },
    RECONCILED: { label: 'Đã đối soát', tone: 'green' },
    HOLD: { label: 'Treo chờ đối chất', tone: 'orange' },
  },
  inquiry: {
    OPEN: { label: 'Đang thẩm tra', tone: 'orange' },
    AWAITING_EVIDENCE: { label: 'Chờ bổ sung', tone: 'violet' },
    CLOSED: { label: 'Đã kết luận', tone: 'green' },
    LOCKED: { label: 'Tạm khoá đơn', tone: 'danger' },
  },
  user: {
    ACTIVE: { label: 'Hoạt động', tone: 'green' },
    SUSPENDED: { label: 'Tạm khoá', tone: 'orange' },
    BANNED: { label: 'Cấm vĩnh viễn', tone: 'danger' },
    PENDING: { label: 'Chờ duyệt', tone: 'violet' },
  },
  escalation: {
    ESCALATED: { label: 'Leo thang', tone: 'danger' },
    SANCTIONED: { label: 'Đã thi hành chế tài', tone: 'green' },
    DISMISSED: { label: 'Bác bỏ', tone: 'neutral' },
    FROZEN: { label: 'Đóng băng ví', tone: 'orange' },
  },
  transaction: {
    NEEDS_REVIEW: { label: 'Cần thẩm định', tone: 'orange' },
    MATCHED: { label: 'Đã khớp', tone: 'green' },
    UNKNOWN: { label: 'Treo UNKNOWN', tone: 'violet' },
    HOLD: { label: 'Treo chờ đối chất', tone: 'danger' },
  },
  codSettlement: {
    AWAITING_REMIT: { label: 'Chờ bưu cục nộp', tone: 'orange' },
    MISMATCH: { label: 'Lệch tiền', tone: 'danger' },
    SETTLED: { label: 'Đã quyết toán', tone: 'green' },
    HOLD: { label: 'Treo hồ sơ', tone: 'violet' },
  },
  refundLedger: {
    PENDING_BANK: { label: 'Chờ ngân hàng', tone: 'orange' },
    UNKNOWN: { label: 'Treo UNKNOWN', tone: 'violet' },
    SUCCEEDED: { label: 'Hoàn thành công', tone: 'green' },
    REJECTED: { label: 'Bị từ chối', tone: 'danger' },
    HOLD: { label: 'Treo lệnh', tone: 'danger' },
  },
  payout: {
    PENDING_APPROVAL: { label: 'Chờ phê duyệt', tone: 'orange' },
    TRANSFERRING: { label: 'Đang chuyển khoản', tone: 'violet' },
    UNKNOWN: { label: 'Treo UNKNOWN', tone: 'violet' },
    COMPLETED: { label: 'Đã chi trả', tone: 'green' },
    REJECTED: { label: 'Từ chối giải ngân', tone: 'danger' },
  },
  walletLedger: {},
  earning: {},
  revenue: {},
  audit: {},
}

export const EARNING_STATUS: Map = {
  AWAIT_FUNDS: { label: 'Chờ khớp tiền', tone: 'orange' },
  LOCKED_72H: { label: 'Khoá bảo lưu 72h', tone: 'violet' },
  ELIGIBLE: { label: 'Đủ điều kiện giải phóng', tone: 'teal' },
  RELEASED: { label: 'Đã mở khoá vào ví', tone: 'green' },
  FROZEN: { label: 'Đóng băng tranh chấp', tone: 'danger' },
}

export const REVENUE_STATUS: Map = {
  RECOGNIZED: { label: 'Đã ghi nhận', tone: 'green' },
  DEFERRED: { label: 'Hoãn ghi nhận', tone: 'orange' },
  REVERSED: { label: 'Đảo bút toán', tone: 'danger' },
}
