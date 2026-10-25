import { mockFind, mockResponse, nowIso } from '../../../shared/mock/mockApi'
import { auditLogs, cases, commissionRows, type OpsDomain, platformEarnings, platformLedger } from '../data/ops.fixtures'
import { adminOpsApi, REAL_OPS_DOMAINS } from './ops.api'

/**
 * Service vận hành / quản trị.
 * - API THẬT: kiểm duyệt sản phẩm, báo cáo vi phạm, xác thực người bán (xem ops.api.ts),
 *   duyệt tài khoản ngân hàng (BankVerifyPanel).
 * - DỮ LIỆU MẪU: đơn/vận đơn vận hành, COD, hoàn tiền, tài chính, trọng tài, audit logs.
 */
export const opsService = {
  list: (domain: OpsDomain) =>
    REAL_OPS_DOMAINS.has(domain) ? adminOpsApi.list(domain) : mockResponse(cases.filter((c) => c.domain === domain)),
  all: () => mockResponse(cases),
  get: (domain: OpsDomain, id: string) =>
    REAL_OPS_DOMAINS.has(domain)
      ? adminOpsApi.get(domain, id)
      : mockFind(cases, (c) => c.domain === domain && c.id === id, 'Hồ sơ'),

  async decide(domain: OpsDomain, id: string, decision: string, status: string, reason: string) {
    if (REAL_OPS_DOMAINS.has(domain)) {
      const c = await adminOpsApi.get(domain, id)
      await adminOpsApi.decide(c, status, reason)
      return adminOpsApi.get(domain, id).catch(() => ({ ...c, status }))
    }
    const c = cases.find((x) => x.domain === domain && x.id === id)
    if (c) {
      c.status = status
      c.audit.push({ at: nowIso(), actor: 'Bạn (chuyên viên)', action: decision, note: reason.slice(0, 120), tone: /từ chối|bác|khoá|cấm|treo/i.test(decision) ? 'danger' : 'green' })
      auditLogs.unshift({
        id: `log_${Date.now().toString(16)}`,
        at: nowIso(),
        actor: 'Bạn (chuyên viên)',
        role: 'STAFF',
        action: `${domain.toUpperCase()}_DECISION`,
        target: id,
        reason,
        before: { status: '…' },
        after: { status },
      })
    }
    return mockResponse(c)
  },

  ledger: () => mockResponse(platformLedger),
  earnings: () => mockResponse(platformEarnings),
  releaseEarning(id: string) {
    const e = platformEarnings.find((x) => x.id === id)
    if (e) e.status = 'RELEASED'
    return mockResponse(e)
  },
  commissions: () => mockResponse(commissionRows),
  audit: () => mockResponse(auditLogs),
  auditEntry: (id: string) => mockFind(auditLogs, (l) => l.id === id, 'Bản ghi kiểm toán'),
}
