import { type ApiEnvelope, http } from '../../../shared/api'
import { rememberPaymentAttempt } from '../../marketplace/lib/payment'
import type {
  Order,
  OrderHistoryEntry,
  PackagingProfile,
  Payment,
  RefundInput,
  SavePackagesInput,
  Shipment,
  ShipmentEvent,
  ShippingPackage,
} from '../types/order.types'

/** API dùng chung cho người mua, người bán và nhân viên (Backend kiểm quyền sở hữu). */
export const orderService = {
  async detail(orderId: number, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<Order>>(`/api/orders/${orderId}`, { signal })).data
  },

  /** Lịch sử chuyển trạng thái theo thứ tự thời gian. */
  async history(orderId: number, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<OrderHistoryEntry[]>>(`/api/orders/${orderId}/history`, { signal })).data ?? []
  },

  /** Kiện hàng đã đóng gói (bản chụp). */
  async packages(orderId: number, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<ShippingPackage[]>>(`/api/orders/${orderId}/packages`, { signal })).data ?? []
  },
}

export const buyerOrderService = {
  async list(signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<Order[]>>('/api/orders/mine', { signal })).data ?? []
  },

  /** Huỷ đơn chưa thanh toán — giải phóng tồn kho; đơn đã trả tiền phải đi luồng hoàn tiền. */
  async cancel(orderId: number, reason: string) {
    return (
      await http.post<ApiEnvelope<Order>, { reason: string }>(`/api/orders/${orderId}/cancel`, { reason })
    ).data
  },

  /** Xác nhận đã nhận đơn DELIVERED — bắt đầu thời hạn hoàn tiền. */
  async confirmReceived(orderId: number) {
    return (await http.post<ApiEnvelope<Order>>(`/api/orders/${orderId}/confirm-received`)).data
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

  /** Thay toàn bộ kiện hàng trước khi tạo vận đơn; mỗi đơn vị hàng phải được phân bổ đúng 1 lần. */
  async savePackages(orderId: number, input: SavePackagesInput) {
    return (
      await http.post<ApiEnvelope<ShippingPackage[]>, SavePackagesInput>(`/api/orders/${orderId}/packages`, input)
    ).data
  },

  async packagingProfiles(signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<PackagingProfile[]>>('/api/shipping/packaging-profiles', { signal })).data ?? []
  },

  async applyShipmentEvent(shipmentId: number, event: ShipmentEvent) {
    return (await http.patch<ApiEnvelope<Shipment>, { event: string }>(`/api/shipments/${shipmentId}/event`, { event }))
      .data
  },
}

export const paymentService = {
  /** sourceType PHYSICAL_ORDER + stage FULL, sourceId = id đơn con. */
  async payOrder(orderId: number) {
    const payment = (
      await http.post<ApiEnvelope<Payment>>('/api/payments/zalopay', {
        sourceType: 'PHYSICAL_ORDER',
        sourceId: orderId,
        stage: 'FULL',
      })
    ).data
    rememberPaymentAttempt(payment.appTransId, 'order', orderId)
    return payment
  },

  /** Yêu cầu hoàn tiền cho một giao dịch đã thanh toán thành công. */
  async refund(transactionId: number, input: RefundInput) {
    return (await http.post<ApiEnvelope<Payment>, RefundInput>(`/api/payments/${transactionId}/refund`, input)).data
  },
}
