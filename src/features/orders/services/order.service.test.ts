import { afterEach, describe, expect, it, vi } from 'vitest'
import { http } from '../../../shared/api'
import { buyerOrderService, codAdminService, orderService } from './order.service'
import type { ApiEnvelope } from '../../../shared/api'
import type { CodPayment, CodRecordInput, Order } from '../types/order.types'

afterEach(() => vi.restoreAllMocks())

describe('buyerOrderService.confirmReceived', () => {
  it('uses the customer confirm-received endpoint without a status override body', async () => {
    const order = { id: 31, status: 'RECEIVED' } as Order
    const post = vi.spyOn(http, 'post').mockResolvedValue({ data: order } as ApiEnvelope<Order>)

    await expect(buyerOrderService.confirmReceived(31)).resolves.toEqual(order)
    expect(post).toHaveBeenCalledWith('/api/orders/31/confirm-received')
  })
})

describe('COD payment services', () => {
  const payment = {
    orderId: 31,
    transactionId: 20,
    paymentMethod: 'COD',
    status: 'PENDING',
    collectionStatus: 'PENDING_COLLECTION',
    expectedAmount: 130_000,
    amountToCollect: 130_000,
  } as CodPayment
  const input: CodRecordInput = {
    amount: 130_000,
    reference: 'GHTK-COLLECT-001',
    evidenceKey: 'BIEN-BAN-001',
    reason: 'GHTK xác nhận đã thu COD',
    occurredAt: '2026-10-29T10:00:00Z',
  }

  it('loads COD status from the order endpoint', async () => {
    const signal = new AbortController().signal
    const get = vi.spyOn(http, 'get').mockResolvedValue({ data: payment } as ApiEnvelope<CodPayment>)

    await expect(orderService.codPayment(31, signal)).resolves.toEqual(payment)
    expect(get).toHaveBeenCalledWith('/api/orders/31/cod-payment', { signal })
  })

  it('records collection and settlement with the exact payload', async () => {
    const post = vi.spyOn(http, 'post').mockResolvedValue({ data: payment } as ApiEnvelope<CodPayment>)

    await codAdminService.recordCollection(31, input)
    expect(post).toHaveBeenLastCalledWith('/api/admin/orders/31/cod/collection', input)

    await codAdminService.recordSettlement(31, input)
    expect(post).toHaveBeenLastCalledWith('/api/admin/orders/31/cod/settlement', input)
  })
})

