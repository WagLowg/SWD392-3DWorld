/** Envelope chung của Backend: { status, message, data, timestamp }. */
export type ApiEnvelope<T> = {
  status: number
  message: string
  data: T
  timestamp: string
}

export type ProductSummary = {
  id: number
  storefrontId: number
  title: string
  category: string
}

export type CatalogPage = {
  items: ProductSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type ProductVariant = {
  id: number
  sku: string
  /** Chuỗi mô tả thuộc tính, có thể là JSON (vd. {"material":"PLA"}). */
  attributes: string
  price: number
  stock: number
  reserved: number
  available: number
  active: boolean
}

export type ProductDetail = {
  product: ProductSummary
  media: string[]
  variants: ProductVariant[]
}

export type CatalogQuery = {
  keyword?: string
  category?: string
  /** 0-based theo Backend. */
  page?: number
  size?: number
}

export type CartItem = {
  itemId: number
  variantId: number
  productTitle: string
  sku: string
  unitPrice: number
  quantity: number
  lineTotal: number
  unavailable: boolean
  /** Giá lúc thêm vào giỏ, có khi giá variant đã đổi. */
  previousUnitPrice?: number | null
  /** true → người mua phải chấp nhận giá mới (POST /api/cart/items/{id}/acknowledge-price) trước khi đặt. */
  priceChanged?: boolean
}

export type Cart = {
  cartId: number
  items: CartItem[]
  total: number
}

export type AddCartItemInput = {
  variantId: number
  quantity: number
}

export type Address = {
  id: number
  recipientName: string
  phone?: string | null
  addressLine: string
  city?: string | null
  province?: string | null
  district?: string | null
  ward?: string | null
  isDefault: boolean
}

export type AddressInput = {
  recipientName: string
  phone?: string
  addressLine: string
  city?: string
  province?: string
  district?: string
  ward?: string
}

export type CheckoutInput = {
  cartItemIds: number[]
  /** Bản chụp địa chỉ dạng chuỗi, lưu độc lập cho từng đơn con. */
  shippingAddressSnapshot?: string
  shippingAddressId: number
  /** Bắt buộc trong body theo CheckoutRequest; giữ nguyên khi thử lại cùng một lần đặt. */
  idempotencyKey: string
}

export type OrderItem = {
  id: number
  variantId: number
  sku: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

/** Mỗi xưởng (storefront) là một đơn con riêng. */
export type Order = {
  id: number
  storefrontId: number
  subtotal: number
  shippingFee: number
  totalAmount: number
  status: string
  createdAt: string
  items: OrderItem[]
  orderCode?: string
  checkoutGroupId?: string
  reservationExpiresAt?: string | null
  reservationStatus?: string | null
  commissionRateSnapshot?: number | null
  refundWindowHoursSnapshot?: number | null
  autoConfirmHoursSnapshot?: number | null
  shippingAddressSnapshot?: string | null
}

export type Payment = {
  transactionId: number
  attemptId: number
  appTransId: string
  amount: number
  status: string
  orderUrl: string
  zpTransToken: string
}
