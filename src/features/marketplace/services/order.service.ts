import { http } from '../../../shared/api'
import { rememberPaymentAttempt } from '../lib/payment'
import type { Address, AddressInput, ApiEnvelope, CheckoutInput, Order, Payment } from '../types/catalog.types'

export const addressService = {
  async list(signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<Address[]>>('/api/users/me/addresses', { signal })).data ?? []
  },

  /** Địa chỉ đầu tiên tự động thành mặc định. */
  async create(input: AddressInput) {
    return (await http.post<ApiEnvelope<Address>, AddressInput>('/api/users/me/addresses', input)).data
  },
}

export const orderService = {
  /** Tách các món đã chọn thành một đơn con cho mỗi xưởng và giữ chỗ tồn kho. */
  async checkout(input: CheckoutInput) {
    return (
      await http.post<ApiEnvelope<Order[]>, CheckoutInput>('/api/orders/checkout', input, {
        idempotencyKey: input.idempotencyKey,
      })
    ).data
  },

  async mine(signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<Order[]>>('/api/orders/mine', { signal })).data ?? []
  },
}

/** Backend chấp nhận sourceType PHYSICAL_ORDER + stage FULL cho đơn hàng vật lý (sourceId = id đơn con). */
export const paymentService = {
  async payOrderWithZaloPay(orderId: number) {
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
}
