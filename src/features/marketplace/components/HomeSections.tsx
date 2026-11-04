import { useQueries } from '@tanstack/react-query'
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  Flame,
  Gem,
  Heart,
  MessageCircleHeart,
  PackageCheck,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Wallet,
  X,
} from 'lucide-react'
import { type ReactNode, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { catalogKeys, useCatalog, useCategories } from '../hooks/useCatalog'
import { categoryLabel, formatAttributes, resolveMediaUrl } from '../lib/format'
import { clearViewed, useRecentlyViewed } from '../lib/recentlyViewed'
import { catalogService } from '../services/catalog.service'
import type { CatalogSort, ProductReview, ProductSummary } from '../types/catalog.types'
import { ProductCard, ProductCardSkeleton } from './ProductCard'
import { ProductMedia } from './ProductMedia'
import { Reveal } from './Reveal'

/* ───────────────────────── Dải chữ chạy ───────────────────────── */

const TICKER = [
  { icon: Sparkles, text: 'Hoàn thiện thủ công' },
  { icon: PackageCheck, text: 'Kiểm định theo từng lô' },
  { icon: Wallet, text: 'ZaloPay hoặc COD' },
  { icon: Truck, text: 'Giao tận tay toàn quốc' },
  { icon: ShieldCheck, text: 'Bảo vệ người mua' },
  { icon: Gem, text: 'Thiết kế độc bản' },
]

export function MarqueeStrip() {
  return (
    <div className="mp-marquee-wrap relative mt-14 overflow-hidden border-y border-line/70 bg-white/70 py-4 backdrop-blur">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-surface to-transparent" />
      <div className="mp-marquee flex w-max items-center">
        {[0, 1, 2, 3].map((copy) => (
          <ul key={copy} aria-hidden={copy > 0} className="flex items-center">
            {TICKER.map(({ icon: Icon, text }, i) => (
              <li
                key={`${copy}-${text}`}
                className="flex items-center gap-2.5 px-7 font-display text-lg font-bold tracking-tight text-ink"
              >
                <Icon size={18} className={i % 2 ? 'text-violet' : 'text-orange'} />
                {text}
                <span className="ml-7 text-orange/50">✦</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── Tiêu đề khu vực ───────────────────────── */

function SectionHead({
  eyebrow,
  title,
  icon,
  action,
}: {
  eyebrow: string
  title: ReactNode
  icon: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="inline-flex items-center gap-2 font-label text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
          {icon} {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      </div>
      {action}
    </div>
  )
}

const goCatalog = (navigate: ReturnType<typeof useNavigate>, search: string) => {
  navigate({ pathname: '/', search })
  window.setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }), 60)
}

/* ───────────────────────── Ô danh mục ───────────────────────── */

const TILE_TONES = [
  { bg: 'from-violet-soft via-[#efe9ff] to-white', dot: 'bg-violet', text: 'text-violet' },
  { bg: 'from-peach via-[#fff0e6] to-white', dot: 'bg-orange', text: 'text-orange-deep' },
  { bg: 'from-teal-soft via-[#e6f6ff] to-white', dot: 'bg-teal', text: 'text-teal' },
  { bg: 'from-mint via-[#ebfbf2] to-white', dot: 'bg-[#0f5132]', text: 'text-[#0f5132]' },
]

export function CategoryTiles() {
  const navigate = useNavigate()
  const { data, isLoading } = useCategories()
  const cats = data?.categories ?? []
  if (!isLoading && cats.length === 0) return null

  return (
    <section className="mx-auto mt-16 max-w-[1320px] px-4 md:px-8">
      <Reveal>
        <SectionHead
          eyebrow="Danh mục"
          icon={<span className="h-2 w-2 rounded-full bg-violet" />}
          title={
            <>
              Chọn theo <span className="text-violet">phong cách</span>
            </>
          }
        />
      </Reveal>
      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        {isLoading
          ? ['a', 'b'].map((k) => <div key={k} className="h-56 animate-pulse rounded-[2rem] bg-surface-mid" />)
          : cats.slice(0, 4).map((c, i) => {
              const tone = TILE_TONES[i % TILE_TONES.length]
              return (
                <Reveal key={c.code} delay={i * 90}>
                  <button
                    type="button"
                    onClick={() => goCatalog(navigate, `?category=${encodeURIComponent(c.code)}`)}
                    className={`group relative flex h-56 w-full overflow-hidden rounded-[2rem] bg-gradient-to-br p-7 text-left shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift ${tone.bg}`}
                  >
                    <div className="relative z-10 flex flex-col">
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 font-label text-[11px] font-semibold">
                        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} /> {c.count} vật phẩm
                      </span>
                      <span className="mt-auto font-display text-3xl font-bold leading-tight text-ink">
                        {categoryLabel(c.code)}
                      </span>
                      <span
                        className={`mt-2 inline-flex items-center gap-1.5 font-label text-sm font-semibold ${tone.text}`}
                      >
                        Khám phá{' '}
                        <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </div>
                    {/* Ảnh xếp chồng */}
                    <div className="absolute -bottom-6 right-3 flex items-end sm:right-4">
                      {c.covers.map((src, j) => (
                        <img
                          key={src}
                          src={resolveMediaUrl(src)}
                          alt=""
                          loading="lazy"
                          className="h-24 w-20 rounded-2xl border-4 border-white object-cover shadow-lift sm:h-32 sm:w-28 sm:rounded-3xl transition-transform duration-500 group-hover:-translate-y-2"
                          style={{
                            marginLeft: j ? -36 : 0,
                            transform: `rotate(${[-8, 4, 12][j] ?? 0}deg)`,
                            zIndex: 3 - j,
                            transitionDelay: `${j * 60}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </button>
                </Reveal>
              )
            })}
      </div>
    </section>
  )
}

/* ───────────────────────── Dải sản phẩm cuộn ngang ───────────────────────── */

function Rail({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: number) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: 'smooth' })
  return (
    <div className="relative">
      <div
        ref={ref}
        className="mp-rail -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 pt-4 md:-mx-8 md:px-8"
      >
        {children}
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          aria-label="Cuộn trái"
          onClick={() => scroll(-1)}
          className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white transition hover:border-ink"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          aria-label="Cuộn phải"
          onClick={() => scroll(1)}
          className="grid h-10 w-10 place-items-center rounded-full bg-ink text-white transition hover:bg-violet"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

const RANK_STYLES = [
  'from-[#ffd84d] to-[#f07a2e] text-ink',
  'from-[#e4e1eb] to-[#a1a1aa] text-ink',
  'from-[#ffccad] to-[#9c4400] text-white',
]

export function ProductRailSection({
  sort,
  eyebrow,
  title,
  icon,
  ranked = false,
  filter,
}: {
  sort: CatalogSort
  eyebrow: string
  title: ReactNode
  icon: ReactNode
  ranked?: boolean
  filter?: (p: ProductSummary) => boolean
}) {
  const navigate = useNavigate()
  const { data, isLoading } = useCatalog({ page: 0, size: 10, sort })
  const items = (data?.items ?? []).filter(filter ?? (() => true)).slice(0, 8)
  if (!isLoading && items.length < 2) return null

  return (
    <section className="mx-auto mt-16 max-w-[1320px] px-4 md:px-8">
      <Reveal>
        <SectionHead
          eyebrow={eyebrow}
          icon={icon}
          title={title}
          action={
            <button
              type="button"
              onClick={() => goCatalog(navigate, `?sort=${sort}`)}
              className="group inline-flex items-center gap-1.5 font-label text-sm font-semibold text-violet"
            >
              Xem tất cả
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </button>
          }
        />
      </Reveal>
      <Reveal delay={80}>
        <Rail>
          {isLoading
            ? ['a', 'b', 'c', 'd'].map((k) => (
                <div key={k} className="w-[280px] shrink-0 sm:w-[300px]">
                  <ProductCardSkeleton />
                </div>
              ))
            : items.map((p, i) => (
                <div key={p.id} className="relative w-[280px] shrink-0 snap-start sm:w-[300px]">
                  {ranked && i < 3 && (
                    <span
                      className={`absolute -left-1 -top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br font-display text-base font-bold shadow-lift ring-4 ring-surface ${RANK_STYLES[i]}`}
                    >
                      {i === 0 ? <Crown size={18} /> : `#${i + 1}`}
                    </span>
                  )}
                  <ProductCard product={p} index={i} />
                </div>
              ))}
        </Rail>
      </Reveal>
    </section>
  )
}

export function BestSellerRail() {
  return (
    <ProductRailSection
      sort="best_selling"
      ranked
      eyebrow="Đang được săn đón"
      icon={<Flame size={13} className="text-orange" />}
      title={
        <>
          Bán chạy <span className="text-orange">nhất</span>
        </>
      }
    />
  )
}

export function TopRatedRail() {
  return (
    <ProductRailSection
      sort="rating"
      filter={(p) => (p.reviewCount ?? 0) > 0}
      eyebrow="Khách hàng yêu thích"
      icon={<Heart size={13} className="fill-orange text-orange" />}
      title={
        <>
          Được đánh giá <span className="text-violet">cao</span>
        </>
      }
    />
  )
}

/* ───────────────────────── Vừa xem ───────────────────────── */

export function RecentlyViewedSection() {
  const items = useRecentlyViewed()
  if (!items.length) return null

  return (
    <section className="mx-auto mt-16 max-w-[1320px] px-4 md:px-8">
      <Reveal>
        <div className="rounded-[2.5rem] bg-white/80 p-6 shadow-soft sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2.5 font-display text-2xl font-bold">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-soft text-teal">
                <Clock3 size={17} />
              </span>
              Bạn vừa xem
            </h2>
            <button
              type="button"
              onClick={clearViewed}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-label text-xs font-semibold text-ink-soft hover:bg-surface-low"
            >
              <X size={13} /> Xoá lịch sử
            </button>
          </div>
          <div className="mp-rail mt-5 flex gap-4 overflow-x-auto pb-1">
            {items.map((p) => (
              <Link
                key={p.id}
                to={`/${p.id}`}
                className="group w-40 shrink-0 rounded-[1.5rem] bg-surface-low p-2 transition hover:-translate-y-1 hover:bg-white hover:shadow-soft"
              >
                <ProductMedia
                  src={p.thumbnailUrl ?? undefined}
                  alt={p.title}
                  seed={p.id}
                  className="aspect-square rounded-[1.1rem]"
                />
                <p className="mt-2 line-clamp-1 px-1 text-sm font-semibold group-hover:text-violet">{p.title}</p>
                {p.price != null && (
                  <p className="px-1 pb-1 font-display text-sm font-bold text-orange">
                    {p.price.toLocaleString('vi-VN')}₫
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ───────────────────────── Đánh giá thật ───────────────────────── */

type ReviewWithProduct = ProductReview & { product: ProductSummary }

export function ReviewsWall() {
  const { data } = useCatalog({ page: 0, size: 12, sort: 'rating' })
  const products = (data?.items ?? []).filter((p) => (p.reviewCount ?? 0) > 0).slice(0, 6)
  const results = useQueries({
    queries: products.map((p) => ({
      queryKey: catalogKeys.reviews(p.id, 0),
      queryFn: ({ signal }: { signal: AbortSignal }) => catalogService.reviews(p.id, 0, 10, signal),
      staleTime: 5 * 60_000,
    })),
  })

  const reviews: ReviewWithProduct[] = results
    .flatMap((r, i) => (r.data?.items ?? []).map((rev) => ({ ...rev, product: products[i] })))
    .filter((r) => r.rating >= 4 && r.comment?.trim())
    .filter(
      (r, i, all) => all.findIndex((x) => x.comment?.trim().toLowerCase() === r.comment?.trim().toLowerCase()) === i,
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  if (!reviews.length) return null

  const avg =
    products.reduce((s, p) => s + (p.averageRating ?? 0) * (p.reviewCount ?? 0), 0) /
    Math.max(
      1,
      products.reduce((s, p) => s + (p.reviewCount ?? 0), 0),
    )

  return (
    <section className="mx-auto mt-20 max-w-[1320px] px-4 md:px-8">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-ink px-6 py-10 text-white sm:px-10 sm:py-12">
        <div aria-hidden="true" className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet/40 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-orange/30 blur-3xl" />

        <Reveal className="relative">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="inline-flex items-center gap-2 font-label text-[11px] font-semibold uppercase tracking-widest text-white/60">
                <MessageCircleHeart size={14} className="text-orange" /> Người mua nói gì
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Đánh giá <span className="text-orange">thật</span> từ khách hàng
              </h2>
            </div>
            <div className="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-3 backdrop-blur">
              <span className="font-display text-4xl font-bold">{avg.toFixed(1)}</span>
              <span>
                <span className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={14}
                      className={n <= Math.round(avg) ? 'fill-orange text-orange' : 'text-white/30'}
                    />
                  ))}
                </span>
                <span className="font-label text-[11px] text-white/60">Trung bình sản phẩm nổi bật</span>
              </span>
            </div>
          </div>
        </Reveal>

        <div className="relative mt-8 columns-1 gap-5 md:columns-2 lg:columns-3">
          {reviews.map((r, i) => (
            <Reveal key={r.id} delay={i * 70} className="mb-5 break-inside-avoid">
              <figure className="rounded-[1.75rem] bg-white p-5 text-ink shadow-lift">
                <div className="flex items-center justify-between">
                  <span className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={14} className={n <= r.rating ? 'fill-orange text-orange' : 'text-line'} />
                    ))}
                  </span>
                  <Quote size={20} className="text-violet-soft" />
                </div>
                <blockquote className="mt-3 text-[15px] leading-relaxed">“{r.comment?.trim()}”</blockquote>
                <figcaption className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet to-orange font-display text-sm font-bold text-white">
                    {(r.buyerName?.trim()?.[0] ?? 'K').toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.buyerName || 'Khách hàng 3DWorld'}</span>
                    {r.variantAttributes && (
                      <span className="block truncate font-label text-[11px] text-ink-soft">
                        {formatAttributes(r.variantAttributes)}
                      </span>
                    )}
                  </span>
                  <Link
                    to={`/${r.product.id}`}
                    title={r.product.title}
                    className="flex shrink-0 items-center gap-2 rounded-full bg-surface-low py-1 pl-1 pr-3 font-label text-[11px] font-semibold hover:bg-violet-soft"
                  >
                    <ProductMedia
                      src={r.product.thumbnailUrl ?? undefined}
                      alt=""
                      seed={r.product.id}
                      className="h-7 w-7 rounded-full"
                    />
                    <span className="max-w-24 truncate">{r.product.title}</span>
                  </Link>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
