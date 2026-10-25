import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import { catalogService, storefrontService } from '../services/catalog.service'
import { useVariantIndexStore } from '../stores/variant-index.store'
import type { CatalogQuery } from '../types/catalog.types'

export const catalogKeys = {
  all: ['catalog'] as const,
  search: (query: CatalogQuery) => ['catalog', 'search', query] as const,
  categories: ['catalog', 'categories'] as const,
  detail: (productId: number) => ['catalog', 'detail', productId] as const,
  featured: (size: number) => ['catalog', 'featured', size] as const,
  reviews: (productId: number, page: number) => ['catalog', 'reviews', productId, page] as const,
  storefront: (id: number) => ['storefront', id] as const,
  storefrontProducts: (id: number, query: CatalogQuery) => ['storefront', id, 'products', query] as const,
}

const DETAIL_STALE = 60_000

/** Tải chi tiết và ghi lại variant → sản phẩm/xưởng (dùng để nhóm giỏ hàng theo xưởng). */
async function fetchDetail(productId: number, signal?: AbortSignal) {
  const detail = await catalogService.detail(productId, signal)
  useVariantIndexStore.getState().register(detail)
  return detail
}

export function useCatalog(query: CatalogQuery, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.search(query),
    queryFn: ({ signal }) => catalogService.search(query, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Backend chưa có API danh mục riêng → lấy danh mục (kèm số lượng) từ một trang catalog lớn. */
export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: async ({ signal }) => {
      const page = await catalogService.search({ page: 0, size: 100 }, signal)
      const counts = new Map<string, number>()
      for (const p of page.items) if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
      return {
        total: page.totalElements,
        categories: [...counts.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count),
      }
    },
    staleTime: 5 * 60_000,
  })
}

export function useProductDetail(productId: number | undefined) {
  return useQuery({
    queryKey: catalogKeys.detail(productId ?? -1),
    queryFn: ({ signal }) => fetchDetail(productId as number, signal),
    enabled: typeof productId === 'number' && Number.isFinite(productId),
    staleTime: DETAIL_STALE,
  })
}

/** Chi tiết của nhiều sản phẩm (dùng chung cache với từng thẻ) — phục vụ lọc giá/chất liệu phía client. */
export function useProductDetails(productIds: number[]) {
  return useQueries({
    queries: productIds.map((id) => ({
      queryKey: catalogKeys.detail(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchDetail(id, signal),
      staleTime: DETAIL_STALE,
    })),
  })
}

export function useFeatured(size = 12) {
  return useQuery({
    queryKey: catalogKeys.featured(size),
    queryFn: ({ signal }) => catalogService.featured(0, size, signal),
    staleTime: 60_000,
  })
}

export function useProductReviews(productId: number, page = 0) {
  return useQuery({
    queryKey: catalogKeys.reviews(productId, page),
    queryFn: ({ signal }) => catalogService.reviews(productId, page, 10, signal),
    placeholderData: keepPreviousData,
    enabled: Number.isFinite(productId) && productId > 0,
  })
}

export function usePublicStorefront(storefrontId: number) {
  return useQuery({
    queryKey: catalogKeys.storefront(storefrontId),
    queryFn: ({ signal }) => storefrontService.get(storefrontId, signal),
    enabled: Number.isFinite(storefrontId) && storefrontId > 0,
    staleTime: 60_000,
  })
}

export function useStorefrontProducts(storefrontId: number, query: CatalogQuery) {
  return useQuery({
    queryKey: catalogKeys.storefrontProducts(storefrontId, query),
    queryFn: ({ signal }) => storefrontService.products(storefrontId, query, signal),
    enabled: Number.isFinite(storefrontId) && storefrontId > 0,
    placeholderData: keepPreviousData,
  })
}
