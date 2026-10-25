import { describe, expect, it } from 'vitest'
import {
  combineStates,
  gatewayMessage,
  orderPaymentState,
  parsePaymentParams,
  paymentResultUrl,
  subscriptionPaymentState,
} from './payment'

describe('parsePaymentParams', () => {
  it('reads type/id and ZaloPay status', () => {
    const p = parsePaymentParams(new URLSearchParams('type=order&id=12&status=1&apptransid=261026_1'))
    expect(p).toEqual({ kind: 'order', ids: [12], gatewaySuccess: true, gatewayCode: '1', appTransId: '261026_1' })
  })

  it('accepts sourceType/sourceId and multiple ids', () => {
    expect(parsePaymentParams(new URLSearchParams('sourceType=PHYSICAL_ORDER&sourceId=5')).ids).toEqual([5])
    expect(parsePaymentParams(new URLSearchParams('type=order&ids=1,2,x,2')).ids).toEqual([1, 2])
    expect(parsePaymentParams(new URLSearchParams('sourceType=SUBSCRIPTION')).kind).toBe('subscription')
  })

  it('treats missing status as unknown and non-1 as failure', () => {
    expect(parsePaymentParams(new URLSearchParams('type=order&id=1')).gatewaySuccess).toBeNull()
    expect(parsePaymentParams(new URLSearchParams('type=order&id=1&status=-49')).gatewaySuccess).toBe(false)
  })
})

describe('orderPaymentState', () => {
  it('trusts backend status over the gateway hint', () => {
    expect(orderPaymentState('PAID', false)).toBe('success')
    expect(orderPaymentState('PENDING_PAYMENT', true)).toBe('confirming')
    expect(orderPaymentState('PENDING_PAYMENT', null)).toBe('confirming')
  })

  it('fails on cancel or on gateway failure while unpaid', () => {
    expect(orderPaymentState('CANCELLED', null)).toBe('failed')
    expect(orderPaymentState('PENDING_PAYMENT', false)).toBe('failed')
  })
})

describe('subscriptionPaymentState', () => {
  it('maps subscription statuses', () => {
    expect(subscriptionPaymentState('ACTIVE', null)).toBe('success')
    expect(subscriptionPaymentState('FAILED', true)).toBe('failed')
    expect(subscriptionPaymentState('PENDING', null)).toBe('confirming')
    expect(subscriptionPaymentState('PENDING', false)).toBe('failed')
  })
})

describe('combineStates', () => {
  it('waits while any order is still confirming', () => {
    expect(combineStates(['success', 'confirming'])).toBe('confirming')
    expect(combineStates(['success', 'success'])).toBe('success')
    expect(combineStates(['success', 'failed'])).toBe('failed')
  })
})

describe('helpers', () => {
  it('builds result URLs', () => {
    expect(paymentResultUrl('order', [3])).toBe('/marketplace/payment/result?type=order&id=3')
    expect(paymentResultUrl('order', [3, 4])).toBe('/marketplace/payment/result?type=order&ids=3%2C4')
    expect(paymentResultUrl('subscription')).toBe('/marketplace/payment/result?type=subscription')
  })

  it('explains gateway codes', () => {
    expect(gatewayMessage('1')).toBeNull()
    expect(gatewayMessage('-49')).toMatch(/huỷ/)
  })
})
