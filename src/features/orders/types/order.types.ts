export type OrderItem = {
  id: number
  variantId: number
  sku: string
  quantity: number
  unitPrice: number
  lineTotal: number
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
}

/**
 * Máy trạng thái theo PhysicalOrder.transition (Backend):
 * CREATED → PENDING_PAYMENT → PAID → PROCESSING → SHIPPED → DELIVERED → RECEIVED
 * Nhánh thoát: CANCELLED (trước khi gửi), RETURNED (sau khi gửi).
 */
export type OrderStatus =
  | 'CREATED'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'RECEIVED'
  | 'CANCELLED'
  | 'RETURNED'

export type Shipment = {
  id: number
  physicalOrderId: number
  carrierName: string
  trackingNumber: string
  /** Vd. SHIPPED | DELIVERED | FAILED | RETURNED */
  status: string
  shippedAt?: string | null
  deliveredAt?: string | null
  createdAt: string
}

export type ShipmentEvent = 'DELIVERED' | 'FAILED' | 'RETURNED'

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
