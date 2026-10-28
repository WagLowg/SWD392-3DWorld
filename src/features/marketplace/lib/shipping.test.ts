import { describe, expect, it } from 'vitest'
import { isShippingQuoteUsable, SHIPPING_QUOTE_EXPIRY_BUFFER_MS } from './shipping'
import type { ShippingQuote } from '../types/catalog.types'

const quote: ShippingQuote = {
  quoteToken: 'quote-token',
  expiresAt: 100_000,
  version: 'GHTK_FLOOR_PACK_V1',
  pricingMode: 'INDEPENDENT_PARCELS',
  totalShippingFee: 45_000,
  shops: [],
}

describe('isShippingQuoteUsable', () => {
  it('accepts a quote before the five-second safety window', () => {
    expect(isShippingQuoteUsable(quote, quote.expiresAt - SHIPPING_QUOTE_EXPIRY_BUFFER_MS - 1)).toBe(true)
  })

  it('rejects a quote at and inside the safety window', () => {
    expect(isShippingQuoteUsable(quote, quote.expiresAt - SHIPPING_QUOTE_EXPIRY_BUFFER_MS)).toBe(false)
    expect(isShippingQuoteUsable(quote, quote.expiresAt - 1)).toBe(false)
  })

  it('rejects a missing token or invalid expiry', () => {
    expect(isShippingQuoteUsable({ ...quote, quoteToken: '' }, 1)).toBe(false)
    expect(isShippingQuoteUsable({ ...quote, expiresAt: Number.NaN }, 1)).toBe(false)
  })
})

