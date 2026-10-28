export type OrderItem = {
  id: number
  variantId: number
  sku: string
  quantity: number
  unitPrice: number
  lineTotal: number
  /** Bản chụp tên & thuộc tính sản phẩm lúc đặt. */
  productTitle?: string | null
  attributes?: string | null
}

/** Đơn con vật lý — mỗi xưởng (storefront) một đơn. */
export type Order = {
  id: number
  storefrontId: number
  subtotal: number
  shippingFee: number
  totalAmount: number
  status: OrderStatus | string
  createdAt: string
  items: OrderItem[]
  /** Mã đơn hiển thị do Backend sinh. */
  orderCode?: string
  /** Các đơn con cùng một lần checkout dùng chung id này. */
  checkoutGroupId?: string
  reservationExpiresAt?: string | null
  reservationStatus?: string | null
  commissionRateSnapshot?: number | null
  refundWindowHoursSnapshot?: number | null
  autoConfirmHoursSnapshot?: number | null
  shippingAddressSnapshot?: string | null
  cancellationReason?: string | null
  cancelledAt?: string | null
  deliveredAt?: string | null
  receivedAt?: string | null
  /** Hạn cuối gửi yêu cầu hoàn tiền (tính từ lúc xác nhận nhận hàng). */
  refundDeadlineAt?: string | null
  /** Hệ thống tự xác nhận nhận hàng lúc này nếu người mua không thao tác. */
  autoConfirmDueAt?: string | null
  shippingPackageCount?: number | null
  shippingWeightGrams?: number | null
  paymentMethod?: string | null
  onlinePaymentRequired?: boolean
}

export type OrderHistoryEntry = {
  id: number
  fromStatus?: string | null
  toStatus: string
  changedAt: string
  changedByUserId?: number | null
  reason?: string | null
}

export type PackageItem = { orderItemId: number; variantId: number; quantity: number }

export type ShippingPackage = {
  id: number
  code: string
  index: number
  profileCode: string
  productWeightGrams: number
  packagingWeightGrams: number
  packageWeightGrams: number
  packagingCost: number
  items: PackageItem[]
}

export type PackagingProfile = {
  id: number
  code: string
  name: string
  lengthCm: number
  widthCm: number
  heightCm: number
  maxProductWeightGrams: number
  supportsFragile: boolean
  allowedPackingGroups?: string | null
}

export type SavePackagesInput = {
  packages: { packagingProfileId: number; items: { orderItemId: number; quantity: number }[] }[]
}

/**
 * Máy trạng thái theo PhysicalOrder.transition (Backend):
 * CREATED → PENDING_PAYMENT → PAID → PROCESSING → SHIPPED → DELIVERED → RECEIVED
 * Nhánh thoát: CANCELLED (trước khi gửi), RETURNED (sau khi gửi).
 * IN_TRANSIT chỉ được giữ để tương thích dữ liệu cũ; luồng mới lưu nó trong Shipment.
 */
export type OrderStatus =
  | 'CREATED'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'RECEIVED'
  | 'CANCELLED'
  | 'RETURNED'

export type Shipment = {
  id: number
  physicalOrderId: number
  carrierName: string
  trackingNumber: string
  /** Vd. PENDING_PICKUP | SHIPPED | IN_TRANSIT | DELIVERED | FAILED | RETURNED */
  status: string
  shippedAt?: string | null
  deliveredAt?: string | null
  createdAt: string
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

export type RefundInput = {
  amount?: number
  reason?: string
}
