import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminFinanceService } from '../services/admin-finance.service'
import type { AdminDateRange, WalletFilters } from '../types/admin-finance.types'

const RELEASE_SYNC_INTERVAL = 60_000

export const adminFinanceKeys = {
  all: ['admin-finance'] as const,
  metrics: (range: AdminDateRange) => ['admin-finance', 'metrics', range] as const,
  commissions: (range: AdminDateRange, page: number, size: number, shopId?: number) =>
    ['admin-finance', 'commissions', range, page, size, shopId] as const,
  subscriptions: (range: AdminDateRange, page: number, size: number, shopId?: number, userId?: number) =>
    ['admin-finance', 'subscriptions', range, page, size, shopId, userId] as const,
  wallets: (filters: WalletFilters) => ['admin-finance', 'wallets', filters] as const,
  shop: (shopId: number) => ['admin-finance', 'shop', shopId] as const,
  debt: (shopId: number) => ['admin-finance', 'debt', shopId] as const,
  earning: (orderId: number) => ['admin-finance', 'earning', orderId] as const,
}

export const useDashboardMetrics = (range: AdminDateRange) =>
  useQuery({
    queryKey: adminFinanceKeys.metrics(range),
    queryFn: ({ signal }) => adminFinanceService.metrics(range, signal),
    refetchInterval: RELEASE_SYNC_INTERVAL,
  })

export const useCommissionRows = (range: AdminDateRange, page: number, size: number, shopId?: number, enabled = true) =>
  useQuery({
    queryKey: adminFinanceKeys.commissions(range, page, size, shopId),
    queryFn: ({ signal }) => adminFinanceService.commissions(range, page, size, shopId, signal),
    enabled,
    refetchInterval: enabled ? RELEASE_SYNC_INTERVAL : false,
  })

export const useSubscriptionRows = (
  range: AdminDateRange,
  page: number,
  size: number,
  shopId?: number,
  userId?: number,
  enabled = true,
) =>
  useQuery({
    queryKey: adminFinanceKeys.subscriptions(range, page, size, shopId, userId),
    queryFn: ({ signal }) => adminFinanceService.subscriptions(range, page, size, shopId, userId, signal),
    enabled,
  })

export const useWalletRows = (filters: WalletFilters, enabled = true) =>
  useQuery({
    queryKey: adminFinanceKeys.wallets(filters),
    queryFn: ({ signal }) => adminFinanceService.wallets(filters, signal),
    enabled,
    refetchInterval: enabled ? RELEASE_SYNC_INTERVAL : false,
  })

export const useShopFinance = (shopId: number | null) =>
  useQuery({
    queryKey: adminFinanceKeys.shop(shopId ?? 0),
    queryFn: ({ signal }) => adminFinanceService.shop(shopId as number, signal),
    enabled: shopId !== null,
  })

export const useShippingDebt = (shopId: number | null) =>
  useQuery({
    queryKey: adminFinanceKeys.debt(shopId ?? 0),
    queryFn: ({ signal }) => adminFinanceService.shippingDebt(shopId as number, signal),
    enabled: shopId !== null,
  })

export const useEarningReconciliation = (orderId: number | null) =>
  useQuery({
    queryKey: adminFinanceKeys.earning(orderId ?? 0),
    queryFn: ({ signal }) => adminFinanceService.earning(orderId as number, signal),
    enabled: orderId !== null,
  })

export function useReconcileEarning() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (orderId: number) => adminFinanceService.reconcileEarning(orderId),
    onSuccess: (data) => {
      client.setQueryData(adminFinanceKeys.earning(data.orderId), data)
      client.invalidateQueries({ queryKey: adminFinanceKeys.all })
    },
  })
}

export function useSuspendShop() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ shopId, inactiveDays, reason }: { shopId: number; inactiveDays: number; reason: string }) =>
      adminFinanceService.suspend(shopId, inactiveDays, reason),
    onSuccess: () => client.invalidateQueries({ queryKey: adminFinanceKeys.all }),
  })
}

export function useRestoreShop() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ shopId, reason }: { shopId: number; reason: string }) => adminFinanceService.restore(shopId, reason),
    onSuccess: () => client.invalidateQueries({ queryKey: adminFinanceKeys.all }),
  })
}
