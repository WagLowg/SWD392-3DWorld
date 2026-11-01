import { type ApiEnvelope, http } from '../../../shared/api'
import { toQueryString } from '../../../shared/lib/query'
import { formatVnd } from '../../../shared/lib/format'
import type { AuditEntry } from '../../../shared/ui/kit'
import type { ApiPage, ApiProduct, ApiSellerVerification } from '../../seller/services/seller.api'
import { readEvidence } from '../../seller/services/seller.service'
import type { OpsCase, OpsDomain } from '../data/ops.fixtures'

/**
 * Admin API thật cho 3 hàng chờ: kiểm duyệt sản phẩm, báo cáo vi phạm, xác thực người bán.
 * Dữ liệu Backend được chuyển sang OpsCase để dùng lại khung OpsQueue / OpsReview.
 */

export type ApiReport = {
  id: number
  productId?: number | null
  reportedUserId?: number | null
  reason: string
  description?: string | null
  evidenceKey?: string | null
  status: string
  decisionReason?: string | null
  createdAt: string
  resolvedAt?: string | null
}

type SpringPage<T> = { content: T[]; totalElements: number; totalPages: number; number: number; size: number }

export const REAL_OPS_DOMAINS = new Set<OpsDomain>(['product', 'report', 'storefront', 'user'])

export type ApiAccount = {
  id: number
  email: string
  fullName: string
  status: 'ACTIVE' | 'LOCKED' | 'BANNED'
  emailVerified: boolean
  grants: string[]
}

export const ACCOUNT_ROLES = ['CUSTOMER', 'SELLER', 'DESIGNER', 'PRINT_STAFF', 'ADMIN'] as const
export type AccountRole = (typeof ACCOUNT_ROLES)[number]

const PAGE = toQueryString({ page: 0, size: 100 })

/* --------------------------------------------------------------- product */

function productCase(p: ApiProduct): OpsCase {
  const prices = p.variants.filter((v) => v.active).map((v) => Number(v.price) || 0)
  const status = p.status?.toUpperCase()
  return {
    id: String(p.id),
    domain: 'product',
    status: ['APPROVED', 'PUBLISHED', 'ACTIVE'].includes(status)
      ? 'APPROVED'
      : status === 'REJECTED'
        ? 'REJECTED'
        : 'PENDING',
    title: p.title,
    subtitle: `${p.category} · ${p.variants.length} biến thể`,
    createdAt: p.updatedAt,
    f: {
      store: `Xưởng #${p.storefrontId}`,
      category: p.category,
      variants: p.variants.length,
      price: prices.length ? formatVnd(Math.min(...prices)) : '—',
      specs: p.specifications ?? '—',
      shippingClass: p.shippingClass ?? '—',
      description: p.description ?? '',
      revision: p.revision ?? '',
      media: p.media.length,
    },
    evidence: [...p.media].sort((a, b) => a.sortOrder - b.sortOrder).map((m) => m.url),
    audit: [
      {
        at: p.updatedAt,
        actor: 'Người bán',
        action: `Trạng thái ${p.status}`,
        note: p.moderationReason ?? undefined,
        tone: 'violet',
      },
    ],
  }
}

/* ---------------------------------------------------------------- report */

const REPORT_STATUS: Record<string, string> = { OPEN: 'PENDING', RESOLVED: 'ACTION_TAKEN', REJECTED: 'DISMISSED' }

function reportCase(r: ApiReport): OpsCase {
  const audit: AuditEntry[] = [
    { at: r.createdAt, actor: 'Người báo cáo', action: 'Gửi báo cáo vi phạm', tone: 'violet' },
  ]
  if (r.resolvedAt)
    audit.push({
      at: r.resolvedAt,
      actor: 'Quản trị viên',
      action: r.status === 'RESOLVED' ? 'Xác nhận vi phạm' : 'Bác bỏ báo cáo',
      note: r.decisionReason ?? undefined,
      tone: r.status === 'RESOLVED' ? 'green' : 'neutral',
    })
  return {
    id: String(r.id),
    domain: 'report',
    status: REPORT_STATUS[r.status?.toUpperCase()] ?? 'PENDING',
    title: r.productId ? `Sản phẩm #${r.productId}` : `Người dùng #${r.reportedUserId ?? '—'}`,
    subtitle: r.reason,
    createdAt: r.createdAt,
    f: {
      target: r.productId ? `Sản phẩm #${r.productId}` : `Người dùng #${r.reportedUserId}`,
      productId: r.productId ?? '',
      reporter: '—',
      reason: r.reason,
      description: r.description ?? '',
      hash: '—',
    },
    evidence: r.evidenceKey ? [r.evidenceKey] : [],
    audit,
  }
}

/* ------------------------------------------------------ seller verification */

const VERIFY_STATUS: Record<string, string> = {
  PENDING: 'PENDING',
  SUBMITTED: 'PENDING',
  APPROVED: 'VERIFIED',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
}

function verificationCase(v: ApiSellerVerification): OpsCase {
  const s = v.verification
  const ev = readEvidence(s?.evidenceReference)
  const submitted = s?.submittedAt ? new Date(s.submittedAt).toISOString() : new Date().toISOString()
  const audit: AuditEntry[] = [
    { at: submitted, actor: `Người dùng #${v.userId}`, action: 'Nộp hồ sơ xác thực', tone: 'violet' },
  ]
  if (s?.reviewedAt)
    audit.push({
      at: new Date(s.reviewedAt).toISOString(),
      actor: s.reviewerId ? `Chuyên viên #${s.reviewerId}` : 'Chuyên viên',
      action: `Quyết định ${s.status}`,
      note: s.reason ?? undefined,
      tone: s.status === 'REJECTED' ? 'danger' : 'green',
    })
  return {
    id: String(v.userId),
    domain: 'storefront',
    status: VERIFY_STATUS[s?.status?.toUpperCase() ?? ''] ?? 'PENDING',
    title: ev.storefrontName || `Người dùng #${v.userId}`,
    subtitle: `user_${v.userId}`,
    createdAt: submitted,
    f: {
      owner: `Người dùng #${v.userId}`,
      ownerId: `USR-${v.userId}`,
      bankAccountId: s?.bankAccountId ?? 0,
      bank: s?.bankAccountId ? `Tài khoản #${s.bankAccountId}` : '—',
      bankStatus: v.verifiedBankAvailable ? 'APPROVED' : 'PENDING',
      location: ev.address || '—',
      equipment: '—',
      tech: ev.technologies.join(', ') || '—',
      email: v.emailVerified ? 'Đã xác thực' : 'Chưa xác thực',
      phone: v.phoneVerified ? `Đã xác thực${s?.phoneSnapshot ? ` (${s.phoneSnapshot})` : ''}` : 'Chưa xác thực',
      eligible: v.eligible ? 'Đủ điều kiện' : 'Chưa đủ điều kiện',
      submittedAt: s?.submittedAt ?? 0,
    },
    evidence: ev.evidence ? [ev.evidence] : s?.evidenceReference ? [s.evidenceReference] : [],
    audit,
  }
}

/* ----------------------------------------------------------------- users */

/** Trang thái tài khoản Backend ↔ OPS_STATUS.user (LOCKED hiển thị là "Tạm khoá"). */
const USER_STATUS: Record<string, string> = { ACTIVE: 'ACTIVE', LOCKED: 'SUSPENDED', BANNED: 'BANNED' }

function userCase(a: ApiAccount): OpsCase {
  return {
    id: String(a.id),
    domain: 'user',
    status: USER_STATUS[a.status] ?? a.status,
    title: a.fullName,
    subtitle: a.email,
    createdAt: '',
    f: {
      roles: a.grants.join(', ') || '—',
      kyc: a.emailVerified ? 'Email đã xác thực' : 'Chưa xác thực email',
      credits: '—',
    },
    audit: [],
  }
}

export const adminUsersApi = {
  async list() {
    return (await http.get<ApiEnvelope<SpringPage<ApiAccount>>>(`/api/admin/users${PAGE}`)).data.content
  },
  /** Tạo PRINT_STAFF hoặc DESIGNER (kèm CUSTOMER); Backend gửi email xác thực. */
  async create(input: { email: string; password: string; fullName: string; phone?: string; role: AccountRole }) {
    return (await http.post<ApiEnvelope<ApiAccount>>('/api/admin/users', input)).data
  },
  /** Cấp / thu hồi vai trò (SELLER cần gian hàng đã trả phí). */
  async setRole(userId: number, role: AccountRole, active: boolean, reason: string) {
    return (await http.put<ApiEnvelope<ApiAccount>>(`/api/admin/users/${userId}/roles/${role}`, { active, reason }))
      .data
  },
  /** Xác thực SĐT thủ công (sandbox, không gửi SMS). */
  async reviewPhone(
    userId: number,
    input: { phone: string; approved: boolean; evidenceReference: string; reason: string },
  ) {
    return (await http.patch<ApiEnvelope<ApiAccount>>(`/api/admin/users/${userId}/phone-verification`, input)).data
  },
}

/* ------------------------------------------------------------------- api */

async function settle<T>(p: Promise<T[]>) {
  try {
    return await p
  } catch {
    return [] as T[]
  }
}

export const adminOpsApi = {
  async list(domain: OpsDomain): Promise<OpsCase[]> {
    if (domain === 'product') {
      const page = (await http.get<ApiEnvelope<ApiPage<ApiProduct>>>(`/api/admin/products/pending${PAGE}`)).data
      return page.items.map(productCase)
    }
    if (domain === 'report') {
      const lists = await Promise.all(
        ['OPEN', 'RESOLVED', 'REJECTED'].map((status) =>
          settle(
            http
              .get<ApiEnvelope<ApiPage<ApiReport>>>(
                `/api/admin/reports${toQueryString({ status, page: 0, size: 100 })}`,
              )
              .then((r) => r.data.items),
          ),
        ),
      )
      return lists.flat().map(reportCase)
    }
    if (domain === 'storefront') {
      const lists = await Promise.all(
        ['PENDING', 'VERIFIED', 'REJECTED'].map((status) =>
          http
            .get<ApiEnvelope<SpringPage<ApiSellerVerification>>>(
              `/api/admin/seller-verifications${toQueryString({ status, page: 0, size: 100 })}`,
            )
            .then((r) => r.data.content),
        ),
      )
      return lists.flat().map(verificationCase)
    }
    if (domain === 'user') return (await adminUsersApi.list()).map(userCase)
    return []
  },

  async get(domain: OpsDomain, id: string): Promise<OpsCase> {
    if (domain === 'product')
      return productCase((await http.get<ApiEnvelope<ApiProduct>>(`/api/admin/products/${id}/moderation`)).data)
    if (domain === 'storefront')
      return verificationCase(
        (await http.get<ApiEnvelope<ApiSellerVerification>>(`/api/admin/users/${id}/seller-verification`)).data,
      )
    // Không có GET /api/admin/reports/{id} hay /api/admin/users/{id} → tìm trong danh sách
    const found = (await adminOpsApi.list(domain)).find((c) => c.id === id)
    if (!found) throw Object.assign(new Error('Hồ sơ không tồn tại.'), { status: 404 })
    return found
  },

  /** Gửi phán quyết; status là trạng thái OPS_STATUS mà trang chọn. */
  async decide(c: OpsCase, status: string, reason: string) {
    if (c.domain === 'product') {
      const body = { revision: String(c.f.revision ?? ''), reason }
      const action = status === 'APPROVED' ? 'approve' : 'reject'
      await http.post(`/api/admin/products/${c.id}/${action}`, body)
      return
    }
    if (c.domain === 'report') {
      await http.patch(`/api/admin/reports/${c.id}`, {
        status: status === 'ACTION_TAKEN' ? 'RESOLVED' : 'REJECTED',
        reason,
        hideProduct: status === 'ACTION_TAKEN' && !!c.f.productId,
      })
      return
    }
    if (c.domain === 'user') {
      const target = { ACTIVE: 'ACTIVE', SUSPENDED: 'LOCKED', BANNED: 'BANNED' }[status] ?? status
      // StatusRequest chỉ khai báo `status`; lý do gửi kèm để Backend ghi audit nếu hỗ trợ
      await http.patch(`/api/admin/users/${c.id}/status`, { status: target, reason })
      return
    }
    if (c.domain === 'storefront') {
      await http.patch(`/api/admin/users/${c.id}/seller-verification`, {
        submittedAt: Number(c.f.submittedAt) || undefined,
        approved: status === 'VERIFIED',
        reason,
      })
    }
  },
}
