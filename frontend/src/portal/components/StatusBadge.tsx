import type { ScreenStatus } from '../requirements'

const labels: Record<ScreenStatus, string> = {
  existing: 'Đã có nền',
  skeleton: 'Skeleton',
  blocked: 'Blocked',
}

export function StatusBadge({ status }: { status: ScreenStatus }) {
  return <span className={`status status--${status}`}>{labels[status]}</span>
}
