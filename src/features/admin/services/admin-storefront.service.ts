import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { http } from '../../../shared/api'
import { toQueryString } from '../../../shared/lib/query'

/** GET /api/admin/storefronts — mọi gian hàng kèm gói đang thuê. */
export type PlanStatus = 'ACTIVE' | 'EXPIRED' | 'PENDING_PAYMENT' | 'NONE'
export type ShopStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
export type StorefrontSort = 'newest' | 'oldest' | 'expiring' | 'revenue' | 'name'

export type AdminStorefrontRow = {
  id: number
  name: string
  status: ShopStatus
  verificationStatus: string
  expiresAt: string | null
  createdAt: string
  owner: { userId: number; fullName: string; email: string; phone: string | null }
  plan: {
    code: string
    name: string
    durationDays: number
    status: PlanStatus
    fee: number | null
    subscriptionId: number | null
    startAt: string | null
    endAt: string | null
    paidAt: string | null
    daysLeft: number | null
  }
  pending: { subscriptionId: number; fee: number; createdAt: string } | null
  paidSubscriptions: number
  totalPaid: number
  firstPaidAt: string | null
}

export type AdminStorefrontSummary = {
  total: number
  active: number
  expired: number
  pendingPayment: number
  none: number
  suspended: number
  expiringSoon: number
}

export type AdminStorefrontList = {
  items: AdminStorefrontRow[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  summary: AdminStorefrontSummary
  currentMonthlyFee: number
}

export type AdminSubscriptionRow = {
  subscriptionId: number
  fee: number
  status: string
  startAt: string | null
  endAt: string | null
  paidAt: string | null
  createdAt: string
}

export type AdminStorefrontQuery = {
  keyword?: string
  status?: ShopStatus | ''
  plan?: PlanStatus | ''
  sort?: StorefrontSort
  /** 0-based theo Backend. */
  page?: number
  size?: number
}

type Envelope<T> = { data: T }

export const adminStorefrontService = {
  async list(query: AdminStorefrontQuery, signal?: AbortSignal) {
    return (await http.get<Envelope<AdminStorefrontList>>(`/api/admin/storefronts${toQueryString(query)}`, { signal }))
      .data
  },
  async subscriptions(storefrontId: number, signal?: AbortSignal) {
    return (
      await http.get<Envelope<AdminSubscriptionRow[]>>(`/api/admin/storefronts/${storefrontId}/subscriptions`, {
        signal,
      })
    ).data
  },
}

export function useAdminStorefronts(query: AdminStorefrontQuery, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'storefronts', query],
    queryFn: ({ signal }) => adminStorefrontService.list(query, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useAdminStorefrontSubscriptions(storefrontId: number | null) {
  return useQuery({
    queryKey: ['admin', 'storefronts', storefrontId, 'subscriptions'],
    queryFn: ({ signal }) => adminStorefrontService.subscriptions(storefrontId as number, signal),
    enabled: storefrontId != null,
  })
}
