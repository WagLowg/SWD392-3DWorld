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
  isDefault: boolean
}

export type AddressInput = {
  recipientName: string
  phone?: string
  addressLine: string
  city?: string
}

export type CheckoutInput = {
  cartItemIds: number[]
  /** Bản chụp địa chỉ dạng chuỗi, lưu độc lập cho từng đơn con. */
  shippingAddressSnapshot: string
  shippingAddressId?: number
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
