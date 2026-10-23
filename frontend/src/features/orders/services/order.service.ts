import { type ApiEnvelope, http } from '../../../services/http'
import type { Order, Payment, RefundInput, Shipment, ShipmentEvent } from '../types/order.types'

export const buyerOrderService = {
  async list(signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<Order[]>>('/api/orders/mine', { signal })).data ?? []
  },

  /** Hành trình vận chuyển mà người mua được xem. */
  async shipments(orderId: number, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<Shipment[]>>(`/api/orders/${orderId}/shipments`, { signal })).data ?? []
  },
}

export const sellerOrderService = {
  async list(signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<Order[]>>('/api/orders/seller', { signal })).data ?? []
  },

  /** Chuyển trạng thái có kiểm soát (PAID→PROCESSING, …→CANCELLED). */
  async updateStatus(orderId: number, status: string) {
    return (await http.patch<ApiEnvelope<Order>, { status: string }>(`/api/orders/${orderId}/status`, { status })).data
  },

  async shipments(orderId: number, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<Shipment[]>>(`/api/seller/orders/${orderId}/shipments`, { signal })).data ?? []
  },

  /** Tạo vận đơn: đơn PAID/PROCESSING → SHIPPED, Backend sinh mã vận đơn. */
  async createShipment(orderId: number, carrierName: string) {
    return (
      await http.post<ApiEnvelope<Shipment>, { carrierName: string }>(`/api/orders/${orderId}/shipment`, {
        carrierName,
      })
    ).data
  },

  async applyShipmentEvent(shipmentId: number, event: ShipmentEvent) {
    return (await http.patch<ApiEnvelope<Shipment>, { event: string }>(`/api/shipments/${shipmentId}/event`, { event }))
      .data
  },
}

export const paymentService = {
  /** sourceType PHYSICAL_ORDER + stage FULL, sourceId = id đơn con. */
  async payOrder(orderId: number) {
    return (
      await http.post<ApiEnvelope<Payment>>('/api/payments/zalopay', {
        sourceType: 'PHYSICAL_ORDER',
        sourceId: orderId,
        stage: 'FULL',
      })
    ).data
  },

  /** Yêu cầu hoàn tiền cho một giao dịch đã thanh toán thành công. */
  async refund(transactionId: number, input: RefundInput) {
    return (await http.post<ApiEnvelope<Payment>, RefundInput>(`/api/payments/${transactionId}/refund`, input)).data
  },
}
