import type { Tone } from '../../../shared/ui/kit'

export type ShipmentStatus =
  | 'PREPARING'
  | 'HANDED_TO_CARRIER'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_DESTINATION'
  | 'DELIVERED'
  | 'RECEIVED'
  | 'RETURNED'
  | 'FAILED'
  | 'CANCELLED'
  // Legacy values kept readable for rows created before the enum workflow.
  | 'PENDING'
  | 'PENDING_PICKUP'
  | 'SHIPPED'

export interface StaffShipmentAuditEntry {
  id: string
  timestamp: string
  previousStatus: ShipmentStatus
  newStatus: ShipmentStatus
  updatedBy: string
  reason?: string
  source: 'STAFF_MANUAL' | 'INITIAL'
}

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
  createdAt?: string
  shippedAt?: string | null
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
  auditHistory?: StaffShipmentAuditEntry[]
}

export type RefundStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEEDS_INFO'
  | 'COMPLETED'

/** Trạng thái thực chi / đối soát của Admin (tách bạch khỏi thẩm định của Staff) */
export type AdminRefundExecutionStatus = 'NOT_REQUESTED' | 'PENDING_ADMIN' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

/** Bản ghi hợp đồng bàn giao giữa Staff và Admin (Admin Handoff Contract) */
export interface StaffAdminHandoffRecord {
  refundRequestId: number
  refundCode: string
  sourceOrderId: number
  orderCode: string
  staffDecision: 'APPROVED' | 'REJECTED'
  staffDecisionReason: string
  staffReviewedAt: string
  reviewedBy: string
  approvedRefundAmount: number
  adminExecutionStatus: AdminRefundExecutionStatus
  customerName: string
  sellerName: string
  evidenceCount: number
}

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
  // Cấu trúc dữ liệu phục vụ đối soát và tra cứu của Admin trong tương lai:
  caseId?: number
  orderId?: number
  previousStatus?: RefundStatus
  newStatus?: RefundStatus
  reviewerRole?: string
  decisionReason?: string
  requestedAmountSnapshot?: number
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
  /** Trạng thái tiến trình thực chi của Admin */
  adminExecutionStatus?: AdminRefundExecutionStatus
  /** Bản ghi bàn giao sang hàng chờ Admin */
  adminHandoff?: StaffAdminHandoffRecord | null
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
