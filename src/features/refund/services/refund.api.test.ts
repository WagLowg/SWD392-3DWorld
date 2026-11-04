import { describe, expect, it } from 'vitest'
import type { LocalRefundCase } from './refund.storage'
import { resolveCustomerRefundReason } from './refund.api'

const localRefund: LocalRefundCase = {
  id: 122,
  orderId: 51,
  orderCode: 'ORD-00051',
  productTitle: 'Printed model',
  amount: 324_200,
  status: 'PAID',
  reason: 'Damaged during delivery',
  detail: 'The model arrived with a broken base',
  bankName: 'Test Bank',
  accountNumberMasked: '***1234',
  accountHolder: 'TEST USER',
  createdAt: '2026-11-03T00:00:00Z',
  staffReviewReason: 'Approved by Staff',
}

describe('resolveCustomerRefundReason', () => {
  it('uses the customer reason from local submission instead of the Staff review note', () => {
    expect(resolveCustomerRefundReason({ reason: 'Approved by Staff' }, localRefund)).toBe(
      'Damaged during delivery — The model arrived with a broken base',
    )
  })

  it('prefers the original REFUND_REQUESTED audit entry', () => {
    expect(
      resolveCustomerRefundReason({
        reason: 'Approved by Staff',
        history: [
          {
            actor_id: 10,
            status: 'REFUND_REQUESTED',
            reason: 'Wrong material received',
            created_at: '2026-11-03T00:00:00Z',
          },
          {
            actor_id: 20,
            status: 'REFUND_APPROVED',
            reason: 'Approved by Staff',
            created_at: '2026-11-03T01:00:00Z',
          },
        ],
      }),
    ).toBe('Wrong material received')
  })

  it('supports a dedicated customer reason returned by the backend', () => {
    expect(
      resolveCustomerRefundReason({
        reason: 'Approved by Staff',
        customer_reason: 'Item was cracked on arrival',
      }),
    ).toBe('Item was cracked on arrival')
  })
})
