import { mockFind, mockResponse, nowIso } from '../../../shared/mock/mockApi'
import { type ApiEnvelope, http } from '../../../shared/api'
import { buyerOrderService } from '../../orders/services/order.service'
import type { ApiReport } from '../../ops/services/ops.api'
import {
  faqs,
  helpTopics,
  notifications,
  policies,
  refunds,
  reports,
  reviews,
  sessions,
  transactions,
  type ViolationReport,
} from '../data/buyer.fixtures'

/**
 * Service tiện ích người mua — DỮ LIỆU MẪU.
 * TODO(API): /api/notifications, /api/users/me/sessions, /api/refunds, /api/reports, /api/reviews, /api/payments/{id}.
 */
export const buyerService = {
  notifications: () => mockResponse(notifications),
  markRead(id?: string) {
    for (const n of notifications) if (!id || n.id === id) n.read = true
    return mockResponse(true)
  },

  sessions: () => mockResponse(sessions),
  revokeSession(id?: string) {
    for (let i = sessions.length - 1; i >= 0; i--) if (!sessions[i].current && (!id || sessions[i].id === id)) sessions.splice(i, 1)
    return mockResponse(true)
  },
  /** Đổi mật khẩu chưa có API (chỉ có reset qua email). */
  changePassword: (_current: string, _next: string) => mockResponse(true, 600),

  help: () => mockResponse({ topics: helpTopics, faqs }),
  policy: (slug: string) => (policies[slug] ? mockResponse(policies[slug]) : Promise.reject(Object.assign(new Error('Không tìm thấy chính sách.'), { status: 404 }))),
  submitTicket: (_input: { orderId?: string; topic: string; detail: string }) => mockResponse({ ticketId: `TCK-${Date.now().toString().slice(-6)}` }, 500),

  refunds: () => mockResponse(refunds),
  refund: (id: string) => mockFind(refunds, (r) => r.id === id, 'Yêu cầu hoàn tiền'),
  addRefundEvidence(id: string, note: string) {
    const r = refunds.find((x) => x.id === id)
    if (r) {
      r.evidence.push('Bằng chứng bổ sung')
      r.status = 'PENDING_STAFF'
      r.audit.push({ at: nowIso(), actor: 'Bạn', action: 'Nộp thêm bằng chứng', note, tone: 'violet' })
    }
    return mockResponse(r)
  },

  reports: () => mockResponse(reports),
  report: (id: string) => mockFind(reports, (r) => r.id === id, 'Báo cáo'),
  /**
   * API thật: POST /api/reports (productId hoặc reportedUserId + reason + bằng chứng).
   * Chưa có API "báo cáo của tôi" nên bản ghi vừa gửi được lưu tạm vào danh sách mẫu để xem lại.
   */
  async createReport(
    input: Pick<ViolationReport, 'targetType' | 'target' | 'reason' | 'description'> & {
      targetId?: number
      evidence?: string
    },
  ) {
    if (input.targetType === 'STOREFRONT')
      throw new Error('API báo cáo chưa hỗ trợ báo cáo gian hàng — hãy báo cáo sản phẩm hoặc người dùng cụ thể.')
    const id = input.targetId ?? Number(input.target.match(/\d+/)?.[0])
    if (!Number.isInteger(id) || id <= 0) throw new Error('Nhập mã số của sản phẩm / người dùng (vd. prd_12 hoặc 12).')
    const res = (
      await http.post<ApiEnvelope<ApiReport>>('/api/reports', {
        productId: input.targetType === 'PRODUCT' ? id : undefined,
        reportedUserId: input.targetType === 'USER' ? id : undefined,
        reason: input.reason,
        description: input.description,
        evidenceReference: input.evidence?.trim() || undefined,
      })
    ).data
    const created: ViolationReport = {
      id: String(res.id),
      targetType: input.targetType,
      target: input.target,
      targetOwner: '—',
      reason: res.reason ?? input.reason,
      description: res.description ?? input.description,
      status: 'PENDING',
      createdAt: res.createdAt ?? nowIso(),
      evidence: res.evidenceKey ? [res.evidenceKey] : [],
      audit: [{ at: res.createdAt ?? nowIso(), actor: 'Bạn', action: 'Gửi báo cáo vi phạm', tone: 'violet' }],
    }
    reports.unshift(created)
    return created
  },

  reviews: () => mockResponse(reviews),
  saveReview(input: { orderId: number; product: string; storefront: string; rating: number; comment: string }) {
    const existing = reviews.find((r) => r.orderId === input.orderId)
    if (existing) Object.assign(existing, input, { at: nowIso() })
    else reviews.unshift({ ...input, photos: 0, at: nowIso() })
    return mockResponse(true)
  },

  /** API thật: POST /api/orders/{id}/cancel (chỉ đơn chưa thanh toán). */
  async cancelRequest(orderId: number, reason: string) {
    const order = await buyerOrderService.cancel(orderId, reason)
    return { requestId: order.orderCode || `#${order.id}`, order }
  },
  /** API thật: POST /api/orders/{id}/confirm-received (ghi chú chưa được Backend lưu). */
  confirmReceived: (orderId: number, _note: string) => buyerOrderService.confirmReceived(orderId),

  transactions: () => mockResponse(transactions),
  transaction: (id: string) => mockFind(transactions, (t) => t.id === id, 'Giao dịch'),
}
