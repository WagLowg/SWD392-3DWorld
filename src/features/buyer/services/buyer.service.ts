import { mockFind, mockResponse, nowIso } from '../../../shared/mock/mockApi'
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
  createReport(input: Pick<ViolationReport, 'targetType' | 'target' | 'reason' | 'description'>) {
    const created: ViolationReport = {
      ...input,
      id: `REP-2026-${String(82 + reports.length).padStart(3, '0')}`,
      targetOwner: '—',
      status: 'PENDING',
      createdAt: nowIso(),
      evidence: [],
      audit: [{ at: nowIso(), actor: 'Bạn', action: 'Gửi báo cáo vi phạm', tone: 'violet' }],
    }
    reports.unshift(created)
    return mockResponse(created)
  },

  reviews: () => mockResponse(reviews),
  saveReview(input: { orderId: number; product: string; storefront: string; rating: number; comment: string }) {
    const existing = reviews.find((r) => r.orderId === input.orderId)
    if (existing) Object.assign(existing, input, { at: nowIso() })
    else reviews.unshift({ ...input, photos: 0, at: nowIso() })
    return mockResponse(true)
  },

  cancelRequest: (_orderId: number, _reason: string) => mockResponse({ requestId: `CXL-${Date.now().toString().slice(-5)}` }, 500),
  confirmReceived: (_orderId: number, _note: string) => mockResponse(true, 500),

  transactions: () => mockResponse(transactions),
  transaction: (id: string) => mockFind(transactions, (t) => t.id === id, 'Giao dịch'),
}
