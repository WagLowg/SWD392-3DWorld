import { describe, expect, it } from 'vitest'
import { AUTO_CONFIRM_RECHECK_MS, autoConfirmRefetchInterval } from './autoConfirm'
import type { Order } from '../types/order.types'

function order(status: string, autoConfirmDueAt?: string | null): Order {
  return { id: 31, status, autoConfirmDueAt } as Order
}

describe('autoConfirmRefetchInterval', () => {
  it('schedules one refresh just after the backend deadline', () => {
    expect(autoConfirmRefetchInterval(order('DELIVERED', '2026-10-29T10:00:00Z'), Date.parse('2026-10-29T09:00:00Z'))).toBe(
      60 * 60_000 + 1_000,
    )
  })

  it('rechecks shortly while an overdue order is still DELIVERED', () => {
    expect(autoConfirmRefetchInterval(order('DELIVERED', '2026-10-29T09:00:00Z'), Date.parse('2026-10-29T10:00:00Z'))).toBe(
      AUTO_CONFIRM_RECHECK_MS,
    )
  })

  it('stops after the backend returns RECEIVED or no deadline', () => {
    expect(autoConfirmRefetchInterval(order('RECEIVED', '2026-10-29T09:00:00Z'))).toBe(false)
    expect(autoConfirmRefetchInterval(order('DELIVERED', null))).toBe(false)
  })

  it('uses the earliest deadline in an order list', () => {
    const now = Date.parse('2026-10-29T09:00:00Z')
    expect(
      autoConfirmRefetchInterval(
        [order('DELIVERED', '2026-10-29T11:00:00Z'), order('DELIVERED', '2026-10-29T10:00:00Z')],
        now,
      ),
    ).toBe(60 * 60_000 + 1_000)
  })
})

