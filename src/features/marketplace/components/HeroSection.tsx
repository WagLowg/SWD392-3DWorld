import { ArrowRight, ChevronLeft, ChevronRight, CreditCard, PackageCheck, Printer, Sparkles, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { badgeLabel, categoryLabel, formatVnd } from '../lib/format'
import type { ProductSummary } from '../types/catalog.types'
import { ProductMedia } from './ProductMedia'

export function HeroSection({ featured }: { featured: ProductSummary[] }) {
  return (
    <section className="mx-auto grid max-w-[1320px] items-center gap-10 px-4 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
      <div className="animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-label text-[11px] font-semibold uppercase tracking-widest shadow-soft">
          <span className="h-2 w-2 rounded-full bg-orange" /> Bộ sưu tập · Đồ chơi thiết kế
        </span>
        <h1 className="mt-6 font-display text-[44px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-6xl xl:text-[72px]">
          Khám Phá Vật Phẩm
          <span className="block text-orange">Yêu Thích Mới.</span>
        </h1>
        <p className="mt-5 max-w-xl font-display text-lg font-semibold leading-snug text-violet">
          Khám phá những mô hình và sản phẩm in 3D độc đáo, được tạo ra để bạn sở hữu ngoài đời thực.
        </p>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          Đồ chơi vinyl cao cấp, mô hình để bàn thủ công độc lập — hoàn thiện thủ công, kiểm định theo từng lô và giao
          tận tay trong hộp đóng gói bảo an.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-full bg-ink py-2 pl-5 pr-2 font-label text-sm font-semibold text-white transition hover:bg-violet"
          >
            Khám Phá Chợ
            <span className="grid h-8 w-8 place-items-center rounded-full bg-orange">
              <ArrowRight size={16} />
            </span>
          </Link>
          <a
            href="/pod/"
            className="inline-flex items-center gap-2 rounded-full px-4 py-3 font-label text-sm font-semibold hover:bg-white"
          >
            <Printer size={16} className="text-violet" /> Đặt In Theo Yêu Cầu
          </a>
          <a
            href="/ai/studio"
            className="inline-flex items-center gap-2 rounded-full px-4 py-3 font-label text-sm font-semibold hover:bg-white"
          >
            <Sparkles size={16} className="text-violet" /> Sáng Tạo Bằng AI <ArrowRight size={14} />
          </a>
        </div>

        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-label text-xs font-semibold text-ink-soft">
          <li className="inline-flex items-center gap-1.5">
            <PackageCheck size={14} className="text-orange" /> Chỉ giao vật phẩm vật lý
          </li>
          <li className="inline-flex items-center gap-1.5">
            <CreditCard size={14} className="text-violet" /> ZaloPay hoặc COD
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Truck size={14} className="text-teal" /> Tồn kho thời gian thực
          </li>
        </ul>
      </div>

      <FeaturedShowcase items={featured} />
    </section>
  )
}

function FeaturedShowcase({ items }: { items: ProductSummary[] }) {
  const [index, setIndex] = useState(0)
  const current = items[index % Math.max(items.length, 1)]
  const go = (delta: number) => setIndex((i) => (i + delta + items.length) % items.length)

  return (
    <div className="relative animate-fade-up [animation-delay:120ms]">
      <div className="relative rounded-[2.5rem] bg-white p-3 shadow-lift">
        {current ? (
          <ProductMedia
            key={current.id}
            src={current.thumbnailUrl ?? undefined}
            alt={current.title}
            seed={current.id}
            className="aspect-[4/3.4] rounded-[2rem]"
          />
        ) : (
          <div className="aspect-[4/3.4] animate-pulse rounded-[2rem] bg-gradient-to-br from-violet-soft via-peach to-mint" />
        )}
        <span className="absolute left-7 top-7 inline-flex items-center gap-1.5 rounded-full bg-butter px-3 py-1 font-label text-[11px] font-semibold">
          <Sparkles size={12} /> {current?.badgeType ? badgeLabel(current.badgeType) : 'Nổi bật'}
        </span>
        {items.length > 0 && (
          <span className="absolute right-7 top-7 rounded-full bg-white/90 px-3 py-1 font-label text-[11px] font-semibold">
            {String((index % items.length) + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
          </span>
        )}
      </div>

      {current && (
        <div className="relative -mt-20 ml-auto mr-4 w-[min(320px,85%)] rounded-[1.75rem] bg-white p-5 shadow-lift sm:-ml-6 sm:mr-auto lg:-ml-10">
          {current.category && (
            <span className="rounded-full bg-mint px-2.5 py-1 font-label text-[11px] font-semibold text-[#0f5132]">
              {categoryLabel(current.category)}
            </span>
          )}
          <p className="mt-3 line-clamp-1 font-display text-xl font-bold">{current.title}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="font-display text-2xl font-bold text-orange">{current.price != null ? formatVnd(current.price) : '—'}</p>
            <Link
              to={`/${current.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-2 font-label text-xs font-semibold text-white hover:bg-violet"
            >
              Xem Chi Tiết <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {items.length > 1 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-white px-2 py-1.5 shadow-soft">
          <button
            type="button"
            aria-label="Sản phẩm trước"
            onClick={() => go(-1)}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-low"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-1">
            {items.map((p, i) => (
              <span
                key={p.id}
                className={`h-1.5 rounded-full transition-all ${i === index % items.length ? 'w-5 bg-ink' : 'w-1.5 bg-line'}`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Sản phẩm tiếp theo"
            onClick={() => go(1)}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-low"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
