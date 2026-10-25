import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ShoppingCart, Star, Store, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAddToCart } from '../hooks/useCart'
import { catalogKeys } from '../hooks/useCatalog'
import { accentFor, activeVariants, badgeLabel, categoryLabel, formatRating, formatVnd } from '../lib/format'
import { catalogService } from '../services/catalog.service'
import { useVariantIndexStore } from '../stores/variant-index.store'
import type { ProductSummary } from '../types/catalog.types'
import { ProductMedia } from './ProductMedia'

/** Thẻ sản phẩm: dùng thẳng các trường của ProductSummary (ảnh, giá, đánh giá, còn hàng). */
export function ProductCard({ product, index = 0 }: { product: ProductSummary; index?: number }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToCart, isPending } = useAddToCart()
  const [loadingDetail, setLoadingDetail] = useState(false)

  const accent = accentFor(product.id)
  const soldOut = product.available === false
  const minPrice = product.price ?? null
  const maxPrice = product.maxPrice ?? minPrice
  const hasRange = minPrice !== null && maxPrice !== null && maxPrice > minPrice
  const reviews = product.reviewCount ?? 0
  const href = `/${product.id}`

  // 1 variant còn hàng → thêm thẳng vào giỏ; nhiều variant → mở chi tiết để chọn.
  const onQuickAdd = async () => {
    setLoadingDetail(true)
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: catalogKeys.detail(product.id),
        queryFn: ({ signal }) => catalogService.detail(product.id, signal),
        staleTime: 60_000,
      })
      useVariantIndexStore.getState().register(detail)
      const variants = activeVariants(detail.variants)
      const only = variants.length === 1 ? variants[0] : undefined
      if (only && only.available > 0) await addToCart({ variantId: only.id, quantity: 1 })
      else navigate(href)
    } catch {
      navigate(href)
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <article
      className="group flex flex-col rounded-[2rem] bg-white/95 p-3 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <Link to={href} className="relative block" aria-label={product.title}>
        <ProductMedia
          src={product.thumbnailUrl ?? undefined}
          alt={product.title}
          seed={product.id}
          className="aspect-[4/3.6] rounded-[1.6rem]"
        />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {product.category && (
              <span className={`rounded-full px-2.5 py-1 font-label text-[11px] font-semibold ${accent.chip}`}>
                {categoryLabel(product.category)}
              </span>
            )}
            {product.badgeType && (
              <span className="rounded-full bg-butter px-2.5 py-1 font-label text-[11px] font-semibold text-[#6b4e00]">
                {badgeLabel(product.badgeType)}
              </span>
            )}
          </div>
          {soldOut && (
            <span className="shrink-0 rounded-full bg-ink px-2.5 py-1 font-label text-[11px] font-semibold text-white">
              Hết hàng
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col px-2 pb-1.5 pt-4">
        <div className="flex items-center justify-between gap-2 font-label text-[11px] font-semibold">
          <Link
            to={`/shop/${product.storefrontId}`}
            className="inline-flex items-center gap-1 text-ink hover:text-violet"
          >
            <Store size={12} className="text-violet" /> Xưởng #{product.storefrontId}
          </Link>
          {!soldOut && (
            <span className="inline-flex items-center gap-1 text-teal">
              <Truck size={12} /> Sẵn sàng gửi
            </span>
          )}
        </div>

        <Link
          to={href}
          className="mt-2 line-clamp-2 font-display text-xl font-bold leading-tight tracking-tight hover:text-violet"
        >
          {product.title}
        </Link>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <Star size={13} className={reviews ? 'fill-orange text-orange' : 'text-line'} />
            {reviews ? `${formatRating(product.averageRating)} (${reviews})` : 'Chưa có đánh giá'}
          </span>
          {!!product.salesCount && <span>Đã bán {product.salesCount.toLocaleString('vi-VN')}</span>}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div className="min-w-0">
            <p className="font-label text-[11px] font-semibold text-ink-soft">Giá đóng gói vật lý:</p>
            {minPrice !== null ? (
              <p className="font-display text-2xl font-bold">
                {hasRange && <span className="mr-1 text-sm text-ink-soft">từ</span>}
                {formatVnd(minPrice).replace('₫', '')}
                <span className="text-base text-orange">₫</span>
              </p>
            ) : (
              <p className="font-display text-base font-semibold text-ink-soft">Liên hệ</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onQuickAdd}
              disabled={isPending || loadingDetail || soldOut}
              aria-label={`Thêm ${product.title} vào giỏ`}
              className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-surface-low disabled:opacity-35"
            >
              <ShoppingCart size={18} />
            </button>
            <Link
              to={href}
              className="inline-flex items-center gap-2 rounded-full bg-ink py-1.5 pl-4 pr-1.5 font-label text-xs font-semibold text-white transition hover:bg-violet"
            >
              Chi Tiết
              <span className="grid h-6 w-6 place-items-center rounded-full bg-orange">
                <ArrowRight size={13} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-[2rem] bg-white/90 p-3 shadow-soft">
      <div className="aspect-[4/3.6] animate-pulse rounded-[1.6rem] bg-surface-mid" />
      <div className="space-y-3 px-2 py-4">
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-surface-mid" />
        <div className="h-5 w-3/4 animate-pulse rounded-full bg-surface-mid" />
        <div className="h-1.5 w-full animate-pulse rounded-full bg-surface-mid" />
        <div className="h-7 w-1/3 animate-pulse rounded-full bg-surface-mid" />
      </div>
    </div>
  )
}

export const SKELETON_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const
