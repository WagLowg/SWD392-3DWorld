import { describe, expect, it } from 'vitest'
import { canRequestRefund, isBlockingRefundStatus, refundEligibility } from './refundEligibility'

const deadline = '2026-11-04T10:00:00Z'

describe('refundEligibility', () => {
  it('allows a received order before its refund deadline', () => {
    expect(
      canRequestRefund({ status: 'RECEIVED', refundDeadlineAt: deadline }, { now: Date.parse('2026-11-04T09:59:59Z') }),
    ).toBe(true)
  })

  it('accepts COMPLETED as a backend alias for a received order', () => {
    expect(
      canRequestRefund(
        { status: 'COMPLETED', refundDeadlineAt: deadline },
        { now: Date.parse('2026-11-04T09:00:00Z') },
      ),
    ).toBe(true)
  })

  it('rejects orders before receipt, missing deadlines, and expired windows', () => {
    expect(refundEligibility({ status: 'DELIVERED', refundDeadlineAt: deadline }).reason).toBe('ORDER_NOT_RECEIVED')
    expect(refundEligibility({ status: 'RECEIVED', refundDeadlineAt: null }).reason).toBe('DEADLINE_UNAVAILABLE')
    expect(
      refundEligibility({ status: 'RECEIVED', refundDeadlineAt: deadline }, { now: Date.parse(deadline) }).reason,
    ).toBe('REFUND_WINDOW_EXPIRED')
  })

  it('blocks active and completed refunds but permits a retry after rejection', () => {
    expect(isBlockingRefundStatus('PENDING')).toBe(true)
    expect(isBlockingRefundStatus('PAID')).toBe(true)
    expect(isBlockingRefundStatus('REJECTED')).toBe(false)
    expect(isBlockingRefundStatus('FAILED')).toBe(false)
  })
})
