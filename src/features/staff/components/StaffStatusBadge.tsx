import { Pill, type Tone } from '../../../shared/ui/kit'
import type { AdminRefundExecutionStatus, RefundStatus, ShipmentStatus } from '../types/staff.types'

const SHIPMENT_STATUS_MAP: Record<ShipmentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Chờ vận chuyển', tone: 'orange' },
  SHIPPED: { label: 'Đang vận chuyển', tone: 'teal' },
  DELIVERED: { label: 'Giao thành công', tone: 'green' },
  FAILED: { label: 'Giao thất bại', tone: 'orange' },
  RETURNED: { label: 'Đã chuyển hoàn', tone: 'danger' },
}

const REFUND_STATUS_MAP: Record<RefundStatus, { label: string; tone: Tone }> = {
  SUBMITTED: { label: 'Chờ tiếp nhận', tone: 'orange' },
  UNDER_REVIEW: { label: 'Đang thẩm định', tone: 'violet' },
  NEEDS_INFO: { label: 'Cần bổ sung', tone: 'neutral' },
  APPROVED: { label: 'Đã duyệt — Chờ Admin hoàn tiền', tone: 'green' },
  REJECTED: { label: 'Đã từ chối', tone: 'danger' },
  COMPLETED: { label: 'Đã chi trả hoàn tất', tone: 'ink' },
}

const ADMIN_EXECUTION_MAP: Record<AdminRefundExecutionStatus, { label: string; tone: Tone }> = {
  NOT_REQUESTED: { label: 'Không phát sinh', tone: 'neutral' },
  PENDING_ADMIN: { label: 'Chờ Admin chi trả', tone: 'orange' },
  PROCESSING: { label: 'Admin đang xử lý', tone: 'violet' },
  COMPLETED: { label: 'Đã hoàn tiền', tone: 'green' },
  FAILED: { label: 'Chi trả thất bại', tone: 'danger' },
}

export function StaffShipmentBadge({ status }: { status: ShipmentStatus }) {
  const m = SHIPMENT_STATUS_MAP[status] ?? { label: status, tone: 'neutral' }
  return (
    <Pill tone={m.tone} code={status}>
      {m.label}
    </Pill>
  )
}

export function StaffRefundBadge({
  status,
  executionStatus,
}: {
  status: RefundStatus
  executionStatus?: AdminRefundExecutionStatus
}) {
  if (status === 'APPROVED' && executionStatus === 'COMPLETED') {
    return (
      <Pill tone="ink" code="COMPLETED">
        Đã hoàn tất chi trả
      </Pill>
    )
  }
  const m = REFUND_STATUS_MAP[status] ?? { label: status, tone: 'neutral' }
  return (
    <Pill tone={m.tone} code={status}>
      {m.label}
    </Pill>
  )
}

export function StaffAdminExecutionBadge({
  status = 'NOT_REQUESTED',
}: {
  status?: AdminRefundExecutionStatus
}) {
  const m = ADMIN_EXECUTION_MAP[status] ?? { label: status, tone: 'neutral' }
  return (
    <Pill tone={m.tone} code={status}>
      {m.label}
    </Pill>
  )
}
