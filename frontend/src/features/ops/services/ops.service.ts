import { mockFind, mockResponse, nowIso } from '../../../shared/mock/mockApi'
import { auditLogs, cases, commissionRows, type OpsDomain, platformEarnings, platformLedger } from '../data/ops.fixtures'

/**
 * Service vận hành / quản trị — DỮ LIỆU MẪU.
 * TODO(API): /api/admin/** (hàng chờ xác thực xưởng, kiểm duyệt, báo cáo, trọng tài, đối soát, chi trả, người dùng, audit logs).
 * Riêng duyệt tài khoản ngân hàng đã có API thật: PATCH /api/admin/bank-accounts/{id}/verification.
 */
export const opsService = {
  list: (domain: OpsDomain) => mockResponse(cases.filter((c) => c.domain === domain)),
  all: () => mockResponse(cases),
  get: (domain: OpsDomain, id: string) => mockFind(cases, (c) => c.domain === domain && c.id === id, 'Hồ sơ'),

  decide(domain: OpsDomain, id: string, decision: string, status: string, reason: string) {
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
