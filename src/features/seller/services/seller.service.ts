import { mockFind, mockResponse, nowIso } from '../../../shared/mock/mockApi'
import type { AuditEntry } from '../../../shared/ui/kit'
import { bankAccountService } from '../../account/services/account.service'
import {
  disputes,
  earnings,
  inventoryLogs,
  type Plan,
  type ProductStatus,
  type SellerApplication,
  type SellerProduct,
  type SellerVariant,
  type Storefront,
  type Subscription,
  wallet,
} from '../data/seller.fixtures'
import {
  type ApiProduct,
  type ApiShop,
  type ApiSubscription,
  type ApiSubscriptionOverview,
  type ApiVariant,
  sellerProductApi,
  sellerVerificationApi,
  storefrontOwnerApi,
  type VariantWrite,
} from './seller.api'

/**
 * Service kênh người bán.
 * - API THẬT: sản phẩm, biến thể, tồn kho, ảnh, gian hàng, gói thuê bao, xác thực người bán.
 * - DỮ LIỆU MẪU (chưa có API): tranh chấp, doanh thu/earnings, nhật ký tồn kho.
 * Các hàm chuyển dữ liệu Backend sang kiểu dùng sẵn ở page để không phải viết lại UI.
 */

/* ------------------------------------------------------------ adapters */

function parseAttrs(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const v: unknown = JSON.parse(raw)
    if (v && typeof v === 'object' && !Array.isArray(v))
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, String(x ?? '')]))
  } catch {
    // không phải JSON
  }
  return {}
}

function toVariant(v: ApiVariant): SellerVariant {
  const a = parseAttrs(v.attributes)
  return {
    id: v.id,
    sku: v.sku,
    material: a.material ?? '',
    color: a.color ?? a.colour ?? '',
    size: a.size ?? a.scale ?? '',
    price: Number(v.price) || 0,
    stock: v.stock ?? 0,
    reserved: v.reserved ?? 0,
    active: v.active !== false,
  }
}

/** Trạng thái Backend → trạng thái hiển thị (Backend chưa công bố enum, map theo tên). */
function toProductStatus(status: string): ProductStatus {
  const s = status?.toUpperCase() ?? ''
  if (['PENDING', 'PENDING_REVIEW', 'SUBMITTED', 'IN_REVIEW'].includes(s)) return 'PENDING_REVIEW'
  if (['APPROVED', 'PUBLISHED', 'ACTIVE'].includes(s)) return 'PUBLISHED'
  if (s === 'REJECTED') return 'REJECTED'
  if (['UNPUBLISHED', 'HIDDEN', 'INACTIVE'].includes(s)) return 'HIDDEN'
  if (s === 'ARCHIVED') return 'ARCHIVED'
  return 'DRAFT'
}

/** Polygon & manifold không có trường riêng → lưu dạng chữ dễ đọc trong `specifications`. */
const POLY_RE = /Số polygon:\s*([\d.,]+)/i
const MANIFOLD_RE = /Lưới kín \(manifold\):\s*(Có|Không)/i

function buildSpecs(polygonCount: number, manifold: boolean) {
  return `Số polygon: ${polygonCount.toLocaleString('vi-VN')}\nLưới kín (manifold): ${manifold ? 'Có' : 'Không'}`
}

function readSpecs(specs: string | null | undefined) {
  const poly = specs?.match(POLY_RE)?.[1]
  const manifold = specs?.match(MANIFOLD_RE)?.[1]
  return {
    polygonCount: poly ? Number(poly.replace(/[.,]/g, '')) || 0 : 0,
    manifold: manifold ? manifold.toLowerCase() === 'có' : true,
  }
}

function toProduct(p: ApiProduct): SellerProduct {
  const status = toProductStatus(p.status)
  const audit: AuditEntry[] = [
    {
      at: p.updatedAt,
      actor: status === 'REJECTED' || status === 'PUBLISHED' ? 'Kiểm duyệt viên' : 'Hệ thống',
      action: `Trạng thái hiện tại: ${p.status}`,
      note: p.moderationReason ?? undefined,
      tone: status === 'REJECTED' ? 'danger' : status === 'PUBLISHED' ? 'green' : 'violet',
    },
  ]
  return {
    id: p.id,
    storefrontId: p.storefrontId,
    title: p.title,
    category: p.category,
    status,
    description: p.description ?? '',
    shippingClass: p.shippingClass ?? '',
    ...readSpecs(p.specifications),
    media: p.media?.length ?? 0,
    mediaItems: [...(p.media ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    variants: (p.variants ?? []).map(toVariant),
    rejectReason: status === 'REJECTED' ? (p.moderationReason ?? undefined) : undefined,
    revision: p.revision ?? undefined,
    updatedAt: p.updatedAt,
    sold: 0,
    audit,
  }
}

function toVariantWrite(v: Pick<SellerVariant, 'sku' | 'material' | 'color' | 'size' | 'price'>): VariantWrite {
  return {
    sku: v.sku,
    price: v.price,
    attributes: Object.fromEntries(
      Object.entries({ material: v.material, color: v.color, size: v.size }).filter(([, x]) => x),
    ),
  }
}

function storefrontStatus(shop: ApiShop): Storefront['status'] {
  const s = shop.status?.toUpperCase()
  if (s === 'SUSPENDED' || s === 'BANNED') return 'SUSPENDED'
  if (!shop.expiresAt || Date.parse(shop.expiresAt) < Date.now()) return shop.expiresAt ? 'EXPIRED' : 'INACTIVE'
  if (Date.parse(shop.expiresAt) - Date.now() < 7 * 86_400_000) return 'EXPIRING'
  return shop.available === false ? 'INACTIVE' : 'ACTIVE'
}

function toStorefront(shop: ApiShop): Storefront {
  return {
    id: shop.id,
    name: shop.name,
    slogan: '',
    description: shop.description ?? '',
    status: storefrontStatus(shop),
    verificationStatus: shop.verificationStatus ?? undefined,
    expiresAt: shop.expiresAt ?? undefined,
    available: shop.available !== false,
    city: '',
    rating: 0,
    reviewCount: 0,
    followers: 0,
    productCount: 0,
    hidden: shop.available === false,
  }
}

const SUB_PAYMENT: Record<string, Subscription['history'][number]['status']> = {
  PAID: 'SUCCEEDED',
  ACTIVE: 'SUCCEEDED',
  SUCCEEDED: 'SUCCEEDED',
  EXPIRED: 'SUCCEEDED',
  PENDING: 'PENDING',
  FAILED: 'FAILED',
  CANCELLED: 'FAILED',
}

function subRow(s: ApiSubscription): Subscription['history'][number] {
  const range = [s.startAt, s.endAt]
    .filter(Boolean)
    .map((d) => new Date(d as string).toLocaleDateString('vi-VN'))
    .join(' – ')
  return {
    period: range || 'Kỳ chờ thanh toán',
    txnId: `SUB-${s.id}`,
    amount: Number(s.fee) || 0,
    status: SUB_PAYMENT[s.status?.toUpperCase()] ?? 'PENDING',
    paidAt: s.paidAt ?? s.startAt ?? nowIso(),
  }
}

const MONTHLY_PLAN_ID = 'monthly'

function toSubscription(o: ApiSubscriptionOverview): { subscription: Subscription; plans: Plan[] } {
  const expiresAt = o.storefrontExpiresAt ?? o.latest?.endAt ?? null
  const left = expiresAt ? Date.parse(expiresAt) - Date.now() : -1
  const rows = [o.pending, o.latest].filter((s): s is ApiSubscription => !!s)
  return {
    subscription: {
      planId: MONTHLY_PLAN_ID,
      status: left < 0 ? 'EXPIRED' : left < 7 * 86_400_000 ? 'EXPIRING' : 'ACTIVE',
      startedAt: o.latest?.startAt ?? nowIso(),
      expiresAt: expiresAt ?? nowIso(),
      autoRenew: false,
      history: rows.filter((s, i) => rows.findIndex((x) => x.id === s.id) === i).map(subRow),
    },
    plans: [
      {
        id: MONTHLY_PLAN_ID,
        name: 'Gói xưởng tháng',
        price: Number(o.monthlyFee) || 0,
        period: 'tháng',
        perks: ['Mở bán sản phẩm trên Chợ Đồ Chơi', 'Kích hoạt 1 tháng lịch (UTC) sau khi thanh toán thành công'],
        highlight: true,
      },
    ],
  }
}

const VERIFICATION_STATUS: Record<string, SellerApplication['status']> = {
  PENDING: 'PENDING',
  SUBMITTED: 'PENDING',
  APPROVED: 'VERIFIED',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  NEEDS_INFO: 'NEEDS_INFO',
}

const BANK_STATUS: Record<string, 'PENDING' | 'APPROVED' | 'REJECTED'> = {
  VERIFIED: 'APPROVED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
}

/** evidenceReference ghép từ form để chuyên viên đọc được; tách lại để điền sẵn khi mở trang. */
function buildEvidence(input: { evidence?: string; storefrontName: string; address: string; technologies: string[] }) {
  return [
    input.evidence?.trim() && `Minh chứng: ${input.evidence.trim()}`,
    `Xưởng: ${input.storefrontName.trim()}`,
    input.address.trim() && `Địa chỉ: ${input.address.trim()}`,
    input.technologies.length && `Công nghệ: ${input.technologies.join(', ')}`,
  ]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 500)
}

export function readEvidence(ref: string | null | undefined) {
  const part = (label: string) =>
    ref
      ?.split(' | ')
      .find((x) => x.startsWith(`${label}: `))
      ?.slice(label.length + 2) ?? ''
  return {
    evidence: part('Minh chứng'),
    storefrontName: part('Xưởng'),
    address: part('Địa chỉ'),
    technologies: part('Công nghệ')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
  }
}

const isVerifiedBank = (status: string) => ['VERIFIED', 'APPROVED'].includes(status?.toUpperCase())

/** Tìm sản phẩm chứa variant (API tồn kho cần cả productId). */
async function findVariant(variantId: number) {
  const page = await sellerProductApi.list()
  for (const p of page.items) {
    const v = p.variants.find((x) => x.id === variantId)
    if (v) return { product: p, variant: v }
  }
  throw new Error('Không tìm thấy biến thể.')
}

function logInventory(sku: string, change: number, reason: string, kind: 'IN' | 'OUT' | 'PRICE') {
  inventoryLogs.unshift({ at: nowIso(), sku, change, reason, actor: 'Bạn', kind })
}

export type SaveProductInput = Omit<
  SellerProduct,
  'id' | 'status' | 'updatedAt' | 'sold' | 'audit' | 'media' | 'mediaItems' | 'storefrontId' | 'revision'
> & { id?: number; media?: number }

/* ------------------------------------------------------------- service */

export const sellerService = {
  async application(): Promise<SellerApplication> {
    const [v, banks, shop] = await Promise.all([
      sellerVerificationApi.get(),
      bankAccountService.list().catch(() => []),
      storefrontOwnerApi.mine().catch(() => null),
    ])
    const ver = v.verification
    const draft = readEvidence(ver?.evidenceReference)
    const bank =
      banks.find((b) => b.id === ver?.bankAccountId) ??
      banks.find((b) => b.isActive && isVerifiedBank(b.verificationStatus)) ??
      banks.find((b) => b.isDefault) ??
      banks[0]
    const audit: AuditEntry[] = []
    if (ver?.submittedAt)
      audit.push({ at: new Date(ver.submittedAt).toISOString(), actor: 'Bạn', action: 'Nộp hồ sơ xác thực người bán', tone: 'violet' })
    if (ver?.reviewedAt)
      audit.push({
        at: new Date(ver.reviewedAt).toISOString(),
        actor: ver.reviewerId ? `Chuyên viên #${ver.reviewerId}` : 'Chuyên viên',
        action: `Kết quả: ${ver.status}`,
        note: ver.reason ?? undefined,
        tone: ver.status === 'REJECTED' ? 'danger' : 'green',
      })
    return {
      id: `VER-${v.userId}`,
      status: VERIFICATION_STATUS[ver?.status?.toUpperCase() ?? ''] ?? 'DRAFT',
      storefrontName: shop?.name ?? draft.storefrontName,
      description: shop?.description ?? '',
      address: draft.address,
      technologies: draft.technologies,
      emailVerified: v.emailVerified,
      phoneVerified: v.phoneVerified,
      bank: bank
        ? {
            bankName: bank.bankName,
            accountMasked: bank.accountNumberMasked,
            holder: bank.accountHolder,
            status: BANK_STATUS[bank.verificationStatus?.toUpperCase()] ?? 'PENDING',
          }
        : null,
      evidence: draft.evidence ? [draft.evidence] : [],
      evidenceLink: draft.evidence,
      reviewerNote: ver?.reason ?? undefined,
      submittedAt: ver?.submittedAt ? new Date(ver.submittedAt).toISOString() : undefined,
      eligible: v.eligible,
      verifiedBankAvailable: v.verifiedBankAvailable,
      storefrontId: shop?.id,
      audit,
    }
  },

  /** POST /api/users/me/seller-verification — gửi tài khoản ngân hàng đã duyệt + minh chứng. */
  async submitApplication(
    patch: Pick<SellerApplication, 'storefrontName' | 'description' | 'address' | 'technologies'> & { evidence?: string },
  ) {
    const banks = await bankAccountService.list()
    const bank = banks.find((b) => b.isActive && isVerifiedBank(b.verificationStatus))
    if (!bank) throw new Error('Cần một tài khoản ngân hàng đã được quản trị viên duyệt trước khi nộp hồ sơ.')
    await sellerVerificationApi.submit({ bankAccountId: bank.id, evidenceReference: buildEvidence(patch) })
    return sellerService.application()
  },

  /** POST /api/storefronts — chỉ sau khi xác thực người bán được duyệt; gian hàng chưa kích hoạt tới khi trả phí. */
  async createStorefront(input: { name: string; description?: string }) {
    return toStorefront(await storefrontOwnerApi.create(input))
  },

  async subscription() {
    return toSubscription(await storefrontOwnerApi.subscription())
  },

  /** Tạo/dùng lại kỳ chờ thanh toán rồi chuyển sang ZaloPay. */
  async renew(_planId: string) {
    const overview = await storefrontOwnerApi.subscription()
    const sub = overview.pending ?? (await storefrontOwnerApi.subscribe(!!overview.storefrontExpiresAt))
    const payment = await storefrontOwnerApi.paySubscription(sub.id)
    if (payment.orderUrl) window.location.assign(payment.orderUrl)
    return payment
  },

  /** null khi chưa có gian hàng. */
  async storefront() {
    const shop = await storefrontOwnerApi.mine()
    return shop ? toStorefront(shop) : null
  },

  async updateStorefront(patch: Partial<Storefront>) {
    return toStorefront(await storefrontOwnerApi.update({ name: patch.name, description: patch.description }))
  },

  async products() {
    return (await sellerProductApi.list()).items.map(toProduct)
  },

  async product(id: number) {
    return toProduct(await sellerProductApi.get(id))
  },

  /** Tạo / cập nhật sản phẩm và biến thể; submit = gửi duyệt, ngược lại giữ bản nháp. */
  async saveProduct(input: SaveProductInput, submit: boolean) {
    const base = {
      title: input.title,
      description: input.description,
      category: input.category,
      shippingClass: input.shippingClass,
      specifications: buildSpecs(input.polygonCount, input.manifold),
    }
    let id = input.id
    if (!id) {
      const created = await sellerProductApi.create({
        ...base,
        variants: input.variants.map((v) => ({ ...toVariantWrite(v), stock: v.stock, active: true })),
      })
      id = created.id
    } else {
      const existing = await sellerProductApi.get(id)
      await sellerProductApi.update(id, base)
      const keep = new Set<number>()
      for (const v of input.variants) {
        const old = existing.variants.find((x) => x.id === v.id)
        if (!old) {
          await sellerProductApi.addVariant(id, { ...toVariantWrite(v), sku: v.sku, price: v.price, stock: v.stock })
          continue
        }
        keep.add(old.id)
        const before = toVariant(old)
        if (before.sku !== v.sku || before.material !== v.material || before.color !== v.color || before.size !== v.size || before.price !== v.price)
          await sellerProductApi.updateVariant(id, old.id, toVariantWrite(v))
        if (before.stock !== v.stock) await sellerProductApi.setStock(id, old.id, v.stock, 'Cập nhật từ trình sửa sản phẩm')
      }
      for (const old of existing.variants) if (old.active && !keep.has(old.id)) await sellerProductApi.removeVariant(id, old.id)
    }
    const saved = submit ? await sellerProductApi.submit(id) : await sellerProductApi.get(id)
    return toProduct(saved)
  },

  async uploadMedia(productId: number, file: File, sortOrder = 0) {
    return toProduct(await sellerProductApi.uploadMedia(productId, file, { sortOrder }))
  },

  async removeMedia(productId: number, mediaId: number) {
    return toProduct(await sellerProductApi.removeMedia(productId, mediaId))
  },

  /**
   * HIDDEN → unpublish · ARCHIVED → archive · PUBLISHED/PENDING_REVIEW → nộp duyệt lại
   * (Backend chưa có API mở bán lại trực tiếp sau khi tạm ẩn).
   */
  async setProductStatus(id: number, status: ProductStatus, _note: string) {
    if (status === 'HIDDEN') return toProduct(await sellerProductApi.unpublish(id))
    if (status === 'ARCHIVED') return toProduct(await sellerProductApi.archive(id))
    return toProduct(await sellerProductApi.submit(id))
  },

  /** Nhật ký tồn kho: chưa có API — chỉ ghi các thay đổi trong phiên làm việc này. */
  inventoryLogs: () => mockResponse(inventoryLogs, 0),

  async adjustStock(variantId: number, delta: number, reason: string) {
    const { product, variant } = await findVariant(variantId)
    const next = variant.stock + delta
    if (next < variant.reserved) throw new Error('Tồn kho không được thấp hơn số đang giữ chỗ.')
    const saved = await sellerProductApi.setStock(product.id, variantId, next, reason)
    logInventory(variant.sku, delta, reason, delta >= 0 ? 'IN' : 'OUT')
    return toVariant(saved.variants.find((v) => v.id === variantId) ?? { ...variant, stock: next })
  },

  /** PATCH variant price (VariantPatch chưa có trường lý do — lý do chỉ ghi ở nhật ký phiên). */
  async changePrice(variantId: number, price: number, reason: string) {
    const { product, variant } = await findVariant(variantId)
    const saved = await sellerProductApi.updateVariant(product.id, variantId, { price })
    logInventory(variant.sku, price - Number(variant.price), reason, 'PRICE')
    return toVariant(saved.variants.find((v) => v.id === variantId) ?? { ...variant, price })
  },

  disputes: () => mockResponse(disputes),

  dispute: (id: string) => mockFind(disputes, (d) => d.id === id, 'Tranh chấp'),

  respondDispute(id: string, response: string, proposal: 'REPRINT' | 'REFUND' | 'CONTEST') {
    const d = disputes.find((x) => x.id === id)
    if (d) {
      d.sellerResponse = response
      d.status = proposal === 'REFUND' ? 'REFUNDED' : 'ARBITRATION'
      d.audit.push({
        at: nowIso(),
        actor: 'Xưởng (bạn)',
        action:
          proposal === 'REPRINT'
            ? 'Đề xuất in bù phôi mới'
            : proposal === 'REFUND'
              ? 'Chấp nhận hoàn tiền'
              : 'Gửi phản hồi minh chứng, chuyển trọng tài',
        tone: proposal === 'REFUND' ? 'green' : 'violet',
      })
    }
    return mockResponse(d)
  },

  earnings: () => mockResponse({ earnings, wallet }),

  earning: (id: string) => mockFind(earnings, (e) => e.id === id, 'Khoản thu nhập'),
}
