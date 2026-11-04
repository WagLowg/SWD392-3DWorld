import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiClientError, type ApiEnvelope, http } from '../../../shared/api'
import { parseShippingAddressSnapshot } from '../../orders/lib/shippingAddress'
import type { Order } from '../../orders/types/order.types'
import {
  getLocalRefunds,
  getRefundById,
  type LocalRefundCase,
  updateLocalRefundStatus,
} from '../../refund/services/refund.storage'
import type {
  RefundStatus,
  ShipmentStatus,
  StaffEvidenceItem,
  StaffRefundHistoryEntry,
  StaffRefundItem,
  StaffRefundRequest,
  StaffShipment,
} from '../types/staff.types'

export type StaffShipmentApi = {
  id?: number | string
  shipmentId?: number | string
  orderId?: number | string
  physicalOrderId?: number | string
  trackingNumber?: string
  trackingNo?: string
  code?: string
  carrierName?: string
  carrierCode?: string
  carrier?: { name?: string; code?: string }
  status?: string
  shipmentStatus?: string
  shippedAt?: string | null
  deliveredAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  lastUpdatedAt?: string | null
  orderCode?: string
  customerName?: string
  recipientName?: string
  recipientPhone?: string
  recipientAddress?: string
  orderTotalAmount?: number
  shippingFee?: number
  items?: unknown[]
  storefrontName?: string
  sellerName?: string
  notes?: string
  [key: string]: unknown
}

export type StaffRefundApi = {
  id?: number | string
  refundId?: number | string
  orderId?: number | string
  physical_order_id?: number | string
  orderCode?: string
  status?: string
  amount?: number | string
  requestedAmount?: number | string
  refundAmount?: number | string
  reason?: string
  description?: string
  refund_reason?: string
  created_at?: string
  submittedAt?: string
  customerName?: string
  customerPhone?: string
  storefrontName?: string
  sellerName?: string
  [key: string]: unknown
}

function asNumber(value: unknown, fallback = 0): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function normalizeShipmentStatus(status?: string | null): ShipmentStatus {
  switch (status) {
    case 'PREPARING':
      return 'PREPARING'
    case 'HANDED_TO_CARRIER':
      return 'HANDED_TO_CARRIER'
    case 'PENDING':
    case 'PENDING_PICKUP':
      return 'PENDING'
    case 'SHIPPED':
      return 'SHIPPED'
    case 'IN_TRANSIT':
      return 'IN_TRANSIT'
    case 'ARRIVED_AT_DESTINATION':
      return 'ARRIVED_AT_DESTINATION'
    case 'DELIVERED':
      return 'DELIVERED'
    case 'RECEIVED':
      return 'RECEIVED'
    case 'FAILED':
      return 'FAILED'
    case 'RETURNED':
      return 'RETURNED'
    case 'CANCELLED':
      return 'CANCELLED'
    default:
      return 'PENDING'
  }
}

export function normalizeRefundStatus(status?: string | null): RefundStatus {
  switch (status?.toUpperCase()) {
    case 'APPROVED':
    case 'PROCESSING':
      return 'APPROVED'
    case 'PAID':
    case 'SUCCESS':
    case 'COMPLETED':
      return 'PAID'
    case 'REJECTED':
    case 'FAILED':
      return 'REJECTED'
    case 'PENDING':
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
    case 'NEEDS_INFO':
      return 'PENDING'
    default:
      return 'PENDING'
  }
}

export function normalizeShipmentApi(raw: StaffShipmentApi | null | undefined, order?: Order | null): StaffShipment {
  const id = asNumber(raw?.id ?? raw?.shipmentId ?? 0)
  const orderId = asNumber(raw?.orderId ?? raw?.physicalOrderId ?? 0)
  const trackingNumber = raw?.trackingNumber ?? raw?.trackingNo ?? raw?.code ?? `GHTK-${id || 'NEW'}`
  const carrierCode = raw?.carrierCode ?? raw?.carrier?.code ?? 'GHTK'
  const carrierName = raw?.carrierName ?? raw?.carrier?.name ?? 'Giao Hàng Tiết Kiệm'
  const orderCode = String(raw?.orderCode ?? order?.orderCode ?? `ORD-${String(orderId || id || 0).padStart(5, '0')}`)
  const rawStatus = normalizeShipmentStatus(raw?.status ?? raw?.shipmentStatus)
  const isOrderReceived = String(order?.status).toUpperCase() === 'RECEIVED'
  const status: ShipmentStatus = isOrderReceived || rawStatus === 'RECEIVED' ? 'RECEIVED' : rawStatus
  const address = parseShippingAddressSnapshot(order?.shippingAddressSnapshot)
  const addressParts = [address?.addressLine, address?.ward, address?.district, address?.province].filter(Boolean)
  const createdAt = raw?.createdAt ?? new Date().toISOString()

  return {
    id,
    trackingNumber: String(trackingNumber),
    carrierName: String(carrierName),
    carrierCode: String(carrierCode),
    orderId,
    orderCode,
    status,
    createdAt,
    shippedAt: raw?.shippedAt ?? null,
    deliveredAt: raw?.deliveredAt ?? null,
    lastUpdatedAt: raw?.updatedAt ?? raw?.lastUpdatedAt ?? raw?.deliveredAt ?? raw?.shippedAt ?? createdAt,
    recipientName: String(raw?.recipientName ?? raw?.customerName ?? address?.recipientName ?? 'Người nhận'),
    recipientPhone: String(raw?.recipientPhone ?? address?.phone ?? '—'),
    recipientAddress: String(raw?.recipientAddress ?? (addressParts.join(', ') || '—')),
    recipientProvince: address?.province ?? '—',
    recipientDistrict: address?.district ?? '—',
    recipientWard: address?.ward ?? '—',
    storefrontId: order?.storefrontId ?? 0,
    storefrontName: String(
      raw?.storefrontName ?? (order?.storefrontId ? `Xưởng #${order.storefrontId}` : 'Xưởng 3DWorld'),
    ),
    sellerName: String(raw?.sellerName ?? 'Người bán'),
    sellerPhone: '—',
    sellerAddress: '—',
    items:
      order?.items.map((item) => ({
        id: item.id,
        productTitle: item.productTitle || `Sản phẩm ${item.sku}`,
        variantName: item.attributes || item.sku,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        weightGrams: 0,
      })) ?? (Array.isArray(raw?.items) ? (raw.items as StaffShipment['items']) : []),
    totalWeightGrams: order?.shippingWeightGrams ?? 0,
    packageDimensionsCm: { length: 0, width: 0, height: 0 },
    shippingFee: asNumber(raw?.shippingFee ?? order?.shippingFee ?? 0),
    orderTotalAmount: asNumber(raw?.orderTotalAmount ?? order?.totalAmount ?? 0),
    paymentMethod: order?.paymentMethod === 'COD' ? 'COD' : 'ZALOPAY',
    paymentStatus: order?.paymentMethod === 'COD' ? 'PENDING_COLLECTION' : 'PAID',
    codAmount: order?.paymentMethod === 'COD' ? Number(order.totalAmount) : 0,
    deliveryAttempts: 0,
    notes: String(raw?.notes ?? ''),
    events: isOrderReceived
      ? [
          {
            id: 'ev-rec-' + (id || orderId),
            title: 'Khách hàng xác nhận đã nhận hàng',
            description: 'Người mua đã kiểm tra kiện hàng và bấm xác nhận đã nhận hàng thành công.',
            timestamp: order?.receivedAt ?? new Date().toISOString(),
            status: 'RECEIVED' as const,
          },
        ]
      : [],
    auditHistory: [],
  }
}

export function normalizeRefundApi(raw: StaffRefundApi | null | undefined): StaffRefundRequest {
  const id = asNumber(raw?.id ?? raw?.refundId ?? 0)
  const orderId = asNumber(raw?.orderId ?? raw?.physical_order_id ?? 0)
  const rawStatus = raw?.status ?? (raw as any)?.fulfillment_status
  const status = normalizeRefundStatus(rawStatus)
  const requestedAmount = asNumber(raw?.amount ?? raw?.requestedAmount ?? raw?.refundAmount ?? 0)
  const orderCode = String(raw?.orderCode ?? `#${orderId || id || 'N/A'}`)

  const isPaid =
    status === 'PAID' ||
    String(raw?.status).toUpperCase() === 'SUCCESS' ||
    String((raw as any)?.fulfillment_status).toUpperCase() === 'COMPLETED'
  const isApproved =
    status === 'APPROVED' ||
    String(raw?.status).toUpperCase() === 'PROCESSING' ||
    String((raw as any)?.fulfillment_status).toUpperCase() === 'APPROVED'

  const finalStatus: RefundStatus = isPaid ? 'PAID' : isApproved ? 'APPROVED' : status

  return {
    id,
    code: `REF-${id || 'NEW'}`,
    orderId,
    orderCode,
    customerId: 0,
    customerName: String(raw?.customerName ?? 'Khách hàng'),
    customerEmail: '',
    customerPhone: String(raw?.customerPhone ?? '—'),
    storefrontId: 0,
    storefrontName: String(raw?.storefrontName ?? 'Xưởng 3DWorld'),
    sellerName: String(raw?.sellerName ?? 'Người bán'),
    sellerPhone: '—',
    reason: String(raw?.reason ?? raw?.description ?? raw?.refund_reason ?? 'Không có lý do'),
    reasonCategory: 'OTHER',
    description: String(raw?.description ?? raw?.reason ?? raw?.refund_reason ?? 'Không có mô tả'),
    requestedAmount,
    originalOrderTotal: requestedAmount,
    status: finalStatus,
    adminExecutionStatus: isPaid ? 'COMPLETED' : isApproved ? 'PENDING_ADMIN' : 'NOT_REQUESTED',
    submittedAt: String(raw?.submittedAt ?? raw?.created_at ?? new Date().toISOString()),
    receivedAt: String(raw?.submittedAt ?? raw?.created_at ?? new Date().toISOString()),
    refundDeadlineAt: String(raw?.submittedAt ?? raw?.created_at ?? new Date().toISOString()),
    evidence: [],
    items: [],
    shipmentSummary: {
      trackingNumber: '—',
      carrierName: '—',
      deliveredAt: String(raw?.submittedAt ?? raw?.created_at ?? new Date().toISOString()),
      shipmentStatus: 'PENDING',
    },
    history: [],
    financialStatus: {
      sellerEarningsStatus: 'HELD',
      payoutProviderStatus: isPaid ? 'PROCESSED' : isApproved ? 'QUEUED_FOR_GATEWAY' : 'PENDING_STAFF_APPROVAL',
      note: isPaid
        ? 'Đã hoàn tất chuyển tiền cho khách hàng'
        : isApproved
          ? 'Staff đã duyệt · Chờ Admin chuyển khoản'
          : 'Chờ Staff thẩm định',
    },
  }
}

const staffShipmentQueryKey = ['staff', 'shipments'] as const
const staffRefundQueryKey = ['staff', 'refunds'] as const

/** Load and enrich the system-wide shipment feed exposed to operational roles. */
export async function listOperationalShipments(endpoint: string, signal?: AbortSignal): Promise<StaffShipment[]> {
  try {
    const rows: StaffShipmentApi[] = []
    const pageSize = 100
    let page = 0

    // The endpoint returns a plain list without totalPages, so keep reading until
    // the final short page to ensure Admin can see the whole system feed.
    while (true) {
      const response = await http.get<ApiEnvelope<StaffShipmentApi[]>>(`${endpoint}?page=${page}&size=${pageSize}`, {
        signal,
      })
      const chunk = Array.isArray(response?.data) ? response.data : []
      rows.push(...chunk)
      if (chunk.length < pageSize) break
      page += 1
    }

    const orders = await Promise.all(
      rows.map(async (row) => {
        const orderId = asNumber(row.physicalOrderId ?? row.orderId)
        if (!orderId) return null
        try {
          return (await http.get<ApiEnvelope<Order>>(`/api/orders/${orderId}`, { signal })).data
        } catch {
          return null
        }
      }),
    )
    return rows.map((row, index) => normalizeShipmentApi(row, orders[index]))
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) return []
    throw error
  }
}

export function mapLocalToStaffRequest(loc: LocalRefundCase): StaffRefundRequest {
  const isApproved = loc.status === 'APPROVED' || loc.status === 'PROCESSING'
  const isPaid = loc.status === 'PAID' || loc.status === 'SUCCESS' || loc.status === 'COMPLETED'
  const isRejected = loc.status === 'REJECTED' || loc.status === 'FAILED'
  const normStatus: RefundStatus = isPaid ? 'PAID' : isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'PENDING'

  return {
    id: loc.id || loc.orderId,
    code: `REF-${loc.id || loc.orderId}`,
    orderId: loc.orderId,
    orderCode: loc.orderCode || `#ORD-${loc.orderId}`,
    customerId: 1,
    customerName: loc.accountHolder || 'Demo User 1',
    customerEmail: 'demouser1@example.com',
    customerPhone: '0900000003',
    storefrontId: loc.storefrontId || 12,
    storefrontName: loc.storefrontName || `Xưởng #${loc.storefrontId || 12}`,
    sellerName: loc.sellerName || 'Chủ xưởng #12',
    sellerPhone: loc.sellerPhone || '0900000012',
    reason: loc.reason || 'Sản phẩm lỗi/vỡ khi vận chuyển',
    reasonCategory: 'DAMAGED_IN_TRANSIT',
    description: loc.detail || loc.reason || 'Sản phẩm bị nứt vỡ khi mở hộp',
    requestedAmount: loc.amount,
    originalOrderTotal: loc.amount,
    status: normStatus,
    adminExecutionStatus: isPaid ? 'COMPLETED' : isApproved ? 'PENDING_ADMIN' : 'NOT_REQUESTED',
    submittedAt: loc.createdAt || new Date().toISOString(),
    receivedAt: loc.createdAt || new Date().toISOString(),
    refundDeadlineAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    evidence:
      loc.images && loc.images.length > 0
        ? loc.images.map((img, idx) => ({
            id: `ev-${idx + 1}`,
            type: 'image' as const,
            url: img,
            caption: `Ảnh minh chứng sản phẩm #${idx + 1}`,
            uploadedAt: loc.createdAt || new Date().toISOString(),
          }))
        : [
            {
              id: 'ev-1',
              type: 'image' as const,
              url: 'https://res.cloudinary.com/dbuzojydp/image/upload/v1793179053/Products/3DDE-RESIN-WHITE-S.png',
              caption: 'Ảnh minh chứng sản phẩm lỗi vỡ',
              uploadedAt: loc.createdAt || new Date().toISOString(),
            },
          ],
    items: [
      {
        id: 1,
        orderItemId: 1,
        productTitle: loc.productTitle || 'Tượng Jade cute',
        variantName: loc.attributes || 'S · Trắng · RESIN',
        sku: '3DDE-RESIN-WHITE-S',
        quantityPurchased: 1,
        defectiveQuantity: 1,
        unitPrice: 200000,
        refundAmount: loc.amount,
      },
    ],
    shipmentSummary: {
      trackingNumber: `GHTK-DEMO-${loc.orderId}`,
      carrierName: 'Giao Hàng Tiết Kiệm',
      deliveredAt: loc.createdAt || new Date().toISOString(),
      shipmentStatus: 'DELIVERED',
    },
    history: [
      {
        id: 'h-1',
        timestamp: loc.createdAt || new Date().toISOString(),
        actor: 'Khách hàng',
        action: 'Nộp yêu cầu hoàn tiền',
        note: loc.reason,
        tone: 'violet',
      },
      ...(loc.staffReviewReason || isApproved || isRejected
        ? [
            {
              id: 'h-2',
              timestamp: new Date().toISOString(),
              actor: 'Staff Kiểm duyệt',
              action: isApproved ? 'Staff duyệt chấp thuận' : 'Staff từ chối yêu cầu',
              note: loc.staffReviewReason || (isApproved ? 'Đã xác minh hình ảnh hợp lệ.' : 'Từ chối yêu cầu.'),
              tone: (isApproved ? 'green' : 'danger') as any,
            },
          ]
        : []),
      ...(isPaid
        ? [
            {
              id: 'h-3',
              timestamp: new Date().toISOString(),
              actor: 'Admin Kế toán',
              action: 'Admin chuyển khoản hoàn tiền',
              note: loc.transferReference ? `Mã giao dịch: ${loc.transferReference}` : 'Đã thanh toán',
              tone: 'green' as any,
            },
          ]
        : []),
    ],
    financialStatus: {
      sellerEarningsStatus: 'HELD',
      payoutProviderStatus: isPaid ? 'PROCESSED' : isApproved ? 'QUEUED_FOR_GATEWAY' : 'PENDING_STAFF_APPROVAL',
      note: isPaid
        ? 'Đã hoàn tất chuyển tiền cho khách hàng'
        : isApproved
          ? 'Staff đã duyệt · Chờ Admin chuyển khoản'
          : 'Chờ Staff thẩm định',
    },
  }
}

export const staffService = {
  async listShipments(signal?: AbortSignal): Promise<StaffShipment[]> {
    return listOperationalShipments('/api/staff/shipments', signal)
  },

  async updateShipmentEvent(shipmentId: number, event: string): Promise<StaffShipment> {
    const response = await http.patch<ApiEnvelope<StaffShipmentApi>, { event: string }>(
      `/api/shipments/${shipmentId}/event`,
      {
        event,
      },
    )
    return normalizeShipmentApi(response.data)
  },

  async listRefunds(signal?: AbortSignal): Promise<StaffRefundRequest[]> {
    let rows: StaffRefundApi[] = []
    try {
      const response = await http.get<ApiEnvelope<StaffRefundApi[]>>('/api/staff/refunds', { signal })
      rows = Array.isArray(response?.data) ? response.data : []
    } catch {
      // Backend có thể trả về 403 hoặc rỗng nếu chưa có record trong database
      rows = []
    }

    // Merge locally submitted refunds while the customer list API is unavailable.
    const localCases = getLocalRefunds()

    // Bổ sung thông tin chi tiết đơn hàng cho các dòng API từ backend
    let apiRefunds: StaffRefundRequest[] = []
    if (rows.length > 0) {
      try {
        apiRefunds = await Promise.all(
          rows.map(async (row) => {
            const orderId = asNumber(row.physical_order_id ?? row.orderId)
            let order: Order | null = null
            if (orderId) {
              try {
                order = (await http.get<ApiEnvelope<Order>>(`/api/orders/${orderId}`, { signal })).data
              } catch {
                // ignore
              }
            }
            return normalizeRefundDetail(row, order)
          }),
        )
      } catch {
        apiRefunds = []
      }
    }

    const merged = [...apiRefunds]
    for (const loc of localCases) {
      const existsIndex = merged.findIndex((m) => m.orderId === loc.orderId || m.id === loc.id)
      if (existsIndex === -1) {
        merged.push(mapLocalToStaffRequest(loc))
      }
    }

    return merged
  },

  async getRefundDetail(id: number, signal?: AbortSignal): Promise<StaffRefundRequest> {
    try {
      const res = await http.get<ApiEnvelope<any>>(`/api/refunds/${id}`, { signal })
      const data = res.data
      let order: any = null
      if (data?.physical_order_id) {
        try {
          const orderRes = await http.get<ApiEnvelope<any>>(`/api/orders/${data.physical_order_id}`, { signal })
          order = orderRes?.data
        } catch {
          // ignore
        }
      }
      return normalizeRefundDetail(data, order)
    } catch {
      const found = getRefundById(id)
      if (found) {
        return mapLocalToStaffRequest(found)
      }
      throw new Error(`Không tìm thấy hồ sơ hoàn tiền #${id}`)
    }
  },

  async reviewRefund(
    id: number,
    input: {
      approved: boolean
      reason: string
      shippingPayer?: 'SELLER' | 'PLATFORM' | 'BUYER'
      outboundFee?: number
      returnFee?: number
      carrierReference?: string
    },
  ): Promise<StaffRefundRequest> {
    try {
      const response = await http.patch<ApiEnvelope<StaffRefundApi>>(`/api/staff/refunds/${id}/review`, input)
      updateLocalRefundStatus(id, {
        status: input.approved ? 'APPROVED' : 'REJECTED',
        staffReviewReason: input.reason,
        shippingPayer: input.shippingPayer,
        outboundFee: input.outboundFee,
        returnFee: input.returnFee,
        carrierReference: input.carrierReference,
      })
      return normalizeRefundApi(response.data)
    } catch (err: any) {
      const message = err?.message || err?.response?.data?.message || 'Có lỗi khi phê duyệt hồ sơ'
      throw new Error(message)
    }
  },
}

export function useStaffShipments() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: [...staffShipmentQueryKey],
    queryFn: ({ signal }) => staffService.listShipments(signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  const transitionShipment = useMutation({
    mutationFn: ({ shipmentId, event }: { shipmentId: number; event: ShipmentStatus }) =>
      staffService.updateShipmentEvent(shipmentId, event),
    onSuccess: (updated, variables) => {
      qc.setQueryData<StaffShipment[]>(staffShipmentQueryKey, (items = []) =>
        items.map((item) =>
          item.id === variables.shipmentId
            ? {
                ...item,
                status: updated.status,
                shippedAt: updated.shippedAt,
                deliveredAt: updated.deliveredAt,
                lastUpdatedAt: new Date().toISOString(),
              }
            : item,
        ),
      )
      qc.invalidateQueries({ queryKey: ['orders', updated.orderId] })
    },
  })

  return {
    shipments: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    transitionShipment,
  }
}

export function normalizeRefundDetail(raw: any, order?: Order | null): StaffRefundRequest {
  const base = normalizeRefundApi(raw)
  let evidence: StaffEvidenceItem[] = []

  // Extract evidence images from metadata (supports string, object, and PGobject JSON)
  const extractImages = (source: any): string[] => {
    if (!source) return []
    if (Array.isArray(source)) {
      return source.filter((s: any) => typeof s === 'string' && s.startsWith('http'))
    }
    let parsed = source
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed)
      } catch {
        return []
      }
    }
    // Handle Postgres PGobject serialization: { type: 'jsonb', value: '...' }
    if (parsed && typeof parsed === 'object' && typeof parsed.value === 'string') {
      try {
        parsed = JSON.parse(parsed.value)
      } catch {}
    }
    if (parsed && Array.isArray(parsed.images)) {
      return parsed.images.filter((s: any) => typeof s === 'string')
    }
    return []
  }

  let imageUrls: string[] = []
  if (Array.isArray(raw?.history)) {
    const requested = raw.history.find(
      (h: any) => h.status === 'REFUND_REQUESTED' || h.action_type === 'REFUND_REQUESTED',
    )
    if (requested?.metadata) {
      imageUrls = extractImages(requested.metadata)
    }
    if (imageUrls.length === 0) {
      for (const h of raw.history) {
        if (h?.metadata) {
          const imgs = extractImages(h.metadata)
          if (imgs.length > 0) {
            imageUrls = imgs
            break
          }
        }
      }
    }
  }

  if (imageUrls.length === 0 && raw?.metadata) {
    imageUrls = extractImages(raw.metadata)
  }
  if (imageUrls.length === 0 && Array.isArray(raw?.images)) {
    imageUrls = extractImages(raw.images)
  }

  evidence = imageUrls.map((url: string, index: number) => ({
    id: `ev-${index}`,
    type: 'image',
    url,
    caption: `Minh chứng khiếu nại #${index + 1}`,
    uploadedAt: raw?.created_at || new Date().toISOString(),
  }))

  const history: StaffRefundHistoryEntry[] = Array.isArray(raw?.history)
    ? raw.history.map((h: any, idx: number) => ({
        id: `h-${idx}`,
        timestamp: h.created_at || new Date().toISOString(),
        actor: h.actor_id ? `Người dùng #${h.actor_id}` : 'Hệ thống',
        action:
          h.status === 'REFUND_REQUESTED'
            ? 'Nộp yêu cầu hoàn tiền'
            : h.status === 'REFUND_APPROVED'
              ? 'Staff duyệt chấp thuận'
              : h.status === 'REFUND_REJECTED'
                ? 'Staff từ chối yêu cầu'
                : h.status === 'REFUND_PAID'
                  ? 'Admin chuyển khoản hoàn tiền'
                  : h.status === 'REFUND_BANK_DETAILS_ACCESSED'
                    ? 'Admin truy cập STK ngân hàng'
                    : h.status,
        note: h.reason || undefined,
        tone:
          h.status === 'REFUND_APPROVED' || h.status === 'REFUND_PAID'
            ? 'green'
            : h.status === 'REFUND_REJECTED'
              ? 'danger'
              : 'violet',
      }))
    : []

  const items: StaffRefundItem[] =
    order?.items?.map((item: any) => ({
      id: item.id,
      orderItemId: item.id,
      productTitle: item.productTitle || `Sản phẩm ${item.sku}`,
      variantName: item.attributes || item.sku,
      sku: item.sku,
      quantityPurchased: item.quantity,
      defectiveQuantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      refundAmount: Number(item.subtotal || item.unitPrice * item.quantity),
    })) ?? []

  const address = parseShippingAddressSnapshot(order?.shippingAddressSnapshot)

  const approvedEntry = Array.isArray(raw?.history)
    ? raw.history.find((h: any) => h.status === 'REFUND_APPROVED')
    : null
  const rejectedEntry = Array.isArray(raw?.history)
    ? raw.history.find((h: any) => h.status === 'REFUND_REJECTED')
    : null
  const paidEntry = Array.isArray(raw?.history) ? raw.history.find((h: any) => h.status === 'REFUND_PAID') : null

  const isFinal = base.status === 'APPROVED' || base.status === 'PAID' || base.status === 'REJECTED'
  const reviewedAt = approvedEntry?.created_at || rejectedEntry?.created_at || (isFinal ? base.submittedAt : null)
  const reviewedBy = approvedEntry?.actor_id
    ? `Nhân viên Staff #${approvedEntry.actor_id}`
    : isFinal
      ? 'Demo Print Staff'
      : null
  const decisionReason =
    approvedEntry?.reason ||
    rejectedEntry?.reason ||
    raw?.reason ||
    raw?.refund_reason ||
    'Đã đối soát chứng từ và xác nhận hợp lệ.'

  const adminHandoff =
    base.status === 'APPROVED' || base.status === 'PAID'
      ? {
          refundRequestId: base.id,
          refundCode: base.code,
          sourceOrderId: base.orderId,
          orderCode: order?.orderCode || base.orderCode,
          staffDecision: 'APPROVED' as const,
          staffDecisionReason: decisionReason,
          staffReviewedAt: reviewedAt || base.submittedAt,
          reviewedBy: reviewedBy || 'Demo Print Staff',
          approvedRefundAmount: base.requestedAmount,
          adminExecutionStatus: base.adminExecutionStatus || (base.status === 'PAID' ? 'COMPLETED' : 'PENDING_ADMIN'),
          customerName: address?.recipientName || base.customerName,
          sellerName: base.sellerName,
          evidenceCount: evidence.length,
        }
      : null

  return {
    ...base,
    customerName: address?.recipientName || base.customerName,
    customerPhone: address?.phone || base.customerPhone,
    storefrontName: order?.storefrontId ? `Xưởng #${order.storefrontId}` : base.storefrontName,
    orderCode: order?.orderCode || base.orderCode,
    originalOrderTotal: Number(order?.totalAmount ?? base.requestedAmount),
    reviewedAt,
    reviewedBy,
    decisionReason,
    adminHandoff,
    evidence: evidence.length > 0 ? evidence : base.evidence,
    items,
    history,
  }
}

export function useStaffRefunds() {
  const qc = useQueryClient()

  useEffect(() => {
    const handleUpdate = () => {
      qc.invalidateQueries({ queryKey: [...staffRefundQueryKey] })
    }
    window.addEventListener('3dworld:refunds:updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('3dworld:refunds:updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [qc])

  const query = useQuery({
    queryKey: [...staffRefundQueryKey],
    queryFn: ({ signal }) => staffService.listRefunds(signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  const updateStaffRefund = (
    id: number,
    updater: (prev: StaffRefundRequest) => StaffRefundRequest,
  ): StaffRefundRequest | null => {
    const prev = query.data ?? []
    const current = prev.find((item) => item.id === id)
    if (!current) return null
    const next = updater(current)
    const decisionReason = next.decisionReason ?? next.reason ?? 'Đánh giá bởi Staff.'

    qc.setQueryData<StaffRefundRequest[]>(staffRefundQueryKey, (items = []) =>
      items.map((item) => (item.id === id ? next : item)),
    )

    if (next.status === 'APPROVED' || next.status === 'REJECTED') {
      void staffService
        .reviewRefund(id, {
          approved: next.status === 'APPROVED',
          reason: decisionReason,
        })
        .catch(() => undefined)
    }

    return next
  }

  return { refunds: query.data ?? [], isLoading: query.isLoading, isError: query.isError, updateStaffRefund }
}

export function useStaffRefundDetail(id: number) {
  return useQuery({
    queryKey: ['staff', 'refund', id],
    queryFn: ({ signal }) => staffService.getRefundDetail(id, signal),
    enabled: id > 0,
    staleTime: 30_000,
  })
}

export function useReviewRefund() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      approved,
      reason,
      shippingPayer,
      outboundFee,
      returnFee,
      carrierReference,
    }: {
      id: number
      approved: boolean
      reason: string
      shippingPayer?: 'SELLER' | 'PLATFORM' | 'BUYER'
      outboundFee?: number
      returnFee?: number
      carrierReference?: string
    }) =>
      staffService.reviewRefund(id, {
        approved,
        reason,
        shippingPayer,
        outboundFee,
        returnFee,
        carrierReference,
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: [...staffRefundQueryKey] })
      qc.invalidateQueries({ queryKey: ['staff', 'refund', variables.id] })
      qc.invalidateQueries({ queryKey: ['admin', 'refunds'] })
    },
  })
}
