import { ArrowRight, Box, ChevronLeft, ChevronRight, CreditCard, PackageCheck, Sparkles, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { accentFor, badgeLabel, categoryLabel, formatVnd, resolveMediaUrl } from '../lib/format'
import type { ProductSummary } from '../types/catalog.types'
import { ProductMedia } from './ProductMedia'

const PERKS = [
  { icon: PackageCheck, label: 'Vật phẩm vật lý', sub: 'Giao tận tay', tint: 'bg-peach text-orange' },
  { icon: CreditCard, label: 'ZaloPay · COD', sub: 'Thanh toán linh hoạt', tint: 'bg-violet-soft text-violet' },
  { icon: Truck, label: 'Tồn kho thật', sub: 'Cập nhật liên tục', tint: 'bg-teal-soft text-teal' },
]

export function HeroSection({ featured }: { featured: ProductSummary[] }) {
  return (
    <section className="relative mx-auto grid max-w-[1320px] items-center gap-12 px-4 pt-4 md:px-8 lg:grid-cols-2 lg:gap-16">
      <div className="animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 font-label text-[11px] font-semibold uppercase tracking-widest text-ink-soft shadow-soft">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-orange opacity-60 motion-safe:animate-ping" />
            <span className="relative h-2 w-2 rounded-full bg-orange" />
          </span>
          Bộ sưu tập · Đồ chơi thiết kế
        </span>

        <h1 className="mt-6 font-display text-[44px] font-bold leading-[1.04] tracking-[-0.04em] sm:text-6xl xl:text-[70px]">
          <span className="block">Khám Phá</span>
          <span className="block text-ink/35">Vật Phẩm</span>
          <span className="relative mt-1 block w-fit text-orange">
            Yêu Thích Mới.
            <svg
              aria-hidden="true"
              viewBox="0 0 300 18"
              preserveAspectRatio="none"
              className="absolute -bottom-2 left-0 h-3 w-full text-orange/35"
            >
              <path
                d="M3 12C60 4 140 2 297 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>

        <p className="mt-7 max-w-[36rem] text-pretty text-[16px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-violet">Mô hình và sản phẩm in 3D độc đáo</span> để bạn sở hữu ngoài đời
          thực — hoàn thiện thủ công, kiểm định theo từng lô và giao trong hộp đóng gói bảo an.
        </p>

        <ul className="mt-9 grid max-w-[34rem] grid-cols-1 gap-3 border-t border-line pt-6 sm:grid-cols-3">
          {PERKS.map(({ icon: Icon, label, sub, tint }) => (
            <li key={label} className="flex items-center gap-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tint}`}>
                <Icon size={16} />
              </span>
              <span className="leading-tight">
                <span className="block font-label text-[13px] font-semibold text-ink">{label}</span>
                <span className="block text-[12px] text-ink-soft">{sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <FeaturedShowcase items={featured} />
    </section>
  )
}

function Thumb({ item }: { item: ProductSummary }) {
  const [failed, setFailed] = useState(false)
  const url = resolveMediaUrl(item.thumbnailUrl ?? undefined)
  return (
    <span className={`grid h-11 w-11 place-items-center bg-gradient-to-br ${accentFor(item.id).stage}`}>
      {url && !failed ? (
        <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <Box size={16} className="text-ink-soft" />
      )}
    </span>
  )
}

function FeaturedShowcase({ items }: { items: ProductSummary[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = items.length
  const active = count ? index % count : 0
  const current = items[active]
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count)

  useEffect(() => {
    if (count < 2 || paused) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 6000)
    return () => window.clearInterval(id)
  }, [count, paused])

  return (
    <section
      aria-label="Sản phẩm nổi bật"
      className="relative animate-fade-up [animation-delay:120ms]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Mảng màu trang trí phía sau khung */}
      <div
        aria-hidden="true"
        className="absolute -right-3 -top-3 h-2/3 w-2/3 rotate-6 rounded-[2.5rem] bg-violet-soft"
      />
      <div aria-hidden="true" className="absolute -bottom-3 -left-3 h-1/2 w-1/2 -rotate-6 rounded-[2.5rem] bg-peach" />

      {/* Tem tròn xoay */}
      <div
        aria-hidden="true"
        className="absolute -left-6 -top-6 z-10 hidden h-24 w-24 place-items-center rounded-full bg-ink text-white shadow-lift sm:grid"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full motion-safe:animate-[spin_18s_linear_infinite]"
        >
          <defs>
            <path id="hero-stamp" d="M50 50m-36 0a36 36 0 1 1 72 0a36 36 0 1 1 -72 0" />
          </defs>
          <text className="fill-current font-label text-[10.5px] font-semibold uppercase tracking-[0.2em]">
            <textPath href="#hero-stamp">In 3D · Thủ công · Độc bản ·</textPath>
          </text>
        </svg>
        <Sparkles size={20} className="text-butter" />
      </div>

      <div className="relative rounded-[2.5rem] bg-white p-3 shadow-lift">
        <div className="relative overflow-hidden rounded-[2rem]">
          {current ? (
            <ProductMedia
              key={current.id}
              src={current.thumbnailUrl ?? undefined}
              alt={current.title}
              seed={current.id}
              className="aspect-[6/5] animate-fade-up"
            />
          ) : (
            <div className="aspect-[6/5] animate-pulse bg-gradient-to-br from-violet-soft via-peach to-mint" />
          )}

          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-butter px-3 py-1 font-label text-[11px] font-semibold">
            <Sparkles size={12} /> {current?.badgeType ? badgeLabel(current.badgeType) : 'Nổi bật'}
          </span>

          {current && (
            <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 rounded-[1.5rem] border border-white/60 bg-white/80 p-4 backdrop-blur-md sm:p-5">
              <div className="min-w-0">
                {current.category && (
                  <span className="rounded-full bg-mint px-2.5 py-1 font-label text-[11px] font-semibold text-[#0f5132]">
                    {categoryLabel(current.category)}
                  </span>
                )}
                <p className="mt-2.5 line-clamp-1 font-display text-lg font-bold sm:text-xl">{current.title}</p>
                <p className="mt-0.5 font-display text-xl font-bold text-orange sm:text-2xl">
                  {current.price != null ? formatVnd(current.price) : '—'}
                </p>
              </div>
              <Link
                to={`/${current.id}`}
                aria-label={`Xem chi tiết ${current.title}`}
                className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 font-label text-xs font-semibold text-white transition hover:bg-violet"
              >
                <span className="hidden sm:inline">Xem chi tiết</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}
        </div>

        {count > 1 && (
          <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-3">
            <div className="flex gap-2 overflow-x-auto">
              {items.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label={`Xem ${p.title}`}
                  aria-current={i === active}
                  onClick={() => setIndex(i)}
                  className={`shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 transition ${
                    i === active ? 'ring-ink' : 'opacity-60 ring-transparent hover:opacity-100'
                  }`}
                >
                  <Thumb item={p} />
                </button>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="mr-2 font-label text-xs font-semibold tabular-nums text-ink-soft">
                {String(active + 1).padStart(2, '0')}
                <span className="text-line"> / </span>
                {String(count).padStart(2, '0')}
              </span>
              <button
                type="button"
                aria-label="Sản phẩm trước"
                onClick={() => go(-1)}
                className="grid h-9 w-9 place-items-center rounded-full border border-line hover:border-ink"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Sản phẩm tiếp theo"
                onClick={() => go(1)}
                className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white hover:bg-violet"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
