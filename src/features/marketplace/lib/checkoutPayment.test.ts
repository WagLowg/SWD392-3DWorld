import { describe, expect, it } from 'vitest'
import { ordersRequiringGatewayPayment } from './checkoutPayment'
import type { Order } from '../types/catalog.types'

const gateway = { id: 1, paymentMethod: 'GATEWAY', onlinePaymentRequired: true } as Order
const cod = { id: 2, paymentMethod: 'COD', onlinePaymentRequired: false } as Order

describe('ordersRequiringGatewayPayment', () => {
  it('never requests ZaloPay for a COD checkout', () => {
    expect(ordersRequiringGatewayPayment([cod], 'COD')).toEqual([])
  })

  it('keeps every online child order and excludes backend-declared COD orders', () => {
    expect(ordersRequiringGatewayPayment([gateway, cod], 'GATEWAY')).toEqual([gateway])
  })
})

