import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../../shared/session/useSession'
import { buyerOrderService, codAdminService, orderService, paymentService, sellerOrderService } from '../services/order.service'
import { useOrderPaymentsStore } from '../stores/order-payments.store'
import type { CodRecordInput, PaymentMethod, RefundInput, SavePackagesInput } from '../types/order.types'
import { autoConfirmRefetchInterval } from '../lib/autoConfirm'

export const orderKeys = {
  mine: ['orders', 'mine'] as const,
  seller: ['orders', 'seller'] as const,
  buyerShipments: (orderId: number) => ['orders', orderId, 'shipments', 'buyer'] as const,
  sellerShipments: (orderId: number) => ['orders', orderId, 'shipments', 'seller'] as const,
  detail: (orderId: number) => ['orders', orderId, 'detail'] as const,
  history: (orderId: number) => ['orders', orderId, 'history'] as const,
  packages: (orderId: number) => ['orders', orderId, 'packages'] as const,
  packagingProfiles: ['shipping', 'packaging-profiles'] as const,
  codPayment: (orderId: number) => ['orders', orderId, 'cod-payment'] as const,
}

const validId = (id: number | undefined): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0

export function useOrder(orderId: number | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(orderId ?? -1),
    queryFn: ({ signal }) => orderService.detail(orderId as number, signal),
    enabled: validId(orderId),
    refetchInterval: (query) => autoConfirmRefetchInterval(query.state.data),
  })
}

export function useOrderHistory(orderId: number | undefined) {
  return useQuery({
    queryKey: orderKeys.history(orderId ?? -1),
    queryFn: ({ signal }) => orderService.history(orderId as number, signal),
    enabled: validId(orderId),
  })
}

export function useOrderPackages(orderId: number | undefined) {
  return useQuery({
    queryKey: orderKeys.packages(orderId ?? -1),
    queryFn: ({ signal }) => orderService.packages(orderId as number, signal),
    enabled: validId(orderId),
  })
}

export function useCodPayment(orderId: number | undefined, paymentMethod: PaymentMethod | null | undefined) {
  return useQuery({
    queryKey: orderKeys.codPayment(orderId ?? -1),
    queryFn: ({ signal }) => orderService.codPayment(orderId as number, signal),
    enabled: validId(orderId) && paymentMethod === 'COD',
  })
}

function useCodRecord(kind: 'collection' | 'settlement') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: number; input: CodRecordInput }) =>
      kind === 'collection'
        ? codAdminService.recordCollection(orderId, input)
        : codAdminService.recordSettlement(orderId, input),
    onSuccess: (payment, variables) => {
      qc.setQueryData(orderKeys.codPayment(variables.orderId), payment)
      qc.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) })
    },
    onError: (_error, variables) => {
      qc.invalidateQueries({ queryKey: orderKeys.codPayment(variables.orderId) })
    },
  })
}

export function useRecordCodCollection() {
  return useCodRecord('collection')
}

export function useRecordCodSettlement() {
  return useCodRecord('settlement')
}

export function usePackagingProfiles(enabled = true) {
  return useQuery({
    queryKey: orderKeys.packagingProfiles,
    queryFn: ({ signal }) => sellerOrderService.packagingProfiles(signal),
    staleTime: 5 * 60_000,
    enabled,
  })
}

/** Làm mới mọi query của một đơn + danh sách. */
function useRefreshOrder() {
  const qc = useQueryClient()
  return (orderId: number) => {
    qc.invalidateQueries({ queryKey: ['orders', orderId] })
    qc.invalidateQueries({ queryKey: orderKeys.mine })
    qc.invalidateQueries({ queryKey: orderKeys.seller })
  }
}

export function useCancelOrder() {
  const refresh = useRefreshOrder()
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason: string }) => buyerOrderService.cancel(orderId, reason),
    onSuccess: (_, v) => refresh(v.orderId),
  })
}

export function useConfirmReceived() {
  const refresh = useRefreshOrder()
  return useMutation({
    mutationFn: ({ orderId }: { orderId: number }) => buyerOrderService.confirmReceived(orderId),
    onSuccess: (_, v) => refresh(v.orderId),
  })
}

export function useSavePackages() {
  const refresh = useRefreshOrder()
  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: number; input: SavePackagesInput }) =>
      sellerOrderService.savePackages(orderId, input),
    onSuccess: (_, v) => refresh(v.orderId),
  })
}

export function useMyOrders() {
  const { data: user } = useSession()
  return useQuery({
    queryKey: orderKeys.mine,
    queryFn: ({ signal }) => buyerOrderService.list(signal),
    enabled: !!user,
    refetchInterval: (query) => autoConfirmRefetchInterval(query.state.data),
  })
}

export function useSellerOrders() {
  const { data: user } = useSession()
  return useQuery({
    queryKey: orderKeys.seller,
    queryFn: ({ signal }) => sellerOrderService.list(signal),
    enabled: !!user,
  })
}

export function useBuyerShipments(orderId: number | undefined) {
  return useQuery({
    queryKey: orderKeys.buyerShipments(orderId ?? -1),
    queryFn: ({ signal }) => buyerOrderService.shipments(orderId as number, signal),
    enabled: !!orderId,
  })
}

export function useSellerShipments(orderId: number | undefined) {
  return useQuery({
    queryKey: orderKeys.sellerShipments(orderId ?? -1),
    queryFn: ({ signal }) => sellerOrderService.shipments(orderId as number, signal),
    enabled: !!orderId,
  })
}

/** Vận đơn của nhiều đơn (màn quản lý vận chuyển người bán). */
export function useSellerShipmentsFor(orderIds: number[]) {
  return useQueries({
    queries: orderIds.map((id) => ({
      queryKey: orderKeys.sellerShipments(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => sellerOrderService.shipments(id, signal),
    })),
  })
}

export function useSellerOrderActions() {
  const qc = useQueryClient()
  const refresh = (orderId: number) => {
    qc.invalidateQueries({ queryKey: orderKeys.seller })
    qc.invalidateQueries({ queryKey: ['orders', orderId] })
  }
  return {
    updateStatus: useMutation({
      mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
        sellerOrderService.updateStatus(orderId, status),
      onSuccess: (_, v) => refresh(v.orderId),
    }),
    handoffShipment: useMutation({
      mutationFn: ({ orderId: _orderId, shipmentId }: { orderId: number; shipmentId: number }) =>
        sellerOrderService.handoffShipment(shipmentId),
      onSuccess: (_, v) => refresh(v.orderId),
    }),
  }
}

/** Tạo (lại) liên kết ZaloPay cho một đơn và ghi nhớ transactionId để hoàn tiền về sau. */
export function usePayOrder() {
  const remember = useOrderPaymentsStore((s) => s.remember)
  return useMutation({
    mutationFn: (orderId: number) => paymentService.payOrder(orderId),
    onSuccess: (payment, orderId) =>
      remember(orderId, { transactionId: payment.transactionId, amount: payment.amount }),
  })
}

export function useRefund() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ transactionId, input }: { transactionId: number; input: RefundInput }) =>
      paymentService.refund(transactionId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.mine }),
  })
}
