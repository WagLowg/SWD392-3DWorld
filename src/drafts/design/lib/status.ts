import type { Tone } from '../../../shared/ui/kit'

export const DESIGN_STATUS: Record<string, { label: string; tone: Tone }> = {
  SUBMITTED: { label: 'Chờ báo giá / thẩm định', tone: 'orange' },
  QUOTED: { label: 'Đã có báo giá', tone: 'violet' },
  IN_PROGRESS: { label: 'Đang chế tác', tone: 'teal' },
  REVIEW: { label: 'Chờ nghiệm thu', tone: 'orange' },
  REVISION: { label: 'Đang chỉnh sửa', tone: 'violet' },
  DELIVERED: { label: 'Đã bàn giao', tone: 'green' },
  COMPLETED: { label: 'Hoàn tất', tone: 'green' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

export const DESIGN_FLOW = ['SUBMITTED', 'QUOTED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'] as const
