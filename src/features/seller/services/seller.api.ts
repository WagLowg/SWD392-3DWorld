import { type ApiEnvelope, ApiClientError, http } from '../../../shared/api'
import { toQueryString } from '../../../shared/lib/query'

/** Kiểu dữ liệu đúng như OpenAPI của Backend (seller products, storefronts, seller verification). */

export type ApiMedia = { id: number; variantId?: number | null; url: string; sortOrder: number }

export type ApiVariant = {
  id: number
  sku: string
  /** Chuỗi JSON, vd. {"material":"Resin","color":"white","size":"10cm"} */
  attributes: string
  price: number
  stock: number
  reserved: number
  available: number
  active: boolean
  fragile?: boolean | null
  lowStockThreshold?: number | null
  packingGroup?: string | null
  weightGrams?: number | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
}

export type ApiProduct = {
  id: number
  storefrontId: number
  title: string
  description?: string | null
  category: string
  specifications?: string | null
  shippingClass?: string | null
  status: string
  moderationReason?: string | null
  /** Bản sửa đổi đang chờ duyệt — Admin phải gửi kèm khi duyệt/từ chối. */
  revision?: string | null
  updatedAt: string
  media: ApiMedia[]
  variants: ApiVariant[]
}

export type ApiPage<T> = { items: T[]; page: number; size: number; totalElements: number; totalPages: number }

export type VariantWrite = {
  sku?: string
  attributes?: Record<string, unknown>
  price?: number
  stock?: number
  active?: boolean
  fragile?: boolean
  lowStockThreshold?: number
  packingGroup?: string
  weightGrams?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
}

export type ProductWrite = {
  title?: string
  description?: string
  category?: string
  specifications?: string
  shippingClass?: string
}

export type ApiShop = {
  id: number
  name: string
  description?: string | null
  status?: string | null
  verificationStatus?: string | null
  expiresAt?: string | null
  available?: boolean | null
}

export type ApiSubscription = {
  id: number
  storefrontId: number
  fee: number
  status: string
  startAt?: string | null
  endAt?: string | null
  paidAt?: string | null
}

export type ApiSubscriptionOverview = {
  monthlyFee: number
  storefrontExpiresAt?: string | null
  latest?: ApiSubscription | null
  pending?: ApiSubscription | null
}

export type ApiSellerVerification = {
  userId: number
  emailVerified: boolean
  phoneVerified: boolean
  verifiedBankAvailable: boolean
  eligible: boolean
  verification?: {
    status?: string | null
    phoneSnapshot?: string | null
    bankAccountId?: number | null
    evidenceReference?: string | null
    submittedAt?: number | null
    reviewedAt?: number | null
    reviewerId?: number | null
    reason?: string | null
  } | null
}

export type ApiPayment = { transactionId: number; amount: number; status: string; orderUrl: string; appTransId: string }

const P = (id: number) => `/api/seller/products/${id}`

export const sellerProductApi = {
  async list(page = 0, size = 100) {
    return (await http.get<ApiEnvelope<ApiPage<ApiProduct>>>(`/api/seller/products${toQueryString({ page, size })}`))
      .data
  },
  async get(id: number) {
    return (await http.get<ApiEnvelope<ApiProduct>>(P(id))).data
  },
  async create(input: ProductWrite & { title: string; category: string; variants?: VariantWrite[] }) {
    return (await http.post<ApiEnvelope<ApiProduct>>('/api/seller/products', input)).data
  },
  /** Đổi nội dung → sản phẩm về DRAFT, phải nộp duyệt lại. */
  async update(id: number, patch: ProductWrite) {
    return (await http.patch<ApiEnvelope<ApiProduct>>(P(id), patch)).data
  },
  async submit(id: number) {
    return (await http.post<ApiEnvelope<ApiProduct>>(`${P(id)}/submit`)).data
  },
  async unpublish(id: number) {
    return (await http.patch<ApiEnvelope<ApiProduct>>(`${P(id)}/unpublish`)).data
  },
  async archive(id: number) {
    return (await http.patch<ApiEnvelope<ApiProduct>>(`${P(id)}/archive`)).data
  },
  async addVariant(id: number, variant: VariantWrite & { sku: string; price: number; stock: number }) {
    return (await http.post<ApiEnvelope<ApiProduct>>(`${P(id)}/variants`, variant)).data
  },
  async updateVariant(id: number, variantId: number, patch: VariantWrite) {
    return (await http.patch<ApiEnvelope<ApiProduct>>(`${P(id)}/variants/${variantId}`, patch)).data
  },
  /** Ngừng bán variant (soft remove); variant đang giữ chỗ không xoá được. */
  async removeVariant(id: number, variantId: number) {
    return (await http.delete<ApiEnvelope<ApiProduct>>(`${P(id)}/variants/${variantId}`)).data
  },
  /** Đặt tổng tồn kho (không thấp hơn số đang giữ chỗ) kèm lý do. */
  async setStock(id: number, variantId: number, stock: number, reason: string) {
    return (await http.patch<ApiEnvelope<ApiProduct>>(`${P(id)}/variants/${variantId}/stock`, { stock, reason })).data
  },
  async uploadMedia(id: number, file: File, options: { variantId?: number; sortOrder?: number } = {}) {
    const form = new FormData()
    form.append('file', file)
    return (
      await http.post<ApiEnvelope<ApiProduct>>(
        `${P(id)}/media${toQueryString({ variantId: options.variantId, sortOrder: options.sortOrder ?? 0 })}`,
        form,
      )
    ).data
  },
  async removeMedia(id: number, mediaId: number) {
    return (await http.delete<ApiEnvelope<ApiProduct>>(`${P(id)}/media/${mediaId}`)).data
  },
}

export const storefrontOwnerApi = {
  /** null khi tài khoản chưa có gian hàng. */
  async mine() {
    try {
      return (await http.get<ApiEnvelope<ApiShop>>('/api/storefronts/me')).data
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 404) return null
      throw e
    }
  },
  /** Tạo gian hàng (chưa kích hoạt) sau khi xác thực người bán được duyệt. */
  async create(input: { name: string; description?: string }) {
    return (await http.post<ApiEnvelope<ApiShop>>('/api/storefronts', input)).data
  },
  async update(input: { name?: string; description?: string }) {
    return (await http.patch<ApiEnvelope<ApiShop>>('/api/storefronts/me', input)).data
  },
  async subscription() {
    return (await http.get<ApiEnvelope<ApiSubscriptionOverview>>('/api/storefronts/me/subscription')).data
  },
  /** Tạo hoặc dùng lại kỳ thuê bao đang chờ thanh toán. */
  async subscribe(renew: boolean) {
    return (
      await http.post<ApiEnvelope<ApiSubscription>>(
        renew ? '/api/storefronts/me/subscriptions/renew' : '/api/storefronts/me/subscriptions',
      )
    ).data
  },
  /** Thanh toán kỳ thuê bao qua ZaloPay (sourceType/stage SUBSCRIPTION). */
  async paySubscription(subscriptionId: number) {
    return (
      await http.post<ApiEnvelope<ApiPayment>>('/api/payments/zalopay', {
        sourceType: 'SUBSCRIPTION',
        sourceId: subscriptionId,
        stage: 'SUBSCRIPTION',
      })
    ).data
  },
}

export const sellerVerificationApi = {
  async get() {
    return (await http.get<ApiEnvelope<ApiSellerVerification>>('/api/users/me/seller-verification')).data
  },
  /** Cần email, SĐT đã xác thực và một tài khoản ngân hàng VERIFIED. */
  async submit(input: { bankAccountId: number; evidenceReference: string }) {
    return (await http.post<ApiEnvelope<ApiSellerVerification>>('/api/users/me/seller-verification', input)).data
  },
}
