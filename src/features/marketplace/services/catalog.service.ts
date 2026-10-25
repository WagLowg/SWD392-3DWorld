import { toQueryString } from '../../../shared/lib/query'
import { http } from '../../../shared/api'
import type {
  ApiEnvelope,
  CatalogPage,
  CatalogQuery,
  PagedItems,
  ProductDetail,
  ProductReview,
  Shop,
} from '../types/catalog.types'

function catalogParams(query: CatalogQuery) {
  return toQueryString({
    keyword: query.keyword?.trim(),
    category: query.category,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    sort: query.sort,
    page: query.page ?? 0,
    size: query.size ?? 12,
  })
}

export const catalogService = {
  /** GET /api/catalog — keyword, category, minPrice, maxPrice, sort (newest|price_asc|price_desc|rating|best_selling). */
  async search(query: CatalogQuery, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<CatalogPage>>(`/api/catalog${catalogParams(query)}`, { signal })).data
  },

  /** GET /api/catalog/featured — sản phẩm có huy hiệu. */
  async featured(page = 0, size = 12, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<CatalogPage>>(`/api/catalog/featured${toQueryString({ page, size })}`, { signal }))
      .data
  },

  /** GET /api/catalog/{productId} — media, variants, mô tả, xưởng. */
  async detail(productId: number, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<ProductDetail>>(`/api/catalog/${productId}`, { signal })).data
  },

  /** GET /api/catalog/{productId}/reviews — đánh giá công khai. */
  async reviews(productId: number, page = 0, size = 10, signal?: AbortSignal) {
    return (
      await http.get<ApiEnvelope<PagedItems<ProductReview>>>(
        `/api/catalog/${productId}/reviews${toQueryString({ page, size })}`,
        { signal },
      )
    ).data
  },
}

export const storefrontService = {
  /** GET /api/storefronts/{id} — thông tin gian hàng công khai. */
  async get(storefrontId: number, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<Shop>>(`/api/storefronts/${storefrontId}`, { signal })).data
  },

  /** GET /api/storefronts/{id}/products — sản phẩm đã duyệt của gian hàng. */
  async products(storefrontId: number, query: CatalogQuery, signal?: AbortSignal) {
    return (
      await http.get<ApiEnvelope<CatalogPage>>(`/api/storefronts/${storefrontId}/products${catalogParams(query)}`, {
        signal,
      })
    ).data
  },
}
