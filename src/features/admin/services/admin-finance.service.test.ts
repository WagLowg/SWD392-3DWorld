import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from '../../../shared/api'
import { adminFinanceService } from './admin-finance.service'

vi.mock('../../../shared/api', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const get = vi.mocked(http.get)
const post = vi.mocked(http.post)

describe('adminFinanceService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('unwraps dashboard metrics and accepts snake_case fields', async () => {
    get.mockResolvedValue({
      status: 200,
      data: {
        realized_commission: 1_200_000,
        provisional_commission: 300_000,
        subscription_income: 500_000,
        total_shipping_debt: 125_000,
      },
    })

    await expect(adminFinanceService.metrics({ from: '2026-11-01', to: '2026-11-30' })).resolves.toEqual({
      realizedCommission: 1_200_000,
      provisionalCommission: 300_000,
      subscriptionIncome: 500_000,
      totalShippingDebt: 125_000,
    })
    expect(get).toHaveBeenCalledWith('/api/admin/dashboard/metrics?from=2026-11-01&to=2026-11-30', {
      signal: undefined,
    })
  })

  it('normalizes Spring pagination and commission fields', async () => {
    get.mockResolvedValue({
      data: {
        content: [
          {
            earning_id: 17,
            order_id: 91,
            shop_id: 2,
            shop_name: 'Xưởng Mộc',
            order_value: 1_000_000,
            commission_rate: 0.1,
            commission_amount: 100_000,
            seller_net_amount: 900_000,
            debt_offset: 50_000,
            credited_to_shop: 850_000,
            status: 'RECOGNIZED',
          },
        ],
        number: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      },
    })

    const page = await adminFinanceService.commissions({ from: '2026-11-01', to: '2026-11-30' }, 0, 20)

    expect(page.totalElements).toBe(1)
    expect(page.items[0]).toMatchObject({
      id: '17',
      orderId: 91,
      shopId: 2,
      commissionRate: 0.1,
      debtOffset: 50_000,
      creditedToShop: 850_000,
    })
  })

  it('normalizes the list response currently documented by the backend', async () => {
    get.mockResolvedValue({
      data: [
        {
          earningId: 21,
          orderId: 105,
          shopId: 3,
          commissionAmount: 75_000,
          status: 'RECOGNIZED',
          releasedAt: '2026-11-02T01:57:00+07:00',
        },
      ],
    })

    const page = await adminFinanceService.commissions({ from: '2026-11-01', to: '2026-11-30' }, 0, 20)

    expect(page).toMatchObject({ page: 0, size: 20, totalElements: 1, totalPages: 1 })
    expect(page.items[0]).toMatchObject({
      id: '21',
      orderId: 105,
      shopId: 3,
      commissionAmount: 75_000,
      status: 'RECOGNIZED',
      releasedAt: '2026-11-02T01:57:00+07:00',
    })
  })

  it('keeps debt positive while deriving the signed display amount', async () => {
    get.mockResolvedValue({
      data: {
        items: [{ shopId: 8, shopName: 'In 3D Lab', returnShippingDebt: 240_000 }],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      },
    })

    const page = await adminFinanceService.wallets({ debtOnly: true, lockedOnly: false, page: 0, size: 20 })

    expect(page.items[0]).toMatchObject({ shippingDebt: 240_000, signedShippingDebt: -240_000 })
  })

  it('sends the documented suspension and restoration payloads', async () => {
    post.mockResolvedValue({})

    await adminFinanceService.suspend(2, 30, 'Nợ quá hạn')
    await adminFinanceService.restore(2, 'Đã tất toán')

    expect(post).toHaveBeenNthCalledWith(1, '/api/admin/dashboard/shops/2/suspend-for-debt', {
      inactiveDays: 30,
      reason: 'Nợ quá hạn',
    })
    expect(post).toHaveBeenNthCalledWith(2, '/api/admin/dashboard/shops/2/restore-after-debt', {
      reason: 'Đã tất toán',
    })
  })

  it('normalizes earning blockers and reconciles through the admin finance endpoint', async () => {
    get.mockResolvedValue({
      data: {
        physical_order_id: 91,
        order_status: 'RECEIVED',
        total_amount: 1_000_000,
        platform_received: 1_000_000,
        earning_status: 'PENDING',
        effective_refund_deadline: '2026-11-03T01:00:00Z',
        blockers: ['REFUND_WINDOW_NOT_EXPIRED'],
        eligibleForRelease: false,
        recognitionStatus: 'NOT_RECOGNIZED',
      },
    })
    post.mockResolvedValue({
      data: {
        physical_order_id: 91,
        order_status: 'RECEIVED',
        earning_status: 'RELEASED',
        released_at: '2026-11-04T01:00:00Z',
        blockers: [],
        recognitionStatus: 'RECOGNIZED',
      },
    })

    await expect(adminFinanceService.earning(91)).resolves.toMatchObject({
      orderId: 91,
      orderStatus: 'RECEIVED',
      platformReceived: 1_000_000,
      blockers: ['REFUND_WINDOW_NOT_EXPIRED'],
      recognitionStatus: 'NOT_RECOGNIZED',
    })
    await expect(adminFinanceService.reconcileEarning(91)).resolves.toMatchObject({
      orderId: 91,
      earningStatus: 'RELEASED',
      recognitionStatus: 'RECOGNIZED',
    })
    expect(get).toHaveBeenCalledWith('/api/admin/finance/orders/91/earning', { signal: undefined })
    expect(post).toHaveBeenCalledWith('/api/admin/finance/orders/91/earning/reconcile')
  })
})
