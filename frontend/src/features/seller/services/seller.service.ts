import { mockFind, mockResponse, nowIso } from '../../../shared/mock/mockApi'
import {
  application,
  disputes,
  earnings,
  inventoryLogs,
  plans,
  products,
  type ProductStatus,
  type SellerApplication,
  type SellerProduct,
  type SellerVariant,
  storefront,
  subscription,
  type Storefront,
  wallet,
} from '../data/seller.fixtures'

/**
 * Service kênh người bán — DỮ LIỆU MẪU.
 * TODO(API): thay bằng http khi Backend có /api/seller/** (đăng ký xưởng, gói, sản phẩm, tồn kho, doanh thu, tranh chấp).
 */
export const sellerService = {
  application: () => mockResponse(application),

  submitApplication(patch: Partial<Pick<SellerApplication, 'storefrontName' | 'description' | 'address' | 'technologies'>>) {
    Object.assign(application, patch, { status: 'PENDING', submittedAt: nowIso() })
    application.audit.push({ at: nowIso(), actor: 'Bạn', action: 'Nộp lại hồ sơ bổ sung', tone: 'violet' })
    return mockResponse(application)
  },

  subscription: () => mockResponse({ subscription, plans }),

  renew(planId: string) {
    const plan = plans.find((p) => p.id === planId) ?? plans[1]
    const base = Math.max(Date.now(), Date.parse(subscription.expiresAt))
    Object.assign(subscription, { planId: plan.id, status: 'ACTIVE', expiresAt: new Date(base + 30 * 86_400_000).toISOString() })
    subscription.history.unshift({
      period: `Gia hạn ${plan.name}`,
      txnId: `txn_sub_${Math.floor(Math.random() * 90000 + 10000)}`,
      amount: plan.price,
      status: 'SUCCEEDED',
      paidAt: nowIso(),
    })
    return mockResponse(subscription)
  },

  storefront: () => mockResponse(storefront),

  updateStorefront(patch: Partial<Storefront>) {
    Object.assign(storefront, patch)
    return mockResponse(storefront)
  },

  products: () => mockResponse(products),

  product: (id: number) => mockFind(products, (p) => p.id === id, 'Sản phẩm'),

  /** Tạo / cập nhật sản phẩm; submit = gửi duyệt (PENDING_REVIEW), ngược lại lưu nháp. */
  saveProduct(input: Omit<SellerProduct, 'id' | 'status' | 'updatedAt' | 'sold' | 'audit' | 'media'> & { id?: number; media?: number }, submit: boolean) {
    const status: ProductStatus = submit ? 'PENDING_REVIEW' : 'DRAFT'
    const existing = input.id ? products.find((p) => p.id === input.id) : undefined
    if (existing) {
      Object.assign(existing, input, { status, updatedAt: nowIso() })
      existing.audit.push({ at: nowIso(), actor: 'Bạn', action: submit ? 'Nộp lại thẩm định' : 'Lưu nháp', tone: 'violet' })
      return mockResponse(existing)
    }
    const created: SellerProduct = {
      ...input,
      id: Math.max(...products.map((p) => p.id)) + 1,
      media: input.media ?? 0,
      status,
      updatedAt: nowIso(),
      sold: 0,
      audit: [{ at: nowIso(), actor: 'Bạn', action: submit ? 'Tạo & gửi duyệt sản phẩm' : 'Tạo bản nháp', tone: 'violet' }],
    }
    products.unshift(created)
    return mockResponse(created)
  },

  setProductStatus(id: number, status: ProductStatus, note: string) {
    const p = products.find((x) => x.id === id)
    if (p) {
      p.status = status
      p.updatedAt = nowIso()
      p.audit.push({ at: nowIso(), actor: 'Bạn', action: note })
    }
    return mockResponse(p)
  },

  inventoryLogs: () => mockResponse(inventoryLogs),

  adjustStock(variantId: number, delta: number, reason: string) {
    const variant = products.flatMap((p) => p.variants).find((x) => x.id === variantId) as SellerVariant
    if (variant.stock + delta < variant.reserved) return Promise.reject(new Error('Tồn kho không được thấp hơn số đang giữ chỗ.'))
    variant.stock += delta
    inventoryLogs.unshift({ at: nowIso(), sku: variant.sku, change: delta, reason, actor: 'Bạn', kind: delta >= 0 ? 'IN' : 'OUT' })
    return mockResponse(variant)
  },

  changePrice(variantId: number, price: number, reason: string) {
    const variant = products.flatMap((p) => p.variants).find((x) => x.id === variantId) as SellerVariant
    inventoryLogs.unshift({ at: nowIso(), sku: variant.sku, change: price - variant.price, reason, actor: 'Bạn', kind: 'PRICE' })
    variant.price = price
    return mockResponse(variant)
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
        action: proposal === 'REPRINT' ? 'Đề xuất in bù phôi mới' : proposal === 'REFUND' ? 'Chấp nhận hoàn tiền' : 'Gửi phản hồi minh chứng, chuyển trọng tài',
        tone: proposal === 'REFUND' ? 'green' : 'violet',
      })
    }
    return mockResponse(d)
  },

  earnings: () => mockResponse({ earnings, wallet }),

  earning: (id: string) => mockFind(earnings, (e) => e.id === id, 'Khoản thu nhập'),
}
