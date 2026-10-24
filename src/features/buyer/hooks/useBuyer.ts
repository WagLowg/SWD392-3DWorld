import { useQuery } from '@tanstack/react-query'
import { useMockAction } from '../../../shared/mock/useMockAction'
import type { ViolationReport } from '../data/buyer.fixtures'
import { buyerService } from '../services/buyer.service'

const K = ['buyer-mock'] as const
export const buyerKeys = {
  notifications: [...K, 'notifications'] as const,
  sessions: [...K, 'sessions'] as const,
  help: [...K, 'help'] as const,
  policy: (slug: string) => [...K, 'policy', slug] as const,
  refunds: [...K, 'refunds'] as const,
  refund: (id: string) => [...K, 'refunds', id] as const,
  reports: [...K, 'reports'] as const,
  report: (id: string) => [...K, 'reports', id] as const,
  reviews: [...K, 'reviews'] as const,
  transactions: [...K, 'transactions'] as const,
  transaction: (id: string) => [...K, 'transactions', id] as const,
}

export const useNotifications = () => useQuery({ queryKey: buyerKeys.notifications, queryFn: buyerService.notifications })
export const useSessions = () => useQuery({ queryKey: buyerKeys.sessions, queryFn: buyerService.sessions })
export const useHelp = () => useQuery({ queryKey: buyerKeys.help, queryFn: buyerService.help })
export const usePolicy = (slug: string) => useQuery({ queryKey: buyerKeys.policy(slug), queryFn: () => buyerService.policy(slug) })
export const useRefundCases = () => useQuery({ queryKey: buyerKeys.refunds, queryFn: buyerService.refunds })
export const useRefundCase = (id: string) => useQuery({ queryKey: buyerKeys.refund(id), queryFn: () => buyerService.refund(id) })
export const useReports = () => useQuery({ queryKey: buyerKeys.reports, queryFn: buyerService.reports })
export const useReport = (id: string) => useQuery({ queryKey: buyerKeys.report(id), queryFn: () => buyerService.report(id) })
export const useReviews = () => useQuery({ queryKey: buyerKeys.reviews, queryFn: buyerService.reviews })
export const useTransactions = () => useQuery({ queryKey: buyerKeys.transactions, queryFn: buyerService.transactions })
export const useTransaction = (id: string) => useQuery({ queryKey: buyerKeys.transaction(id), queryFn: () => buyerService.transaction(id) })

export const useMarkRead = () => useMockAction((id: string | undefined) => buyerService.markRead(id), [buyerKeys.notifications])
export const useRevokeSession = () =>
  useMockAction((id: string | undefined) => buyerService.revokeSession(id), [buyerKeys.sessions], 'Đã đăng xuất thiết bị.')
export const useChangePassword = () =>
  useMockAction(({ current, next }: { current: string; next: string }) => buyerService.changePassword(current, next), [], 'Đã cập nhật mật khẩu (mô phỏng).')
export const useSubmitTicket = () =>
  useMockAction(
    (input: { orderId?: string; topic: string; detail: string }) => buyerService.submitTicket(input),
    [],
    (r: { ticketId: string }) => `Đã gửi phiếu hỗ trợ ${r.ticketId}.`,
  )
export const useAddRefundEvidence = () =>
  useMockAction(({ id, note }: { id: string; note: string }) => buyerService.addRefundEvidence(id, note), [buyerKeys.refunds], 'Đã nộp thêm bằng chứng.')
export const useCreateReport = () =>
  useMockAction(
    (input: Pick<ViolationReport, 'targetType' | 'target' | 'reason' | 'description'>) => buyerService.createReport(input),
    [buyerKeys.reports],
    'Đã gửi báo cáo cho bộ phận thẩm định.',
  )
export const useSaveReview = () =>
  useMockAction(
    (input: { orderId: number; product: string; storefront: string; rating: number; comment: string }) => buyerService.saveReview(input),
    [buyerKeys.reviews],
    'Đã lưu đánh giá.',
  )
export const useCancelRequest = () =>
  useMockAction(
    ({ orderId, reason }: { orderId: number; reason: string }) => buyerService.cancelRequest(orderId, reason),
    [],
    (r: { requestId: string }) => `Đã gửi yêu cầu huỷ ${r.requestId}.`,
  )
export const useConfirmReceived = () =>
  useMockAction(({ orderId, note }: { orderId: number; note: string }) => buyerService.confirmReceived(orderId, note), [], 'Đã xác nhận nhận hàng — bắt đầu 72h bảo vệ.')
