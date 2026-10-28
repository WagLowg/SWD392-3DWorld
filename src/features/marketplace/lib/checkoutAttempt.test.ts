import { beforeEach, describe, expect, it } from 'vitest'
import { clearPendingCheckout, loadPendingCheckout, savePendingCheckout } from './checkoutAttempt'
import type { CheckoutInput } from '../types/catalog.types'

const payload: CheckoutInput = {
  cartItemIds: [12, 15],
  shippingAddressId: 4,
  idempotencyKey: '311706e8-74d6-457d-a61b-d05e384fe913',
  shippingQuoteToken: 'quote-token',
}

describe('pending checkout attempt', () => {
  beforeEach(() => sessionStorage.clear())

  it('restores the exact payload needed for an idempotent retry', () => {
    savePendingCheckout(payload)

    expect(loadPendingCheckout()?.payload).toEqual(payload)
  })

  it('only clears the attempt matching the completed request', () => {
    savePendingCheckout(payload)

    clearPendingCheckout('another-key')
    expect(loadPendingCheckout()).not.toBeNull()

    clearPendingCheckout(payload.idempotencyKey)
    expect(loadPendingCheckout()).toBeNull()
  })

  it('rejects duplicate and oversized cart item selections from storage', () => {
    sessionStorage.setItem(
      '3dworld.marketplace.pending-checkout',
      JSON.stringify({ createdAt: Date.now(), payload: { ...payload, cartItemIds: [12, 12] } }),
    )
    expect(loadPendingCheckout()).toBeNull()

    sessionStorage.setItem(
      '3dworld.marketplace.pending-checkout',
      JSON.stringify({
        createdAt: Date.now(),
        payload: { ...payload, cartItemIds: Array.from({ length: 101 }, (_, index) => index + 1) },
      }),
    )
    expect(loadPendingCheckout()).toBeNull()
  })
})

