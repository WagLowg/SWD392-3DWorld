import { ArrowRight, ShoppingCart, Store, Truck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAddToCart } from '../hooks/useCart'
import { useProductDetail } from '../hooks/useCatalog'
import { accentFor, activeVariants, categoryLabel, formatAttributes, formatVnd, summarizeVariants } from '../lib/format'
import type { ProductSummary } from '../types/catalog.types'
import { ProductMedia } from './ProductMedia'
import { StockBar } from '../../../shared/ui/primitives'

export function ProductCard({ product, index = 0 }: { product: ProductSummary; index?: number }) {
  const navigate = useNavigate()
  const { data: detail, isLoading } = useProductDetail(product.id)
  const { addToCart, isPending } = useAddToCart()

  const summary = summarizeVariants(detail?.variants)
  const variants = activeVariants(detail?.variants)
  const stock = variants.reduce((s, v) => s + Math.max(0, v.stock ?? 0), 0)
  const firstAttr = formatAttributes(variants[0]?.attributes)
  const accent = accentFor(product.id)
  const available = summary?.available ?? 0
  const soldOut = !!summary && available <= 0
  const lowStock = !soldOut && available > 0 && available <= 5
  const href = `/${product.id}`

  // 1 variant còn hàng → thêm thẳng vào giỏ; nhiều variant → mở chi tiết để chọn.
  const onQuickAdd = () => {
    const only = variants.length === 1 ? variants[0] : undefined
    if (only && only.available > 0) addToCart({ variantId: only.id, quantity: 1 })
    else navigate(href)
  }

  return (
    <article
      className="group flex flex-col rounded-[2rem] bg-white/95 p-3 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <Link to={href} className="relative block" aria-label={product.title}>
        <ProductMedia
          src={detail?.media?.[0]}
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
            {firstAttr && (
              <span className="max-w-[9rem] truncate rounded-full bg-white/90 px-2.5 py-1 font-label text-[11px] font-semibold">
                {firstAttr}
              </span>
            )}
          </div>
          {soldOut ? (
            <span className="shrink-0 rounded-full bg-ink px-2.5 py-1 font-label text-[11px] font-semibold text-white">
              Hết hàng
            </span>
          ) : lowStock ? (
            <span className="shrink-0 rounded-full bg-danger px-2.5 py-1 font-label text-[11px] font-semibold text-white">
              Sắp hết hàng
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col px-2 pb-1.5 pt-4">
        <div className="flex items-center justify-between gap-2 font-label text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1 text-ink">
            <Store size={12} className="text-violet" /> Xưởng #{product.storefrontId}
          </span>
          {summary && !soldOut && (
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
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">
          {summary
            ? `${summary.variantCount} phiên bản${firstAttr ? ` · ${firstAttr}` : ''}${summary.minPrice !== summary.maxPrice ? ` · ${formatVnd(summary.minPrice)} – ${formatVnd(summary.maxPrice)}` : ''}`
            : 'Đang tải thông tin phiên bản…'}
        </p>

        {summary && (
          <div className="mt-4 space-y-1.5">
            <StockBar available={available} stock={stock} />
            <p
              className={`text-right font-label text-[11px] font-semibold ${lowStock ? 'text-danger' : 'text-ink-soft'}`}
            >
              {soldOut ? 'Tạm hết hàng' : lowStock ? `Chỉ còn ${available} chiếc!` : `Còn ${available} sản phẩm`}
            </p>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div className="min-w-0">
            <p className="font-label text-[11px] font-semibold text-ink-soft">Giá đóng gói vật lý:</p>
            {isLoading ? (
              <div className="mt-1 h-7 w-28 animate-pulse rounded-full bg-surface-mid" />
            ) : summary ? (
              <p className="font-display text-2xl font-bold">
                {summary.minPrice !== summary.maxPrice && <span className="mr-1 text-sm text-ink-soft">từ</span>}
                {formatVnd(summary.minPrice).replace('₫', '')}
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
              disabled={isPending || soldOut || !summary}
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
