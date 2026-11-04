import { describe, expect, it } from 'vitest'
import type { Earning } from '../data/seller.fixtures'
import { earningCommission, realizedCommissionTotal } from './earnings'

function earning(status: Earning['status'], commissionAmount = 50_000): Earning {
  return {
    id: `earning-${status}`,
    orderId: 1,
    product: 'Product',
    sku: 'SKU',
    gross: 1_000_000,
    feeRate: 0.05,
    commissionAmount,
    status,
    ledger: [],
  }
}

describe('earning commission', () => {
  it('only counts released earnings as realized commission', () => {
    expect(
      realizedCommissionTotal([earning('RELEASED'), earning('PENDING'), earning('HELD'), earning('REFUNDED')]),
    ).toBe(50_000)
  })

  it('uses the snapshotted rate when the amount is absent', () => {
    expect(earningCommission(earning('RELEASED', 0))).toBe(50_000)
    expect(earningCommission(earning('REFUNDED'))).toBe(0)
  })
})
