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
  thumbnailUrl?: string | null
  /** Giá thấp nhất trong các variant đang bán. */
  price?: number | null
  maxPrice?: number | null
  averageRating?: number | null
  reviewCount?: number | null
  salesCount?: number | null
  /** Huy hiệu nổi bật (vd. BEST_SELLER, NEW) — sản phẩm có badge xuất hiện ở /api/catalog/featured. */
  badgeType?: string | null
  available?: boolean | null
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

export type StorefrontSummary = {
  id: number
  name: string
  description?: string | null
  status?: string | null
  available?: boolean | null
}

export type ProductDetail = {
  product: ProductSummary
  media: string[]
  variants: ProductVariant[]
  description?: string | null
  specifications?: string | null
  shippingClass?: string | null
  storefront?: StorefrontSummary | null
  /** false → không cho "Mua ngay" (vd. xưởng hết hạn gói). */
  buyNowEligible?: boolean | null
}

export type CatalogSort = 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'best_selling'

export type CatalogQuery = {
  keyword?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sort?: CatalogSort
  /** 0-based theo Backend. */
  page?: number
  size?: number
}

export type PagedItems<T> = {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type ProductReview = {
  id: number
  rating: number
  comment?: string | null
  /** Chuỗi ảnh (JSON array hoặc danh sách cách nhau bởi dấu phẩy). */
  images?: string | null
  createdAt: string
}

/** ShopResponse — gian hàng công khai. */
export type Shop = {
  id: number
  name: string
  description?: string | null
  status?: string | null
  verificationStatus?: string | null
  expiresAt?: string | null
  available?: boolean | null
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
  productId?: number | null
  storefrontId?: number | null
  thumbnailUrl?: string | null
}

export type CartShopGroup = {
  storefrontId: number
  items: CartItem[]
  subtotal: number
}

export type Cart = {
  cartId: number
  items: CartItem[]
  total: number
  /** Backend đã nhóm sẵn theo xưởng. */
  groups?: CartShopGroup[]
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
