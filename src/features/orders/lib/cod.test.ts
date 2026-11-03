import { describe, expect, it } from 'vitest'
import { canRecordCodCollection, canRecordCodSettlement } from './cod'
import type { CodPayment } from '../types/order.types'

const payment = { collectionStatus: 'PENDING_COLLECTION' } as CodPayment

describe('COD operation permissions', () => {
  it('only permits collection after delivery', () => {
    expect(canRecordCodCollection('SHIPPED', payment)).toBe(false)
    expect(canRecordCodCollection('DELIVERED', payment)).toBe(true)
    expect(canRecordCodCollection('RECEIVED', payment)).toBe(true)
  })

  it('only permits settlement to Admin after collection', () => {
    const pendingSettlement = { ...payment, collectionStatus: 'PENDING_SETTLEMENT' }
    expect(canRecordCodSettlement(false, pendingSettlement)).toBe(false)
    expect(canRecordCodSettlement(true, pendingSettlement)).toBe(true)
    expect(canRecordCodSettlement(true, payment)).toBe(false)
  })
})

