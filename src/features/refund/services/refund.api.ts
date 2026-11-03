import { type ApiEnvelope, http } from '../../../shared/api'
import {
  getOrSeedLocalRefunds,
  getRefundById,
  type LocalRefundCase,
  updateLocalRefundStatus,
} from './refund.storage'

interface CustomerRefundReasonFields {
  customer_reason?: string | null
  customerReason?: string | null
  refund_reason?: string | null
  request_reason?: string | null
  requestReason?: string | null
}

export interface ManualRefundRow extends CustomerRefundReasonFields {
  id: number
  physical_order_id: number
  amount: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'
  reason: string
  created_at: string
  history?: ManualRefundAudit[]
}

export interface ManualRefundAudit {
  actor_id: number
  status: string
  reason: string
  created_at: string
  metadata?: string | null
}

export interface ManualRefundDetail extends CustomerRefundReasonFields {
  id: number
  physical_order_id: number
  payer_user_id: number
  amount: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'PROCESSING' | 'FAILED' | 'SUCCESS'
  reason: string
  transfer_reference?: string | null
  created_at: string
  history: ManualRefundAudit[]
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function localCustomerReason(local?: LocalRefundCase): string | undefined {
  if (!local) return undefined

  const reason = nonEmpty(local.reason)
  const detail = nonEmpty(local.detail)
  if (!reason) return detail
  if (!detail || detail.toLocaleLowerCase() === reason.toLocaleLowerCase()) return reason
  return `${reason} — ${detail}`
}

function extractCustomerRefundReason(
  refund: CustomerRefundReasonFields & { reason?: string | null; history?: ManualRefundAudit[] },
  local?: LocalRefundCase,
): string | undefined {
  const explicitCustomerReason =
    nonEmpty(refund.customer_reason) ??
    nonEmpty(refund.customerReason) ??
    nonEmpty(refund.refund_reason) ??
    nonEmpty(refund.request_reason) ??
    nonEmpty(refund.requestReason)
  if (explicitCustomerReason) return explicitCustomerReason

  const requestedReason = refund.history
    ?.find((entry) => entry.status?.toUpperCase() === 'REFUND_REQUESTED')
    ?.reason

  return nonEmpty(requestedReason) ?? localCustomerReason(local)
}

/** Keep the customer's submitted reason separate from the Staff review note. */
export function resolveCustomerRefundReason(
  refund: CustomerRefundReasonFields & { reason?: string | null; history?: ManualRefundAudit[] },
  local?: LocalRefundCase,
): string {
  return extractCustomerRefundReason(refund, local) ?? nonEmpty(refund.reason) ?? '—'
}

function findLocalRefund(
  localCases: LocalRefundCase[],
  refund: Pick<ManualRefundRow, 'id' | 'physical_order_id'>,
): LocalRefundCase | undefined {
  return localCases.find(
    (item) => item.id === refund.id || item.orderId === refund.physical_order_id,
  )
}

async function normalizeAdminRefundRow(
  row: ManualRefundRow,
  local?: LocalRefundCase,
): Promise<ManualRefundRow> {
  let customerReason = extractCustomerRefundReason(row, local)

  // A reviewed list row can expose the Staff note as `reason`. Fetch its audit
  // only when neither the list response nor local submission has the customer reason.
  if (!customerReason && row.status !== 'PENDING') {
    try {
      const detail = await http.get<ApiEnvelope<ManualRefundDetail>>(`/api/refunds/${row.id}`)
      customerReason = extractCustomerRefundReason(detail.data, local)
    } catch {
      // Keep the list available even if an individual detail request fails.
    }
  }

  return {
    ...row,
    reason: customerReason ?? nonEmpty(row.reason) ?? '—',
  }
}

export interface StaffReviewRefundInput {
  approved: boolean
  reason: string
  shippingPayer?: 'SELLER' | 'PLATFORM' | 'BUYER'
  outboundFee?: number
  returnFee?: number
  carrierReference?: string
}

export interface AdminConfirmTransferInput {
  transferReference: string
  reason: string
}

export interface AdminTransferDetails {
  bankCode: string
  bankName: string
  accountHolder: string
  accountNumber: string
}

export const refundApi = {
  /** POST /api/orders/{orderId}/refunds - Khách hàng nộp yêu cầu hoàn tiền thủ công */
  async submitCustomerRefund(
    orderId: number,
    data: {
      bankAccountId: number
      accountNumber: string
      reason: string
      images: File[]
    },
  ): Promise<ManualRefundDetail> {
    const formData = new FormData()
    formData.append('bankAccountId', String(data.bankAccountId))
    formData.append('accountNumber', data.accountNumber.trim())
    formData.append('reason', data.reason.trim())
    for (const file of data.images) {
      formData.append('images', file)
    }

    const res = await http.post<ApiEnvelope<ManualRefundDetail>>(
      `/api/orders/${orderId}/refunds`,
      formData,
    )
    return res.data
  },

  /** GET /api/refunds/{id} - Lấy chi tiết hồ sơ khiếu nại hoàn tiền */
  async getDetail(id: number | string): Promise<ManualRefundDetail> {
    try {
      const res = await http.get<ApiEnvelope<ManualRefundDetail>>(`/api/refunds/${id}`)
      return {
        ...res.data,
        reason: resolveCustomerRefundReason(res.data, getRefundById(id)),
      }
    } catch {
      // Fallback từ local storage
      const found = getRefundById(id)
      if (found) {
        return {
          id: found.id || found.orderId,
          physical_order_id: found.orderId,
          payer_user_id: 1,
          amount: found.amount || 224200,
          status: (found.status as any) || 'PENDING',
          reason: found.reason || 'Khiếu nại sản phẩm',
          transfer_reference: found.transferReference,
          created_at: found.createdAt || new Date().toISOString(),
          history: [
            {
              actor_id: 1,
              status: 'REFUND_REQUESTED',
              reason: found.reason || 'Khách hàng gửi yêu cầu hoàn tiền',
              created_at: found.createdAt || new Date().toISOString(),
            },
            ...(found.status === 'APPROVED' || found.status === 'PAID'
              ? [
                  {
                    actor_id: 2,
                    status: 'REFUND_APPROVED',
                    reason: found.staffReviewReason || 'Staff đã thẩm định và chấp thuận',
                    created_at: new Date().toISOString(),
                  },
                ]
              : []),
            ...(found.status === 'PAID'
              ? [
                  {
                    actor_id: 3,
                    status: 'REFUND_PAID',
                    reason: 'Admin đã chuyển khoản hoàn tiền thành công',
                    created_at: new Date().toISOString(),
                  },
                ]
              : []),
          ],
        }
      }
      throw new Error(`Không tìm thấy hồ sơ khiếu nại #${id}`)
    }
  },

  /** GET /api/staff/refunds - Hàng chờ thẩm định của Staff */
  async listStaffRefunds(params?: { status?: string; page?: number; size?: number }): Promise<ManualRefundRow[]> {
    let apiRows: ManualRefundRow[] = []
    try {
      const query = new URLSearchParams()
      if (params?.status) query.set('status', params.status)
      if (params?.page !== undefined) query.set('page', String(params.page))
      if (params?.size !== undefined) query.set('size', String(params.size))

      const qs = query.toString() ? `?${query.toString()}` : ''
      const res = await http.get<ApiEnvelope<ManualRefundRow[]>>(`/api/staff/refunds${qs}`)
      apiRows = res.data ?? []
    } catch {
      apiRows = []
    }

    const localCases = getOrSeedLocalRefunds()
    const merged = apiRows.map((row) => ({
      ...row,
      reason: resolveCustomerRefundReason(row, findLocalRefund(localCases, row)),
    }))
    for (const loc of localCases) {
      if (!merged.some((m) => m.id === loc.id || m.physical_order_id === loc.orderId)) {
        if (!params?.status || loc.status === params.status) {
          merged.push({
            id: loc.id || loc.orderId,
            physical_order_id: loc.orderId,
            amount: loc.amount || 224200,
            status: (loc.status as any) || 'PENDING',
            reason: localCustomerReason(loc) || 'Khiếu nại sản phẩm',
            created_at: loc.createdAt || new Date().toISOString(),
          })
        }
      }
    }
    return merged
  },

  /** PATCH /api/staff/refunds/{id}/review - Staff thẩm định chấp thuận / từ chối */
  async reviewStaffRefund(id: number | string, input: StaffReviewRefundInput): Promise<ManualRefundDetail> {
    try {
      const res = await http.patch<ApiEnvelope<ManualRefundDetail>, StaffReviewRefundInput>(
        `/api/staff/refunds/${id}/review`,
        input,
      )
      updateLocalRefundStatus(Number(id), {
        status: input.approved ? 'APPROVED' : 'REJECTED',
        staffReviewReason: input.reason,
        shippingPayer: input.shippingPayer,
        outboundFee: input.outboundFee,
        returnFee: input.returnFee,
        carrierReference: input.carrierReference,
      })
      return res.data
    } catch (err) {
      console.error('Staff review API call failed:', err)
      throw err
    }
  },

  /** GET /api/admin/refunds - Hàng chờ đối soát & chi tiền của Admin */
  async listAdminRefunds(params?: { status?: string; page?: number; size?: number }): Promise<ManualRefundRow[]> {
    let apiRows: ManualRefundRow[] = []
    try {
      const query = new URLSearchParams()
      if (params?.status) query.set('status', params.status)
      if (params?.page !== undefined) query.set('page', String(params.page))
      if (params?.size !== undefined) query.set('size', String(params.size))

      const qs = query.toString() ? `?${query.toString()}` : ''
      const res = await http.get<ApiEnvelope<ManualRefundRow[]>>(`/api/admin/refunds${qs}`)
      apiRows = res.data ?? []
    } catch {
      apiRows = []
    }

    const localCases = getOrSeedLocalRefunds()
    const merged = await Promise.all(
      apiRows.map((row) => normalizeAdminRefundRow(row, findLocalRefund(localCases, row))),
    )
    for (const loc of localCases) {
      if (!merged.some((m) => m.id === loc.id || m.physical_order_id === loc.orderId)) {
        if (!params?.status || loc.status === params.status) {
          merged.push({
            id: loc.id || loc.orderId,
            physical_order_id: loc.orderId,
            amount: loc.amount || 224200,
            status: (loc.status as any) || 'PENDING',
            reason: localCustomerReason(loc) || 'Khiếu nại sản phẩm',
            created_at: loc.createdAt || new Date().toISOString(),
          })
        }
      }
    }
    return merged
  },

  /** POST /api/admin/refunds/{id}/transfer-details - Admin xem STK giải mã để chuyển tiền */
  async getAdminTransferDetails(id: number | string, reason: string): Promise<AdminTransferDetails> {
    try {
      const res = await http.post<ApiEnvelope<AdminTransferDetails>>(
        `/api/admin/refunds/${id}/transfer-details?reason=${encodeURIComponent(reason)}`,
      )
      return res.data
    } catch {
      const found = getRefundById(id)
      return {
        bankCode: found?.bankCode || 'MOCK_BANK',
        bankName: found?.bankName || 'Demo Sandbox Bank',
        accountHolder: found?.accountHolder || 'DEMO USER 1',
        accountNumber: found?.accountNumber || found?.accountNumberMasked?.replace(/\*/g, '0') || '0000000000000003',
      }
    }
  },

  /** POST /api/admin/refunds/{id}/confirm-transfer - Admin xác nhận đã chuyển khoản thành công */
  async confirmAdminTransfer(id: number | string, input: AdminConfirmTransferInput): Promise<ManualRefundDetail> {
    try {
      const res = await http.post<ApiEnvelope<ManualRefundDetail>, AdminConfirmTransferInput>(
        `/api/admin/refunds/${id}/confirm-transfer`,
        input,
      )
      updateLocalRefundStatus(Number(id), {
        status: 'PAID',
        transferReference: input.transferReference,
      })
      return res.data
    } catch (err) {
      console.error('Admin confirm transfer API call failed:', err)
      throw err
    }
  },
}

