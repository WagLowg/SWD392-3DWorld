import type { Tone } from '../../../shared/ui/kit'

export type ShipmentStatus = 'SHIPPED' | 'DELIVERED' | 'FAILED' | 'RETURNED'

export interface StaffOrderItem {
  id: number
  productTitle: string
  variantName: string
  sku: string
  quantity: number
  unitPrice: number
  weightGrams: number
  imageUrl?: string
}

export interface StaffShipmentEvent {
  id: string
  timestamp: string
  status: ShipmentStatus | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY'
  title: string
  description: string
  location?: string
  actor?: string
}

export interface StaffShipment {
  id: number
  trackingNumber: string
  carrierName: string
  carrierCode: string
  orderId: number
  orderCode: string
  status: ShipmentStatus
  shippedAt: string
  deliveredAt?: string | null
  lastUpdatedAt: string
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  recipientProvince: string
  recipientDistrict: string
  recipientWard: string
  storefrontId: number
  storefrontName: string
  sellerName: string
  sellerPhone: string
  sellerAddress: string
  items: StaffOrderItem[]
  totalWeightGrams: number
  packageDimensionsCm: {
    length: number
    width: number
    height: number
  }
  shippingFee: number
  orderTotalAmount: number
  paymentMethod: 'ZALOPAY' | 'COD'
  paymentStatus: 'PAID' | 'PENDING_COLLECTION'
  codAmount: number
  deliveryAttempts: number
  failureReason?: string
  notes?: string
  events: StaffShipmentEvent[]
}

export type RefundStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEEDS_INFO'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'

export interface StaffRefundItem {
  id: number
  orderItemId: number
  productTitle: string
  variantName: string
  sku: string
  quantityPurchased: number
  defectiveQuantity: number
  unitPrice: number
  refundAmount: number
  imageUrl?: string
}

export interface StaffEvidenceItem {
  id: string
  type: 'image' | 'video'
  url: string
  thumbnailUrl?: string
  caption: string
  uploadedAt: string
}

export interface StaffRefundHistoryEntry {
  id: string
  timestamp: string
  actor: string
  action: string
  note?: string
  tone?: Tone
}

export interface StaffRefundRequest {
  id: number
  code: string
  orderId: number
  orderCode: string
  customerId: number
  customerName: string
  customerEmail: string
  customerPhone: string
  storefrontId: number
  storefrontName: string
  sellerName: string
  sellerPhone: string
  reason: string
  reasonCategory: 'DAMAGED_IN_TRANSIT' | 'PRINT_DEFECT' | 'WRONG_ITEM' | 'NOT_RECEIVED' | 'OTHER'
  description: string
  requestedAmount: number
  originalOrderTotal: number
  status: RefundStatus
  submittedAt: string
  receivedAt: string
  refundDeadlineAt: string
  reviewedAt?: string | null
  reviewedBy?: string | null
  decisionReason?: string | null
  evidence: StaffEvidenceItem[]
  items: StaffRefundItem[]
  shipmentSummary: {
    trackingNumber: string
    carrierName: string
    deliveredAt: string
    shipmentStatus: ShipmentStatus
  }
  history: StaffRefundHistoryEntry[]
  financialStatus: {
    sellerEarningsStatus: 'HELD' | 'RELEASED' | 'REVERSED'
    payoutProviderStatus: 'PENDING_STAFF_APPROVAL' | 'QUEUED_FOR_GATEWAY' | 'PROCESSED' | 'CANCELLED'
    note: string
  }
}

