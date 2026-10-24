import type { ProjectStatus, TaskStatus } from './api';

const nf = new Intl.NumberFormat('vi-VN');
export const num = (n: number | null | undefined) => (n == null ? '—' : nf.format(Math.round(n)));

export function bytes(n: number | null | undefined) {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(n / 1024 ** 2).toFixed(1).replace('.', ',')} MB`;
}

export const dateTime = (ts: number) =>
  new Date(ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
export const date = (ts: number) => new Date(ts).toLocaleDateString('vi-VN');
export const time = (ts: number) => new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export function elapsed(from: number, to = Date.now()) {
  const s = Math.max(0, Math.floor((to - from) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'violet';
export const TASK_STATUS: Record<TaskStatus, { label: string; tone: Tone }> = {
  SUBMITTED: { label: 'Đang gửi', tone: 'info' },
  QUEUED: { label: 'Chờ trong hàng đợi', tone: 'violet' },
  RUNNING: { label: 'Đang xử lý', tone: 'info' },
  SUCCEEDED: { label: 'Đã tạo xong', tone: 'info' },
  INGESTING: { label: 'Đang lưu kết quả', tone: 'info' },
  AVAILABLE: { label: 'Hoàn tất', tone: 'success' },
  ASSET_ERROR: { label: 'Lỗi lưu tệp', tone: 'danger' },
  FAILED: { label: 'Thất bại', tone: 'danger' },
  CANCELLED: { label: 'Đã hủy', tone: 'muted' },
  NEEDS_RECONCILIATION: { label: 'Đang xác minh', tone: 'warning' },
};

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Bản nháp', tone: 'info' },
  PROCESSING: { label: 'Đang xử lý', tone: 'violet' },
  READY: { label: 'Sẵn sàng', tone: 'success' },
  FAILED: { label: 'Tạo thất bại', tone: 'danger' },
};

export const isActive = (s: TaskStatus) => ['SUBMITTED', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'INGESTING', 'NEEDS_RECONCILIATION'].includes(s);

export const MODEL_LABEL: Record<string, string> = {
  latest: 'Meshy 7.1',
  'meshy-6': 'Meshy 6',
  'meshy-6-lite': 'Meshy 6 Lite',
};

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]!.toUpperCase()).join('') || 'U';
