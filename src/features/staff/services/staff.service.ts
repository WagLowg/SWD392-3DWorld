import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiClientError, type ApiEnvelope, http } from '../../../shared/api'
import { parseShippingAddressSnapshot } from '../../orders/lib/shippingAddress'
import type { Order } from '../../orders/types/order.types'
import type { RefundStatus, ShipmentStatus, StaffRefundRequest, StaffShipment } from '../types/staff.types'

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

function normalizeRefundStatus(status?: string | null): RefundStatus {
  switch (status) {
    case 'PENDING':
      return 'PENDING'
    case 'APPROVED':
      return 'APPROVED'
    case 'REJECTED':
      return 'REJECTED'
    case 'PAID':
      return 'PAID'
    case 'COMPLETED':
      return 'PAID'
    case 'SUBMITTED':
      return 'PENDING'
    case 'UNDER_REVIEW':
      return 'PENDING'
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
  const status = normalizeShipmentStatus(raw?.status ?? raw?.shipmentStatus)
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
    events: [],
    auditHistory: [],
  }
}

export function normalizeRefundApi(raw: StaffRefundApi | null | undefined): StaffRefundRequest {
  const id = asNumber(raw?.id ?? raw?.refundId ?? 0)
  const orderId = asNumber(raw?.orderId ?? raw?.physical_order_id ?? 0)
  const status = normalizeRefundStatus(raw?.status)
  const requestedAmount = asNumber(raw?.amount ?? raw?.requestedAmount ?? raw?.refundAmount ?? 0)
  const orderCode = String(raw?.orderCode ?? `#${orderId || id || 'N/A'}`)

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
    status,
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
      payoutProviderStatus: 'PENDING_STAFF_APPROVAL',
      note: 'Chờ Staff thẩm định',
    },
  }
}

const staffShipmentQueryKey = ['staff', 'shipments'] as const
const staffRefundQueryKey = ['staff', 'refunds'] as const

export const staffService = {
  async listShipments(signal?: AbortSignal): Promise<StaffShipment[]> {
    try {
      const response = await http.get<ApiEnvelope<StaffShipmentApi[]>>('/api/staff/shipments?page=0&size=100', {
        signal,
      })
      const rows = Array.isArray(response?.data) ? response.data : []
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
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        return []
      }
      throw error
    }
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
    try {
      const response = await http.get<ApiEnvelope<StaffRefundApi[]>>('/api/staff/refunds', { signal })
      const rows = Array.isArray(response?.data) ? response.data : []
      return rows.map(normalizeRefundApi)
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        return []
      }
      throw error
    }
  },

  async reviewRefund(id: number, input: { approved: boolean; reason: string }): Promise<StaffRefundRequest> {
    const response = await http.patch<ApiEnvelope<StaffRefundApi>, { approved: boolean; reason: string }>(
      `/api/staff/refunds/${id}/review`,
      input,
    )
    return normalizeRefundApi(response.data)
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

export function useStaffRefunds() {
  const qc = useQueryClient()
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

export function useReviewRefund() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, approved, reason }: { id: number; approved: boolean; reason: string }) =>
      staffService.reviewRefund(id, { approved, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...staffRefundQueryKey] })
    },
  })
}
