import type { Order, PaymentMethod } from '../types/catalog.types'

export function ordersRequiringGatewayPayment(orders: Order[], paymentMethod: PaymentMethod) {
  if (paymentMethod !== 'GATEWAY') return []
  return orders.filter((order) => order.paymentMethod !== 'COD' && order.onlinePaymentRequired !== false)
}

