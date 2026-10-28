import { mockFind, mockResponse, nowIso } from '../../../shared/mock/mockApi'
import type { AuditEntry } from '../../../shared/ui/kit'
import { addressService, bankAccountService } from '../../account/services/account.service'
import { formatStructuredAddress, isGhtkReadyAddress } from '../../account/lib/address'
import { rememberPaymentAttempt } from '../../marketplace/lib/payment'
import {
  disputes,
  type Earning,
  type ProductStatus,
  type SellerApplication,
  type SellerProduct,
  type SellerVariant,
  type Storefront,
  type Subscription,
} from '../data/seller.fixtures'
import {
  type ApiProduct,
  type ApiShop,
  type ApiSubscription,
  type ApiSubscriptionOverview,
  type ApiVariant,
  sellerProductApi,
  sellerWalletApi,
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
  // `available` là kết quả canPublish() của BE (role + xác thực + trạng thái + hạn gói),
  // vì vậy luôn ưu tiên chặn trước khi gắn nhãn sắp hết hạn.
  if (shop.available === false) return 'INACTIVE'
  if (Date.parse(shop.expiresAt) - Date.now() < 7 * 86_400_000) return 'EXPIRING'
  return 'ACTIVE'
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

function toSubscription(o: ApiSubscriptionOverview): { subscription: Subscription; monthlyFee: number; hasPendingPayment: boolean } {
  const expiresAt = o.storefrontExpiresAt ?? o.latest?.endAt ?? null
  const left = expiresAt ? Date.parse(expiresAt) - Date.now() : -1
  const rows = [o.pending, o.latest].filter((s): s is ApiSubscription => !!s)
  return {
    subscription: {
      planId: 'monthly',
      status: left < 0 ? 'EXPIRED' : left < 7 * 86_400_000 ? 'EXPIRING' : 'ACTIVE',
      startedAt: o.latest?.startAt ?? nowIso(),
      expiresAt: expiresAt ?? nowIso(),
      autoRenew: false,
      history: rows.filter((s, i) => rows.findIndex((x) => x.id === s.id) === i).map(subRow),
    },
    monthlyFee: Number(o.monthlyFee) || 0,
    hasPendingPayment: !!o.pending,
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

export type SaveProductInput = Omit<
  SellerProduct,
  'id' | 'status' | 'updatedAt' | 'sold' | 'audit' | 'media' | 'mediaItems' | 'storefrontId' | 'revision'
> & { id?: number; media?: number }

/* ------------------------------------------------------------- service */

export const sellerService = {
  async application(): Promise<SellerApplication> {
    const [v, banks, shop, addresses] = await Promise.all([
      sellerVerificationApi.get(),
      bankAccountService.list(),
      storefrontOwnerApi.mine(),
      addressService.list(),
    ])
    const ver = v.verification
    const draft = readEvidence(ver?.evidenceReference)
    const pickup = addresses.find((address) => address.isDefault)
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
      address: pickup ? formatStructuredAddress(pickup) : draft.address,
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
      storefrontStatus: shop ? storefrontStatus(shop) : undefined,
      pickupAddressReady: isGhtkReadyAddress(pickup),
      audit,
    }
  },

  /** POST /api/users/me/seller-verification — gửi tài khoản ngân hàng đã duyệt + minh chứng. */
  async submitApplication(
    patch: Pick<SellerApplication, 'storefrontName' | 'description' | 'address' | 'technologies'> & { evidence?: string },
  ) {
    const [banks, addresses] = await Promise.all([bankAccountService.list(), addressService.list()])
    const bank = banks.find((b) => b.isActive && isVerifiedBank(b.verificationStatus))
    if (!bank) throw new Error('Cần một tài khoản ngân hàng đã được quản trị viên duyệt trước khi nộp hồ sơ.')
    const pickup = addresses.find((address) => address.isDefault)
    if (!isGhtkReadyAddress(pickup)) {
      throw new Error('Cần một địa chỉ mặc định có đủ người liên hệ, số điện thoại, địa chỉ chi tiết, tỉnh/thành và phường/xã để GHTK lấy hàng.')
    }
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
  async renew() {
    const overview = await storefrontOwnerApi.subscription()
    const sub = overview.pending ?? (await storefrontOwnerApi.subscribe(!!overview.storefrontExpiresAt))
    const payment = await storefrontOwnerApi.paySubscription(sub.id)
    rememberPaymentAttempt(payment.appTransId, 'subscription', sub.id)
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

  async adjustStock(variantId: number, delta: number, reason: string) {
    const { product, variant } = await findVariant(variantId)
    const next = variant.stock + delta
    if (next < variant.reserved) throw new Error('Tồn kho không được thấp hơn số đang giữ chỗ.')
    const saved = await sellerProductApi.setStock(product.id, variantId, next, reason)
    return toVariant(saved.variants.find((v) => v.id === variantId) ?? { ...variant, stock: next })
  },

  /** PATCH variant price; Backend hiện chưa nhận lý do thay đổi giá. */
  async changePrice(variantId: number, price: number) {
    const { product, variant } = await findVariant(variantId)
    const saved = await sellerProductApi.updateVariant(product.id, variantId, { price })
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

  async earnings() {
    const data = await sellerWalletApi.mine()
    const earnings: Earning[] = (data.earnings ?? []).map((e) => {
      const released = e.status?.toUpperCase() === 'RELEASED'
      const pending = ['PENDING', 'AWAITING_FUNDS'].includes(e.status?.toUpperCase())
      const status: Earning['status'] = released ? 'RELEASED' : pending ? 'PENDING' : 'HELD'
      return {
        id: `ERN-${e.orderId}`,
        orderId: e.orderId,
        product: `Đơn hàng #${e.orderId}`,
        sku: 'Tổng hợp theo đơn',
        gross: Number(e.grossAmount) || 0,
        feeRate: Number(e.commissionRate) || 0,
        status,
        releaseAt: e.releasedAt ?? e.eligibleAt ?? undefined,
        blocker: status === 'PENDING' ? `Dự kiến mở khoá ${e.eligibleAt ? new Date(e.eligibleAt).toLocaleString('vi-VN') : 'sau khi đủ điều kiện'}.` : status === 'HELD' ? `Backend ghi nhận trạng thái ${e.status}.` : undefined,
        ledger: [
          {
            id: `earning-${e.orderId}`,
            at: e.releasedAt ?? e.eligibleAt ?? nowIso(),
            type: released ? 'Giải ngân doanh thu' : 'Ghi nhận doanh thu người bán',
            amount: Number(e.netAmount) || 0,
            bucket: released ? 'available' : status === 'HELD' ? 'held' : 'pending',
            status: released ? 'POSTED' : 'PENDING',
          },
        ],
      }
    })
    return {
      earnings,
      wallet: {
        available: Number(data.availableBalance) || 0,
        pending: Number(data.pendingBalance) || 0,
        held: Number(data.payoutHold) || 0,
        returnShippingDebt: Number(data.returnShippingDebt) || 0,
      },
    }
  },

  async earning(id: string) {
    const data = await sellerService.earnings()
    const earning = data.earnings.find((e) => e.id === id)
    if (!earning) throw Object.assign(new Error('Không tìm thấy khoản thu nhập.'), { status: 404 })
    return earning
  },

  requestPayout(input: { amount: number; bankAccountId: number; reason: string }) {
    return sellerWalletApi.requestPayout(input)
  },
}
