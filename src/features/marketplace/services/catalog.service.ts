import { toQueryString } from '../../../shared/lib/query'
import { http } from '../../../shared/api'
import type { ApiEnvelope, CatalogPage, CatalogQuery, ProductDetail } from '../types/catalog.types'

export const catalogService = {
  /** GET /api/catalog — tìm kiếm, lọc theo category và phân trang (page 0-based). */
  async search(query: CatalogQuery, signal?: AbortSignal) {
    const qs = toQueryString({
      keyword: query.keyword?.trim(),
      category: query.category,
      page: query.page ?? 0,
      size: query.size ?? 12,
    })
    const res = await http.get<ApiEnvelope<CatalogPage>>(`/api/catalog${qs}`, { signal })
    return res.data
  },

  /** GET /api/catalog/{productId} — media, variants, giá và tồn kho. */
  async detail(productId: number, signal?: AbortSignal) {
    const res = await http.get<ApiEnvelope<ProductDetail>>(`/api/catalog/${productId}`, { signal })
    return res.data
  },
}
