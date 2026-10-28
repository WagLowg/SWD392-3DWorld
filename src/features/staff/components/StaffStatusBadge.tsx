import { Pill, type Tone } from '../../../shared/ui/kit'
import type { RefundStatus, ShipmentStatus } from '../types/staff.types'

const SHIPMENT_STATUS_MAP: Record<ShipmentStatus, { label: string; tone: Tone }> = {
  SHIPPED: { label: 'Đang vận chuyển', tone: 'teal' },
  DELIVERED: { label: 'Giao thành công', tone: 'green' },
  FAILED: { label: 'Giao thất bại', tone: 'orange' },
  RETURNED: { label: 'Chuyển hoàn', tone: 'danger' },
}

const REFUND_STATUS_MAP: Record<RefundStatus, { label: string; tone: Tone }> = {
  SUBMITTED: { label: 'Chờ tiếp nhận', tone: 'orange' },
  UNDER_REVIEW: { label: 'Đang thẩm định', tone: 'violet' },
  NEEDS_INFO: { label: 'Cần bổ sung', tone: 'neutral' },
  APPROVED: { label: 'Đã chấp thuận', tone: 'green' },
  REJECTED: { label: 'Đã bác bỏ', tone: 'danger' },
  COMPLETED: { label: 'Đã hoàn tất', tone: 'ink' },
}

export function StaffShipmentBadge({ status }: { status: ShipmentStatus }) {
  const m = SHIPMENT_STATUS_MAP[status] ?? { label: status, tone: 'neutral' }
  return (
    <Pill tone={m.tone} code={status}>
      {m.label}
    </Pill>
  )
}

export function StaffRefundBadge({ status }: { status: RefundStatus }) {
  const m = REFUND_STATUS_MAP[status] ?? { label: status, tone: 'neutral' }
  return (
    <Pill tone={m.tone} code={status}>
      {m.label}
    </Pill>
  )
}

