import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProductDetail } from '../types/catalog.types'

export type VariantInfo = {
  productId: number
  storefrontId: number
  title: string
  category: string
  image?: string
  attributes: string
}

type VariantIndexState = {
  variants: Record<number, VariantInfo>
  register: (detail: ProductDetail) => void
}

/**
 * CartItemResponse chưa có productId / storefrontId nên không biết món thuộc xưởng nào.
 * Mỗi khi tải chi tiết sản phẩm, ghi lại variantId → sản phẩm/xưởng để Giỏ hàng & Thanh toán nhóm theo xưởng.
 * TODO(Backend): trả productId, storefrontId, ảnh trong CartItemResponse thì bỏ store này.
 */
export const useVariantIndexStore = create<VariantIndexState>()(
  persist(
    (set) => ({
      variants: {},
      register: (detail) =>
        set((state) => {
          const next = { ...state.variants }
          for (const v of detail.variants ?? []) {
            next[v.id] = {
              productId: detail.product.id,
              storefrontId: detail.product.storefrontId,
              title: detail.product.title,
              category: detail.product.category,
              image: detail.media?.[0],
              attributes: v.attributes,
            }
          }
          return { variants: next }
        }),
    }),
    { name: '3dworld.marketplace.variant-index' },
  ),
)
