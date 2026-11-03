import { afterEach, describe, expect, it, vi } from 'vitest'
import { type ApiEnvelope, http } from '../../../shared/api'
import type { ApiPage, ApiProduct } from '../../seller/services/seller.api'
import { adminOpsApi } from './ops.api'

const product = (id: number, status: string): ApiProduct => ({
  id,
  storefrontId: 12,
  title: `Sản phẩm ${id}`,
  description: '',
  category: 'DESK_ACCESSORY',
  specifications: '',
  shippingClass: 'STANDARD',
  status,
  moderationReason: status === 'REJECTED' ? 'Không đạt yêu cầu.' : null,
  revision: `revision-${id}`,
  updatedAt: '2026-11-01T10:00:00Z',
  media: [],
  variants: [],
})

const page = <T>(items: T[]): ApiEnvelope<ApiPage<T>> => ({
  status: 200,
  message: 'Success',
  data: { items, page: 0, size: 100, totalElements: items.length, totalPages: 1 },
  timestamp: '2026-11-01T10:00:00Z',
})

afterEach(() => vi.restoreAllMocks())

describe('admin product moderation list', () => {
  it('loads pending Admin data and published catalog data on the current BE', async () => {
    vi.spyOn(http, 'get').mockImplementation(async (url) => {
      if (url.startsWith('/api/admin/products/pending')) return page([product(1, 'PENDING_REVIEW')])
      if (url.startsWith('/api/catalog')) {
        return page([
          {
            id: 2,
            storefrontId: 12,
            title: 'Sản phẩm đã mở bán',
            category: 'DESK_ACCESSORY',
            thumbnailUrl: '/product-2.png',
            price: 350_000,
          },
        ])
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    const rows = await adminOpsApi.list('product')

    expect(rows.map((item) => item.status)).toEqual(['PENDING', 'APPROVED'])
    expect(rows[1].f.price).toBe('350.000₫')
  })

  it('keeps the pending moderation queue usable when catalog enrichment fails', async () => {
    vi.spyOn(http, 'get').mockImplementation(async (url) => {
      if (url.startsWith('/api/admin/products/pending')) return page([product(1, 'PENDING_REVIEW')])
      if (url.startsWith('/api/catalog')) throw new Error('Catalog unavailable')
      throw new Error(`Unexpected URL: ${url}`)
    })

    await expect(adminOpsApi.list('product')).resolves.toMatchObject([{ id: '1', status: 'PENDING' }])
  })
})
