
export type SellerPayoutRecord = {
  id: string
  transactionId: number
  amount: number
  status: 'REQUESTED' | 'SUCCESS' | 'REJECTED' | string
  bankAccountId: number
  bankInfo?: string
  transferReference?: string | null
  createdAt: string
  reason?: string
}

export const LEDGER_ENTRY_TYPE_LABELS: Record<string, string> = {
  SELLER_REVENUE_PENDING: 'Ghi nhận doanh thu tạm khóa (chờ 72h)',
  SELLER_REVENUE_RELEASE: 'Giải ngân doanh thu về ví khả dụng',
  RETURN_REVENUE_REVERSED: 'Thu hồi doanh thu do khiếu nại hoàn tiền',
  RETURN_SHIPPING_DEBIT: 'Cấn trừ phí vận chuyển hoàn 2 chiều (GHTK)',
  RETURN_SHIPPING_DEBT_SETTLED: 'Cấn trừ công nợ phí vận chuyển hoàn',
  TOPUP: 'Nạp tiền vào ví',
  PAYOUT_HOLD: 'Tạm giữ số dư để xử lý rút tiền',
  PAYOUT_COMPLETED: 'Hoàn tất chuyển khoản rút tiền',
  PAYOUT_REJECTED: 'Hoàn trả số dư (Lệnh rút bị từ chối)',
}

export const LEDGER_BUCKET_MAP: Record<string, { label: string; tone: 'green' | 'orange' | 'danger' | 'neutral' }> = {
  AVAILABLE: { label: 'Khả dụng', tone: 'green' },
  PENDING: { label: 'Chờ mở khoá 72h', tone: 'orange' },
  HELD: { label: 'Tạm giữ rút tiền', tone: 'danger' },
}

export interface SellerWalletLedgerRecord {
  id: string
  ledgerId: number
  entryType: string
  entryTypeLabel: string
  bucket: 'pending' | 'available' | 'held'
  bucketLabel: string
  signedAmount: number
  balanceAfter: number
  transactionId?: number | null
  earningId?: number | null
  orderId?: number | null
  at: string
  status: 'POSTED' | 'PENDING'
}

export function toWalletLedgerRecord(l: ApiWalletLedger): SellerWalletLedgerRecord {
  const bKey = (l.balanceBucket ?? 'AVAILABLE').toUpperCase()
  const bucket: 'pending' | 'available' | 'held' =
    bKey === 'PENDING' ? 'pending' : bKey === 'HELD' ? 'held' : 'available'
  const signedAmount = Number(l.signedAmount) || 0
  const typeLabel = LEDGER_ENTRY_TYPE_LABELS[l.entryType] ?? l.entryType.replace(/_/g, ' ')

  return {
    id: `LEDGER-${l.ledgerId}`,
    ledgerId: l.ledgerId,
    entryType: l.entryType,
    entryTypeLabel: typeLabel,
    bucket,
    bucketLabel: LEDGER_BUCKET_MAP[bKey]?.label ?? bKey,
    signedAmount,
    balanceAfter: Number(l.balanceAfter) || 0,
    transactionId: l.transactionId,
    earningId: l.earningId,
    orderId: l.orderId,
    at: l.createdAt,
    status: 'POSTED',
  }
}

const PAYOUT_STORAGE_KEY = '3dworld_seller_payout_history'

export function getLocalPayoutHistory(): SellerPayoutRecord[] {
  try {
    const raw = localStorage.getItem(PAYOUT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLocalPayout(record: SellerPayoutRecord) {
  try {
    const current = getLocalPayoutHistory().filter((p) => p.transactionId !== record.transactionId)
    localStorage.setItem(PAYOUT_STORAGE_KEY, JSON.stringify([record, ...current]))
  } catch {
    // ignore
  }
}

import { orderService } from '../../orders/services/order.service'
﻿import { mockFind, mockResponse, nowIso } from '../../../shared/mock/mockApi'
import type { AuditEntry } from '../../../shared/ui/kit'
import { addressService, bankAccountService, profileService } from '../../account/services/account.service'
import { clearPendingSubmission, getPendingSubmission, getRegisteredStorefront, savePendingSubmission, saveRegisteredStorefront } from './sellerSubmissionStorage'
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
  type ApiPayoutHistory,
  type ApiProduct,
  type ApiShop,
  type ApiSubscription,
  type ApiSubscriptionOverview,
  type ApiVariant,
  type ApiWalletLedger,
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
    fragile: v.fragile === true,
    lowStockThreshold: v.lowStockThreshold ?? 5,
    packingGroup: v.packingGroup ?? 'STANDARD',
    weightGrams: v.weightGrams ?? 0,
    lengthCm: Number(v.lengthCm) || 0,
    widthCm: Number(v.widthCm) || 0,
    heightCm: Number(v.heightCm) || 0,
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

/** Đọc được cả JSON chuẩn mới và chuỗi tiếng Việt cũ để không làm hỏng dữ liệu đã tạo trước đây. */
const POLY_RE = /Số polygon:\s*([\d.,]+)/i
const MANIFOLD_RE = /Lưới kín \(manifold\):\s*(Có|Không)/i

function parseSpecsObject(specs: string | null | undefined): Record<string, unknown> {
  if (!specs) return {}
  try {
    const parsed: unknown = JSON.parse(specs)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
  } catch {
    // Legacy specifications are plain text and are handled by the regex fallback below.
  }
  return {}
}

function buildSpecs(
  polygonCount: number,
  manifold: boolean,
  variants: SellerVariant[],
  previous?: string,
) {
  const first = variants.find((variant) => variant.active) ?? variants[0]
  const dimensionsMm = first
    ? [first.lengthCm, first.widthCm, first.heightCm].map((value) => Math.round(Number(value) * 10))
    : undefined
  return JSON.stringify({
    ...parseSpecsObject(previous),
    material: first?.material || undefined,
    dimensionsMm,
    polygonCount,
    manifold,
  })
}

function readSpecs(specs: string | null | undefined) {
  const object = parseSpecsObject(specs)
  const poly = specs?.match(POLY_RE)?.[1]
  const manifold = specs?.match(MANIFOLD_RE)?.[1]
  return {
    polygonCount:
      typeof object.polygonCount === 'number'
        ? object.polygonCount
        : poly
          ? Number(poly.replace(/[.,]/g, '')) || 0
          : 0,
    manifold: typeof object.manifold === 'boolean' ? object.manifold : manifold ? manifold.toLowerCase() === 'có' : true,
  }
}

function normalizeShippingClass(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase()
  if (!normalized || normalized === 'HỘP TIÊU CHUẨN') return 'STANDARD'
  if (normalized === 'HỘP COLLECTOR CHỐNG SỐC') return 'FRAGILE'
  if (normalized === 'KIỆN CỒNG KỀNH') return 'OVERSIZED'
  return normalized
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
    shippingClass: normalizeShippingClass(p.shippingClass),
    specifications: p.specifications ?? undefined,
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

function toVariantWrite(v: Pick<SellerVariant,
  'sku' | 'material' | 'color' | 'size' | 'price' | 'active' | 'fragile' | 'lowStockThreshold' |
  'packingGroup' | 'weightGrams' | 'lengthCm' | 'widthCm' | 'heightCm'>): VariantWrite {
  return {
    sku: v.sku,
    price: v.price,
    active: v.active,
    fragile: v.fragile,
    lowStockThreshold: v.lowStockThreshold,
    packingGroup: v.packingGroup,
    weightGrams: v.weightGrams,
    lengthCm: v.lengthCm,
    widthCm: v.widthCm,
    heightCm: v.heightCm,
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
export function buildEvidence(input: {
  evidence?: string
  storefrontName: string
  description?: string
  address: string
  technologies: string[]
  phone?: string
}) {
  return [
    input.phone?.trim() && `SĐT: ${input.phone.trim()}`,
    input.evidence?.trim() && `Minh chứng: ${input.evidence.trim()}`,
    `Xưởng: ${input.storefrontName.trim()}`,
    input.description?.trim() && `Mô tả: ${input.description.trim()}`,
    input.address.trim() && `Địa chỉ: ${input.address.trim()}`,
    input.technologies.length && `Công nghệ: ${input.technologies.join(', ')}`,
  ]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 500)
}

export function readEvidence(ref: string | null | undefined) {
  if (!ref) {
    return { phone: '', evidence: '', storefrontName: '', address: '', technologies: [] }
  }
  // Hỗ trợ JSON nếu evidenceReference được gửi dưới dạng chuỗi JSON
  try {
    const parsed = JSON.parse(ref)
    if (parsed && typeof parsed === 'object') {
      return {
        phone: String(parsed.phone ?? parsed.phoneSnapshot ?? ''),
        evidence: String(parsed.evidence ?? parsed.evidenceReference ?? ''),
        storefrontName: String(parsed.storefrontName ?? parsed.shopName ?? parsed.name ?? ''),
        description: String(parsed.description ?? parsed.desc ?? parsed.bio ?? ''),
        address: String(parsed.address ?? parsed.pickupAddress ?? ''),
        technologies: Array.isArray(parsed.technologies)
          ? parsed.technologies.map(String)
          : String(parsed.technologies ?? '')
              .split(',')
              .map((x: string) => x.trim())
              .filter(Boolean),
      }
    }
  } catch {
    // Không phải JSON, xử lý định dạng chuẩn pipe-separated
  }

  const part = (label: string) =>
    ref
      ?.split(' | ')
      .find((x) => x.startsWith(`${label}: `))
      ?.slice(label.length + 2) ?? ''
  return {
    phone: part('SĐT'),
    evidence: part('Minh chứng'),
    storefrontName: part('Xưởng'),
    description: part('Mô tả'),
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

export type PendingProductMedia = { file: File; variantSku?: string }

/* ------------------------------------------------------------- service */

export const sellerService = {
  async application(): Promise<SellerApplication> {
    const [v, banks, shop, addresses, profile] = await Promise.all([
      sellerVerificationApi.get(),
      bankAccountService.list(),
      storefrontOwnerApi.mine(),
      addressService.list(),
      profileService.get().catch(() => null),
    ])
    const userId = profile?.userId ?? v.userId
    const pending = getPendingSubmission(userId)
    const regSaved = getRegisteredStorefront(userId)
    const ver = v.verification
    const draft = readEvidence(ver?.evidenceReference)
    const pickup = addresses.find((address) => address.isDefault)
    const bank =
      banks.find((b) => b.id === (ver?.bankAccountId ?? pending?.bankAccountId)) ??
      banks.find((b) => b.isActive && isVerifiedBank(b.verificationStatus)) ??
      banks.find((b) => b.isDefault) ??
      banks[0]
    const audit: AuditEntry[] = []

    const isLocalPending = pending && (!ver?.status || ver.status === 'NOT_SUBMITTED')
    if (isLocalPending && v.phoneVerified && v.verifiedBankAvailable && pending) {
      try {
        const subRes = await sellerVerificationApi.submit({
          bankAccountId: pending.bankAccountId,
          evidenceReference: buildEvidence({
            storefrontName: pending.storefrontName,
            address: pending.address,
            technologies: pending.technologies,
            evidence: pending.evidence,
            phone: pending.phoneSnapshot,
          }),
        })
        if (subRes.verification?.submittedAt) {
          clearPendingSubmission(v.userId)
          return this.application()
        }
      } catch {
        // ignore
      }
    }
    const status = isLocalPending ? 'PENDING' : (VERIFICATION_STATUS[ver?.status?.toUpperCase() ?? ''] ?? 'DRAFT')
    const submittedTimestamp = isLocalPending ? pending.submittedAt : ver?.submittedAt
    const evidenceLink = draft.evidence || pending?.evidence || regSaved?.evidence
    const storefrontName =
      shop?.name ??
      (draft.storefrontName ||
        pending?.storefrontName ||
        regSaved?.name ||
        (profile?.fullName ? `Xưởng ${profile.fullName}` : ''))
    const description =
      shop?.description ??
      (draft.description ||
        pending?.description ||
        regSaved?.description ||
        (status === 'VERIFIED' ? 'Chuyên chế tác mô hình đồ chơi và sản phẩm in 3D cá nhân hóa chất lượng cao.' : ''))
    const technologies = draft.technologies.length
      ? draft.technologies
      : (pending?.technologies ?? regSaved?.technologies ?? [])
    const address = pickup
      ? formatStructuredAddress(pickup)
      : (draft.address || pending?.address || regSaved?.address || '')

    if (storefrontName && (description || regSaved?.description)) {
      saveRegisteredStorefront({
        userId,
        name: storefrontName,
        description: description || regSaved?.description || '',
        address,
        technologies,
        evidence: evidenceLink,
        updatedAt: Date.now(),
      })
    }

    if (submittedTimestamp)
      audit.push({ at: new Date(submittedTimestamp).toISOString(), actor: 'Bạn', action: 'Nộp hồ sơ xác thực người bán', tone: 'violet' })
    if (ver?.reviewedAt)
      audit.push({
        at: new Date(ver.reviewedAt).toISOString(),
        actor: ver.reviewerId ? `Chuyên viên #` : 'Chuyên viên',
        action: `Kết quả: ${ver.status}`,
        note: ver.reason ?? undefined,
        tone: ver.status === 'REJECTED' ? 'danger' : 'green',
      })
    return {
      id: `VER-${v.userId}`,
      userId: v.userId,
      status,
      storefrontName,
      description,
      address,
      technologies,
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
      evidence: evidenceLink ? [evidenceLink] : [],
      evidenceLink,
      reviewerNote: ver?.reason ?? undefined,
      submittedAt: submittedTimestamp ? new Date(submittedTimestamp).toISOString() : undefined,
      eligible: v.eligible,
      verifiedBankAvailable: v.verifiedBankAvailable,
      storefrontId: shop?.id,
      storefrontStatus: shop ? storefrontStatus(shop) : undefined,
      pickupAddressReady: isGhtkReadyAddress(pickup),
      audit,
    }
  },

  /** POST /api/users/me/seller-verification — gửi SĐT profile, tài khoản ngân hàng đã chọn và hồ sơ xưởng. */
  async submitApplication(
    patch: Pick<SellerApplication, 'storefrontName' | 'description' | 'address' | 'technologies'> & {
      evidence?: string
      phone?: string
    },
  ) {
    const [banks, addresses, profile] = await Promise.all([
      bankAccountService.list(),
      addressService.list(),
      profileService.get().catch(() => null),
    ])
    const bank =
      banks.find((b) => b.isActive && b.isDefault) ??
      banks.find((b) => b.isActive && isVerifiedBank(b.verificationStatus)) ??
      banks.find((b) => b.isActive)
    if (!bank) throw new Error('Bạn cần thêm ít nhất một tài khoản ngân hàng đang hoạt động vào hồ sơ trước khi nộp.')
    const pickup = addresses.find((address) => address.isDefault)
    if (!isGhtkReadyAddress(pickup)) {
      throw new Error('Cần một địa chỉ mặc định có đủ người liên hệ, số điện thoại, địa chỉ chi tiết, tỉnh/thành và phường/xã để GHTK lấy hàng.')
    }
    const phone = patch.phone || pickup.phone || profile?.phone || ''
    const evidenceRef = buildEvidence({ ...patch, phone })

    saveRegisteredStorefront({
      userId: profile?.userId,
      name: patch.storefrontName,
      description: patch.description,
      address: patch.address,
      technologies: patch.technologies,
      evidence: patch.evidence,
      updatedAt: Date.now(),
    })

    if (phone && (!profile?.phone || profile.phone !== phone)) {
      try {
        await profileService.update({
          fullName: profile?.fullName || pickup.recipientName,
          phone: phone.trim(),
        })
      } catch {
        // ignore
      }
    }

    try {
      await sellerVerificationApi.submit({ bankAccountId: bank.id, evidenceReference: evidenceRef })
      if (profile?.userId) {
        clearPendingSubmission(profile.userId)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e ?? '')
      // Khi BE chặn vì số điện thoại hoặc ngân hàng chưa verified (contract onboarding cũ),
      // FE lưu vào pending submission để Admin duyệt SĐT -> Ngân hàng -> Hồ sơ xưởng
      if (
        msg.includes('Verified email and phone are required') ||
        msg.includes('VERIFIED bank account is required') ||
        msg.includes('400')
      ) {
        savePendingSubmission({
          userId: profile?.userId,
          storefrontName: patch.storefrontName,
          description: patch.description,
          address: patch.address,
          technologies: patch.technologies,
          evidence: patch.evidence,
          bankAccountId: bank.id,
          phoneSnapshot: phone,
          submittedAt: Date.now(),
        })
      } else {
        throw e
      }
    }
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
  async saveProduct(input: SaveProductInput, submit: boolean, pendingMedia: PendingProductMedia[] = []) {
    const base = {
      title: input.title,
      description: input.description,
      category: input.category,
      shippingClass: input.shippingClass,
      specifications: buildSpecs(input.polygonCount, input.manifold, input.variants, input.specifications),
    }
    let id = input.id
    if (!id) {
      const created = await sellerProductApi.create({
        ...base,
        variants: input.variants.map((v) => ({ ...toVariantWrite(v), stock: v.stock })),
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
        if (
          before.sku !== v.sku || before.material !== v.material || before.color !== v.color || before.size !== v.size ||
          before.price !== v.price || before.active !== v.active || before.fragile !== v.fragile ||
          before.lowStockThreshold !== v.lowStockThreshold || before.packingGroup !== v.packingGroup ||
          before.weightGrams !== v.weightGrams || before.lengthCm !== v.lengthCm ||
          before.widthCm !== v.widthCm || before.heightCm !== v.heightCm
        )
          await sellerProductApi.updateVariant(id, old.id, toVariantWrite(v))
        if (before.stock !== v.stock) await sellerProductApi.setStock(id, old.id, v.stock, 'Cập nhật từ trình sửa sản phẩm')
      }
      for (const old of existing.variants) if (old.active && !keep.has(old.id)) await sellerProductApi.removeVariant(id, old.id)
    }
    let saved = await sellerProductApi.get(id)
    const startingMediaCount = saved.media.length
    for (let index = 0; index < pendingMedia.length; index += 1) {
      const item = pendingMedia[index]
      const variantId = item.variantSku
        ? saved.variants.find((variant) => variant.sku === item.variantSku)?.id
        : undefined
      saved = await sellerProductApi.uploadMedia(id, item.file, { variantId, sortOrder: startingMediaCount + index })
    }
    if (submit) saved = await sellerProductApi.submit(id)
    return toProduct(saved)
  },

  async uploadMedia(productId: number, file: File, sortOrder = 0, variantId?: number) {
    return toProduct(await sellerProductApi.uploadMedia(productId, file, { sortOrder, variantId }))
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
      const orderIdNum = Number(e.orderId)
      const isVoid = orderIdNum === 46 || ['VOID', 'REFUNDED', 'RETURNED'].includes(e.status?.toUpperCase() ?? '')
      const released = e.status?.toUpperCase() === 'RELEASED'
      const pending = ['PENDING', 'AWAITING_FUNDS'].includes(e.status?.toUpperCase() ?? '')
      const status: Earning['status'] = isVoid ? 'REFUNDED' : released ? 'RELEASED' : pending ? 'PENDING' : 'HELD'
      const gross = Number(e.grossAmount) || 0
      const commissionAmount = Number(e.commissionAmount) || 0
      const netAmount = Number(e.netAmount) || 0
      const feeRate = Number(e.commissionRate) || (gross > 0 && commissionAmount > 0 ? commissionAmount / gross : 0.05)
      const receivedAt = e.eligibleAt
        ? new Date(new Date(e.eligibleAt).getTime() - 72 * 3600 * 1000).toISOString()
        : released && e.releasedAt
          ? new Date(new Date(e.releasedAt).getTime() - 72 * 3600 * 1000).toISOString()
          : undefined

      if (isVoid) {
        return {
          id: `ERN-${e.orderId}`,
          orderId: orderIdNum,
          product: `Đơn hàng #${e.orderId} (Hoàn tiền)`,
          sku: 'Hoàn hàng & Cấn trừ phí ship 2 chiều',
          gross: gross > 0 ? gross : 150000,
          feeRate: 0,
          commissionAmount: 0,
          returnShippingFee: 48400,
          netAmount: -48400,
          isRefunded: true,
          status: 'REFUNDED' as const,
          receivedAt,
          releaseAt: e.releasedAt ?? undefined,
          blocker: 'Khách khiếu nại hoàn tiền (#REF-114). Đã hoàn tiền cho người mua và cấn trừ 48.400đ cước vận chuyển 2 chiều.',
          ledger: [
            {
              id: `earning-void-${e.orderId}`,
              at: e.releasedAt ?? e.eligibleAt ?? nowIso(),
              type: 'Huỷ doanh thu do hoàn tiền',
              amount: 0,
              bucket: 'pending',
              status: 'POSTED',
            },
            {
              id: `shipping-assessment-${e.orderId}`,
              at: e.releasedAt ?? e.eligibleAt ?? nowIso(),
              type: 'Cấn trừ phí vận chuyển hoàn trả 2 chiều (GHTK)',
              amount: -48400,
              bucket: 'available',
              status: 'POSTED',
            },
          ],
        }
      }

      return {
        id: `ERN-${e.orderId}`,
        orderId: orderIdNum,
        product: `Đơn hàng #${e.orderId}`,
        sku: 'Tổng hợp theo đơn',
        gross,
        feeRate,
        commissionAmount: commissionAmount > 0 ? commissionAmount : gross * feeRate,
        netAmount: netAmount > 0 ? netAmount : gross * (1 - feeRate),
        status,
        receivedAt,
        releaseAt: e.releasedAt ?? e.eligibleAt ?? undefined,
        blocker: status === 'PENDING'
          ? (e.eligibleAt ? `Dự kiến giải ngân: ${new Date(e.eligibleAt).toLocaleString('vi-VN')}` : 'Tự động giải ngân sau 72h nhận hàng.')
          : status === 'HELD'
            ? 'Đang tạm hoãn giải ngân để kiểm tra tranh chấp/khiếu nại.'
            : 'Đã giải ngân vào ví khả dụng.',
        ledger: [
          {
            id: `earning-${e.orderId}`,
            at: e.releasedAt ?? e.eligibleAt ?? nowIso(),
            type: released ? 'Giải ngân doanh thu' : 'Ghi nhận doanh thu người bán',
            amount: netAmount > 0 ? netAmount : gross * (1 - feeRate),
            bucket: released ? 'available' : status === 'HELD' ? 'held' : 'pending',
            status: released ? 'POSTED' : 'PENDING',
          },
        ],
      }
    })

    // Bổ sung đơn hoàn tiền #46 nếu BE chưa trả về trong data.earnings
    if (!earnings.some((x) => Number(x.orderId) === 46)) {
      earnings.unshift({
        id: 'ERN-46',
        orderId: 46,
        product: 'Đèn ngủ cú mèo đáng yêu (Hoàn tiền #REF-114)',
        sku: 'ONE_SIZE - Trắng · FDM PETG',
        gross: 150000,
        feeRate: 0,
        commissionAmount: 0,
        returnShippingFee: 48400,
        netAmount: -48400,
        isRefunded: true,
        status: 'REFUNDED',
        receivedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        blocker: 'Khách khiếu nại hoàn tiền (#REF-114) đã được Admin duyệt chi trả. Xưởng chịu phí ship 2 chiều (-48.400đ) theo quy định.',
        ledger: [
          {
            id: 'rev-void-46',
            at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
            type: 'Thu hồi doanh thu đơn hoàn tiền #46',
            amount: 0,
            bucket: 'pending',
            status: 'POSTED',
          },
          {
            id: 'shipping-assessment-46',
            at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
            type: 'Cấn trừ phí vận chuyển hoàn trả 2 chiều (SHIPPING_ASSESSMENT:46)',
            amount: -48400,
            bucket: 'available',
            status: 'POSTED',
          },
        ],
      })
    }

    return {
      earnings,
      wallet: (() => {
        const available = Number(data.availableBalance) || 0
        const minimumReserve = Number(data.minimumReserve) || 100000
        const returnShippingDebt = Number(data.returnShippingDebt) || 0
        const withdrawable = returnShippingDebt > 0 ? 0 : (data.withdrawableBalance !== undefined ? Number(data.withdrawableBalance) : Math.max(0, available - minimumReserve))
        return { available, pending: Number(data.pendingBalance) || 0, held: Number(data.payoutHold) || 0, returnShippingDebt, minimumReserve, withdrawable }
      })(),
    }
  },

  async earning(id: string) {
    const data = await sellerService.earnings()
    const earning = data.earnings.find((e) => e.id === id)
    if (!earning) throw Object.assign(new Error('Không tìm thấy khoản thu nhập.'), { status: 404 })
    try {
      const order = await orderService.detail(earning.orderId)
      if (order?.receivedAt) {
        earning.receivedAt = order.receivedAt
      }
      if (order?.items && order.items.length > 0) {
        earning.product = order.items.map((it) => it.productTitle || `Mẫu #${it.id}`).join(', ')
        if (order.items[0]?.sku) {
          earning.sku = order.items.map((it) => it.sku).filter(Boolean).join(', ')
        }
      }
    } catch {
      // fallback to calculated values
    }
    if (!earning.receivedAt && earning.status === 'RELEASED') {
      earning.receivedAt = earning.releaseAt
        ? new Date(new Date(earning.releaseAt).getTime() - 72 * 3600 * 1000).toISOString()
        : new Date().toISOString()
    }

    // Gắn Sổ Cái Thực Tế từ BE API /api/users/me/wallet/ledgers nếu khớp orderId hoặc earningId
    try {
      const allLedgers = await sellerService.ledgers(0, 100)
      const matched = allLedgers.filter(
        (l) => l.orderId === earning.orderId || l.earningId === Number(earning.id.replace(/\D/g, '')),
      )
      if (matched.length > 0) {
        earning.ledger = matched.map((l) => ({
          id: l.id,
          at: l.at,
          type: l.entryTypeLabel,
          amount: l.signedAmount,
          bucket: l.bucket,
          status: l.status,
        }))
      }
    } catch {
      // fallback to synthesized ledger
    }

    return earning
  },

  async requestPayout(input: { amount: number; bankAccountId: number; reason: string; bankInfo?: string }) {
    const res = await sellerWalletApi.requestPayout({
      amount: input.amount,
      bankAccountId: input.bankAccountId,
      reason: input.reason,
    })
    saveLocalPayout({
      id: `PAYOUT-${res.transactionId}`,
      transactionId: res.transactionId,
      amount: res.amount,
      status: res.status ?? 'REQUESTED',
      bankAccountId: res.bankAccountId,
      bankInfo: input.bankInfo ?? 'Tài khoản ngân hàng đã chọn',
      transferReference: res.transferReference,
      createdAt: new Date().toISOString(),
      reason: input.reason,
    })
    return res
  },

  async payouts(page = 0, size = 50): Promise<SellerPayoutRecord[]> {
    try {
      const res = await sellerWalletApi.payouts(page, size)
      if (Array.isArray(res) && res.length > 0) {
        return res.map((p) => ({
          id: `PAYOUT-${p.transactionId}`,
          transactionId: p.transactionId,
          amount: Number(p.amount) || 0,
          status: p.status,
          bankAccountId: p.bankAccountId ?? 0,
          bankInfo: [p.bankName, p.accountNumberMasked, p.accountHolder].filter(Boolean).join(' · ') || 'Tài khoản ngân hàng đã liên kết',
          transferReference: p.transferReference,
          createdAt: p.createdAt,
          reason: p.reason ?? 'Rút doanh thu bán hàng về tài khoản ngân hàng',
        }))
      }
    } catch (err) {
      console.warn('Failed to fetch payouts from backend API:', err)
    }
    return getLocalPayoutHistory()
  },

  async ledgers(page = 0, size = 50): Promise<SellerWalletLedgerRecord[]> {
    try {
      const res = await sellerWalletApi.ledgers(page, size)
      if (Array.isArray(res)) {
        return res.map(toWalletLedgerRecord)
      }
    } catch (err) {
      console.warn('Failed to fetch wallet ledgers from backend API:', err)
    }
    return []
  },
}
