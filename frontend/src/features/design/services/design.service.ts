import { mockFind, mockResponse, nowIso } from '../../../shared/mock/mockApi'
import { type DesignRequest, type DesignStatus, engineers, pricing, requests, serviceStatus } from '../data/design.fixtures'

/**
 * Dịch vụ thiết kế 3D nội bộ — DỮ LIỆU MẪU.
 * TODO(API): /api/design-requests/** (tạo yêu cầu, báo giá, chỉnh sửa, bàn giao) và /api/admin/design/**.
 */
export const designService = {
  status: () => mockResponse(serviceStatus),
  list: () => mockResponse(requests),
  get: (id: string) => mockFind(requests, (r) => r.id === id, 'Yêu cầu thiết kế'),
  engineers: () => mockResponse(engineers),
  pricing: () => mockResponse(pricing),

  create(input: Pick<DesignRequest, 'title' | 'purpose' | 'description' | 'size' | 'formats' | 'budget' | 'deadline'>) {
    if (!serviceStatus.accepting) return Promise.reject(new Error('Dịch vụ tạm ngừng nhận yêu cầu mới.'))
    const r: DesignRequest = {
      ...input,
      id: `DS-REQ-${2045 + requests.length}`,
      status: 'SUBMITTED',
      createdAt: nowIso(),
      customer: 'Bạn',
      slaAt: nowIso(-24),
      revisionsUsed: 0,
      revisionsFree: 2,
      messages: [],
      deliverables: [],
      audit: [{ at: nowIso(), actor: 'Bạn', action: 'Tạo yêu cầu thiết kế', tone: 'violet' }],
    }
    requests.unshift(r)
    return mockResponse(r)
  },

  transition(id: string, status: DesignStatus, action: string, actor = 'Bạn', note?: string) {
    const r = requests.find((x) => x.id === id)
    if (r) {
      r.status = status
      r.audit.push({ at: nowIso(), actor, action, note, tone: status === 'CANCELLED' ? 'danger' : 'green' })
    }
    return mockResponse(r)
  },

  requestRevision(id: string, issues: string[], text: string) {
    const r = requests.find((x) => x.id === id)
    if (r) {
      r.revisionsUsed += 1
      r.status = 'REVISION'
      r.messages.push({ at: nowIso(), from: 'customer', text: `[${issues.join(', ')}] ${text}` })
      r.audit.push({ at: nowIso(), actor: 'Bạn', action: `Gửi yêu cầu chỉnh sửa vòng ${r.revisionsUsed}`, tone: 'orange' })
    }
    return mockResponse(r)
  },

  message(id: string, from: 'customer' | 'engineer' | 'staff', text: string) {
    const r = requests.find((x) => x.id === id)
    r?.messages.push({ at: nowIso(), from, text })
    return mockResponse(r)
  },

  assign(id: string, engineer: string) {
    const r = requests.find((x) => x.id === id)
    if (r) {
      r.engineer = engineer
      r.audit.push({ at: nowIso(), actor: 'Staff', action: `Phân công ${engineer}`, tone: 'violet' })
    }
    return mockResponse(r)
  },

  sendQuote(id: string, lines: { label: string; amount: number }[]) {
    const r = requests.find((x) => x.id === id)
    if (r) {
      const total = lines.reduce((s, l) => s + l.amount, 0)
      const prev = r.quote?.version ?? 'v0.9.0'
      const [maj, min] = prev.slice(1).split('.').map(Number)
      r.quote = { version: `v${maj}.${min + 1}.0`, lines, expiresAt: nowIso(-24 * 5), deposit: Math.round(total * 0.5), scope: r.quote?.scope ?? ['Điêu khắc theo brief', 'Remesh watertight', '2 vòng chỉnh sửa miễn phí'] }
      r.status = 'QUOTED'
      r.audit.push({ at: nowIso(), actor: 'Staff', action: `Gửi báo giá ${r.quote.version}`, tone: 'orange' })
    }
    return mockResponse(r)
  },

  savePricing(p: typeof pricing) {
    Object.assign(pricing, p)
    return mockResponse(pricing)
  },

  setService(accepting: boolean, reason: '' | 'QUOTA' | 'MAINTENANCE') {
    Object.assign(serviceStatus, { accepting, reason })
    return mockResponse(serviceStatus)
  },
}
