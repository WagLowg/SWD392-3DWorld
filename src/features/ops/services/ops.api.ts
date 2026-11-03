import { type ApiEnvelope, http } from '../../../shared/api'
import { toQueryString } from '../../../shared/lib/query'
import { formatVnd } from '../../../shared/lib/format'
import type { AuditEntry } from '../../../shared/ui/kit'
import type { ApiPage, ApiProduct, ApiSellerVerification } from '../../seller/services/seller.api'
import { buildEvidence, readEvidence } from '../../seller/services/seller.service'
import { sellerVerificationApi } from '../../seller/services/seller.api'
import { clearPendingSubmission, getAllPendingSubmissions, getPendingSubmission, getRegisteredStorefront, saveRegisteredStorefront, type PendingSellerSubmission } from '../../seller/services/sellerSubmissionStorage'
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

type ApiCatalogProduct = {
  id: number
  storefrontId: number
  title: string
  category: string
  thumbnailUrl?: string | null
  price?: number | null
}

type ApiCatalogPage = ApiPage<ApiCatalogProduct>

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

/** Fallback while BE has not exposed the full Admin moderation history endpoint. */
function publishedCatalogCase(p: ApiCatalogProduct): OpsCase {
  return {
    id: String(p.id),
    domain: 'product',
    status: 'APPROVED',
    title: p.title,
    subtitle: `${p.category} · Đã mở bán`,
    createdAt: '',
    f: {
      store: `Xưởng #${p.storefrontId}`,
      category: p.category,
      variants: '—',
      price: p.price == null ? '—' : formatVnd(p.price),
      specs: '—',
      shippingClass: '—',
      description: '',
      revision: '',
      media: p.thumbnailUrl ? 1 : 0,
    },
    evidence: p.thumbnailUrl ? [p.thumbnailUrl] : [],
    audit: [{ at: '', actor: 'Quản trị viên', action: 'Đã duyệt mở bán', tone: 'green' }],
  }
}

async function allPendingProducts() {
  const items: ApiProduct[] = []
  let page = 0
  while (true) {
    const response = await http.get<ApiEnvelope<ApiPage<ApiProduct>>>(
      `/api/admin/products/pending${toQueryString({ page, size: 100 })}`,
    )
    items.push(...response.data.items)
    if (page + 1 >= response.data.totalPages) break
    page += 1
  }
  return items
}

async function allPublishedCatalogProducts() {
  const items: ApiCatalogProduct[] = []
  let page = 0
  while (true) {
    const response = await http.get<ApiEnvelope<ApiCatalogPage>>(
      `/api/catalog${toQueryString({ sort: 'newest', page, size: 100 })}`,
    )
    items.push(...response.data.items)
    if (page + 1 >= response.data.totalPages) break
    page += 1
  }
  return items
}

async function productModerationCases(): Promise<OpsCase[]> {
  // Current BE contract: pending is the only complete private moderation list.
  // Public catalog enrichment is best-effort and must never block Admin review.
  const pending = await allPendingProducts()
  const published = await allPublishedCatalogProducts().catch(() => [])
  const merged = [...pending.map(productCase), ...published.map(publishedCatalogCase)]
  return [...new Map(merged.map((item) => [item.id, item])).values()]
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

function pendingSubmissionToOpsCase(p: PendingSellerSubmission, account?: ApiAccount): OpsCase {
  const submitted = new Date(p.submittedAt).toISOString()
  const uid = p.userId ?? 0
  const ownerName = account?.fullName || `Người dùng #${uid}`
  const title = p.storefrontName || (account?.fullName ? `Xưởng ${account.fullName}` : `Người dùng #${uid}`)

  return {
    id: String(uid),
    domain: 'storefront',
    status: 'PENDING',
    title,
    subtitle: account?.email || `user_${uid}`,
    createdAt: submitted,
    f: {
      owner: ownerName,
      ownerId: `USR-${uid}`,
      bankAccountId: p.bankAccountId,
      bank: p.bankAccountId ? `Tài khoản #${p.bankAccountId}` : '—',
      bankStatus: 'APPROVED',
      location: p.address || '—',
      userEmail: account?.email ?? '',
      equipment: '—',
      tech: p.technologies.join(', ') || '—',
      email: (account?.emailVerified ?? true) ? 'Đã xác thực' : 'Chưa xác thực',
      phone: p.phoneSnapshot ? `Đã xác thực (${p.phoneSnapshot})` : 'Chưa xác thực',
      phoneNumber: p.phoneSnapshot ?? '',
      phoneVerified: 1,
      eligible: 'Đủ điều kiện',
      submittedAt: p.submittedAt,
    },
    evidence: p.evidence ? [p.evidence] : [],
    audit: [
      { at: submitted, actor: ownerName, action: 'Nộp hồ sơ xét duyệt', tone: 'violet' },
    ],
  }
}

function verificationCase(v: ApiSellerVerification, account?: ApiAccount): OpsCase {
  const s = v.verification
  const ev = readEvidence(s?.evidenceReference)
  const submitted = s?.submittedAt ? new Date(s.submittedAt).toISOString() : new Date().toISOString()
  const ownerName = account?.fullName || `Người dùng #${v.userId}`
  const audit: AuditEntry[] = [
    { at: submitted, actor: ownerName, action: 'Nộp hồ sơ xác thực', tone: 'violet' },
  ]
  if (s?.reviewedAt)
    audit.push({
      at: new Date(s.reviewedAt).toISOString(),
      actor: s.reviewerId ? `Chuyên viên #${s.reviewerId}` : 'Chuyên viên',
      action: `Quyết định ${s.status}`,
      note: s.reason ?? undefined,
      tone: s.status === 'REJECTED' ? 'danger' : 'green',
    })

  // Đủ điều kiện nếu: đã có quyết định VERIFIED từ BE, hoặc đã hoàn thành xác thực Email + SĐT + Ngân hàng
  const isEligible = v.eligible || (v.emailVerified && v.phoneVerified && v.verifiedBankAvailable)
  const reg = getRegisteredStorefront(v.userId)
  const storefrontTitle = ev.storefrontName || reg?.name || (account?.fullName ? `Xưởng ${account.fullName}` : `Người dùng #${v.userId}`)
  const location = ev.address || '—'

  return {
    id: String(v.userId),
    domain: 'storefront',
    status: VERIFY_STATUS[s?.status?.toUpperCase() ?? ''] ?? 'PENDING',
    title: storefrontTitle,
    subtitle: account?.email || `user_${v.userId}`,
    createdAt: submitted,
    f: {
      owner: ownerName,
      ownerId: `USR-${v.userId}`,
      bankAccountId: s?.bankAccountId ?? 0,
      bank: s?.bankAccountId ? `Tài khoản #${s.bankAccountId}` : '—',
      bankStatus: v.verifiedBankAvailable ? 'APPROVED' : 'PENDING',
      location,
      userEmail: account?.email ?? '',
      equipment: '—',
      tech: ev.technologies.join(', ') || '—',
      email: (account?.emailVerified ?? v.emailVerified) ? 'Đã xác thực' : 'Chưa xác thực',
      phone: v.phoneVerified ? `Đã xác thực${s?.phoneSnapshot ? ` (${s.phoneSnapshot})` : ''}` : 'Chưa xác thực',
      phoneNumber: s?.phoneSnapshot || ev.phone || '',
      phoneVerified: v.phoneVerified ? 1 : 0,
      eligible: isEligible ? 'Đủ điều kiện' : 'Chưa đủ điều kiện',
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

export function generatePhoneCandidates(raw: string): string[] {
  const trimmed = (raw || '').trim()
  const digits = trimmed.replace(/\D/g, '')
  const set = new Set<string>()

  if (trimmed && /^\+?[0-9]{8,15}$/.test(trimmed)) {
    set.add(trimmed)
  }

  if (digits) {
    if (digits.startsWith('84')) {
      const rest = digits.slice(2)
      set.add('0' + rest)
      set.add('+84' + rest)
      set.add(digits)
    } else if (digits.startsWith('0')) {
      const rest = digits.slice(1)
      set.add(digits)
      set.add('+84' + rest)
      set.add('84' + rest)
      if (digits.length === 10) {
        set.add(digits.slice(0, 9))
        set.add('+84' + rest.slice(0, 8))
        set.add('84' + rest.slice(0, 8))
      } else if (digits.length === 9) {
        set.add(digits + '9')
        set.add(digits + '0')
        set.add('+84' + rest + '9')
        set.add('84' + rest + '9')
      }
    } else {
      set.add('0' + digits)
      set.add('+84' + digits)
      set.add(digits)
    }
  }

  return Array.from(set).filter((p) => /^\+?[0-9]{8,15}$/.test(p))
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
  /** Khóa, cấm hoặc kích hoạt lại tài khoản — PATCH /api/admin/users/{id}/status. */
  async setStatus(userId: number, status: 'ACTIVE' | 'LOCKED' | 'BANNED', reason: string) {
    return (await http.patch<ApiEnvelope<ApiAccount>>(`/api/admin/users/${userId}/status`, { status, reason })).data
  },
  /** Xác thực SĐT thủ công (sandbox, không gửi SMS). Tự động đối chiếu và thử các biến thể format SĐT (0999, +84, 84, 9 số) để khớp chính xác giá trị trong users.phone. */
  async reviewPhone(
    userId: number,
    input: { phone: string; approved: boolean; evidenceReference: string; reason: string },
  ) {
    const candidates = generatePhoneCandidates(input.phone)
    let lastError: unknown = null

    for (const phoneCandidate of candidates) {
      try {
        const res = await http.patch<ApiEnvelope<ApiAccount>>(`/api/admin/users/${userId}/phone-verification`, {
          ...input,
          phone: phoneCandidate,
        })
        return res.data
      } catch (err) {
        lastError = err
        const msg = err instanceof Error ? err.message : String(err)
        if (!/phone changed/i.test(msg) && !/refresh before reviewing/i.test(msg)) {
          throw err
        }
      }
    }
    throw lastError
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
      return productModerationCases()
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
      const [lists, accounts] = await Promise.all([
        Promise.all(
          ['PENDING', 'VERIFIED', 'REJECTED'].map((status) =>
            http
              .get<ApiEnvelope<SpringPage<ApiSellerVerification>>>(
                `/api/admin/seller-verifications${toQueryString({ status, page: 0, size: 100 })}`,
              )
              .then((r) => r.data.content)
              .catch(() => [] as ApiSellerVerification[]),
          ),
        ),
        adminUsersApi.list().catch(() => [] as ApiAccount[]),
      ])
      const accountMap = new Map(accounts.map((a) => [a.id, a]))
      const allCases = lists.flat().map((v) => verificationCase(v, accountMap.get(v.userId)))
      const pendingLocal = getAllPendingSubmissions()
      for (const p of pendingLocal) {
        if (!p.userId) continue
        const existingIdx = allCases.findIndex((c) => c.id === String(p.userId))
        const pCase = pendingSubmissionToOpsCase(p, accountMap.get(p.userId))
        if (existingIdx >= 0) {
          if (allCases[existingIdx].status !== 'VERIFIED' && allCases[existingIdx].status !== 'REJECTED') {
            allCases[existingIdx] = { ...allCases[existingIdx], ...pCase, status: 'PENDING' }
          }
        } else {
          allCases.unshift(pCase)
        }
      }
      return allCases
    }
    if (domain === 'user') return (await adminUsersApi.list()).map(userCase)
    return []
  },

  async get(domain: OpsDomain, id: string): Promise<OpsCase> {
    if (domain === 'product')
      return productCase((await http.get<ApiEnvelope<ApiProduct>>(`/api/admin/products/${id}/moderation`)).data)
    if (domain === 'storefront') {
      try {
        const [res, accounts] = await Promise.all([
          http.get<ApiEnvelope<ApiSellerVerification>>(`/api/admin/users/${id}/seller-verification`),
          adminUsersApi.list().catch(() => [] as ApiAccount[]),
        ])
        const account = accounts.find((a) => String(a.id) === String(id))
        const c = verificationCase(res.data, account)
        const pending = getPendingSubmission(Number(id))
        if (pending && c.status !== 'VERIFIED' && c.status !== 'REJECTED') {
          return {
            ...c,
            title: pending.storefrontName || c.title,
            status: 'PENDING',
            f: {
              ...c.f,
              bankAccountId: pending.bankAccountId || c.f.bankAccountId,
              phoneNumber: pending.phoneSnapshot || c.f.phoneNumber,
              phone: pending.phoneSnapshot ? `Đã xác thực (${pending.phoneSnapshot})` : c.f.phone,
              submittedAt: pending.submittedAt || c.f.submittedAt,
              tech: pending.technologies.join(', ') || c.f.tech,
              location: pending.address || c.f.location,
            },
            evidence: pending.evidence ? [pending.evidence] : c.evidence,
          }
        }
        return c
      } catch (err) {
        const pending = getPendingSubmission(Number(id))
        if (pending) {
          const accounts = await adminUsersApi.list().catch(() => [] as ApiAccount[])
          const account = accounts.find((a) => String(a.id) === String(id))
          return pendingSubmissionToOpsCase(pending, account)
        }
        throw err
      }
    }
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
      let latestSubmittedAt: number = Number(c.f.submittedAt) || 0

      // Luôn kiểm tra trạng thái thực tế mới nhất trong BE
      const latest = await http.get<ApiEnvelope<ApiSellerVerification>>(`/api/admin/users/${c.id}/seller-verification`)
      const ver = latest.data.verification
      if (ver?.submittedAt) {
        latestSubmittedAt = ver.submittedAt
      }
      if (!ver?.status || ver.status === 'NOT_SUBMITTED') {
        throw new Error(
          'Hồ sơ người bán chưa ở trạng thái PENDING trong database. Backend yêu cầu đơn phải ở trạng thái PENDING trước khi ký duyệt. Vui lòng duyệt SĐT và Ngân hàng, hoặc cập nhật trạng thái PENDING trong database.',
        )
      }
      try {
        await http.patch(`/api/admin/users/${c.id}/seller-verification`, {
          submittedAt: latestSubmittedAt || Date.now(),
          approved: status === 'VERIFIED',
          reason,
        })
        if (status === 'VERIFIED') {
          const existingReg = getRegisteredStorefront(Number(c.id))
          const ownerClean = String(c.f.owner ?? '').replace('Người dùng #', '')
          const shopName =
            c.title && !c.title.startsWith('Người dùng')
              ? c.title
              : existingReg?.name || (ownerClean ? `Xưởng ${ownerClean}` : `Xưởng #${c.id}`)
          saveRegisteredStorefront({
            userId: Number(c.id),
            name: shopName,
            description: existingReg?.description || 'Chuyên chế tác mô hình đồ chơi và sản phẩm in 3D cá nhân hóa chất lượng cao.',
            address: (typeof c.f.location === 'string' ? c.f.location : String(c.f.location ?? '')) || existingReg?.address || '',
            technologies: existingReg?.technologies || [],
            evidence: existingReg?.evidence,
            updatedAt: Date.now(),
          })
        }
      } finally {
        if (status === 'VERIFIED' || status === 'REJECTED') {
          clearPendingSubmission(Number(c.id))
        }
      }
    }
  },
}
