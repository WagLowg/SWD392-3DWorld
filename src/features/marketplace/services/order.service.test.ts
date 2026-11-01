import { afterEach, describe, expect, it, vi } from 'vitest'
import { http } from '../../../shared/api'
import { orderService, shippingService } from './order.service'
import type { ApiEnvelope, CheckoutInput, Order, ShippingQuote, ShippingQuoteInput } from '../types/catalog.types'

afterEach(() => vi.restoreAllMocks())

describe('shippingService.quote', () => {
  it('posts the exact quote input and forwards cancellation', async () => {
    const input: ShippingQuoteInput = { cartItemIds: [12, 15], shippingAddressId: 4 }
    const quote: ShippingQuote = {
      quoteToken: 'quote-token',
      expiresAt: Date.now() + 300_000,
      version: 'GHTK_FLOOR_PACK_V1',
      pricingMode: 'INDEPENDENT_PARCELS',
      totalShippingFee: 45_000,
      shops: [],
    }
    const signal = new AbortController().signal
    const post = vi.spyOn(http, 'post').mockResolvedValue({ data: quote } as ApiEnvelope<ShippingQuote>)

    await expect(shippingService.quote(input, signal)).resolves.toEqual(quote)
    expect(post).toHaveBeenCalledWith('/api/shipping/quote', input, { signal })
  })
})

describe('orderService.checkout', () => {
  it('sends idempotency only in the request body', async () => {
    const input: CheckoutInput = {
      cartItemIds: [12, 15],
      shippingAddressId: 4,
      idempotencyKey: '311706e8-74d6-457d-a61b-d05e384fe913',
      shippingQuoteToken: 'quote-token',
      paymentMethod: 'COD',
    }
    const post = vi.spyOn(http, 'post').mockResolvedValue({ data: [] } as unknown as ApiEnvelope<Order[]>)

    await expect(orderService.checkout(input)).resolves.toEqual([])
    expect(post).toHaveBeenCalledWith('/api/orders/checkout', input)
  })
})

