import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../../shared/session/useSession'
import { buyerOrderService, paymentService, sellerOrderService } from '../services/order.service'
import { useOrderPaymentsStore } from '../stores/order-payments.store'
import type { RefundInput, ShipmentEvent } from '../types/order.types'

export const orderKeys = {
  mine: ['orders', 'mine'] as const,
  seller: ['orders', 'seller'] as const,
  buyerShipments: (orderId: number) => ['orders', orderId, 'shipments', 'buyer'] as const,
  sellerShipments: (orderId: number) => ['orders', orderId, 'shipments', 'seller'] as const,
}

export function useMyOrders() {
  const { data: user } = useSession()
  return useQuery({
    queryKey: orderKeys.mine,
    queryFn: ({ signal }) => buyerOrderService.list(signal),
    enabled: !!user,
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
    qc.invalidateQueries({ queryKey: orderKeys.sellerShipments(orderId) })
  }
  return {
    updateStatus: useMutation({
      mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
        sellerOrderService.updateStatus(orderId, status),
      onSuccess: (_, v) => refresh(v.orderId),
    }),
    createShipment: useMutation({
      mutationFn: ({ orderId, carrierName }: { orderId: number; carrierName: string }) =>
        sellerOrderService.createShipment(orderId, carrierName),
      onSuccess: (_, v) => refresh(v.orderId),
    }),
    shipmentEvent: useMutation({
      mutationFn: ({ shipmentId, event }: { shipmentId: number; orderId: number; event: ShipmentEvent }) =>
        sellerOrderService.applyShipmentEvent(shipmentId, event),
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
