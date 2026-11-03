import type { ShippingQuote } from '../types/catalog.types'

export const SHIPPING_QUOTE_EXPIRY_BUFFER_MS = 5_000

export function isShippingQuoteUsable(quote: ShippingQuote | null | undefined, now = Date.now()) {
  return (
    !!quote?.quoteToken &&
    Number.isFinite(quote.expiresAt) &&
    now < quote.expiresAt - SHIPPING_QUOTE_EXPIRY_BUFFER_MS
  )
}

