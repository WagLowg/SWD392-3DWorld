import { useEffect, useRef } from 'react'
import { PRODUCTS } from '../../config/content'
import { ROUTES } from '../../config/routes'
import { useUI } from '../../state/store'
import { Eyebrow, MagneticButton } from './Button'

export function MarketOverlay() {
  const index = useUI((s) => s.productIndex)
  const setProduct = useUI((s) => s.setProduct)
  const hold = useUI((s) => s.holdWorld)
  const p = PRODUCTS[index]
  const info = useRef<HTMLDivElement>(null)
  const go = (d: number) => setProduct((index + d + PRODUCTS.length) % PRODUCTS.length)

  // arrow keys work while the marketplace is on screen (and focus isn't in a field)
  useEffect(() => {
    if (hold !== 2) return
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // elastic swap animation on the info card
  useEffect(() => {
    const el = info.current
    if (!el) return
    el.animate(
      [
        { opacity: 0, transform: 'translateY(12px) scale(0.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ],
      { duration: 520, easing: 'cubic-bezier(.2,1.4,.4,1)' },
    )
  }, [index])

  return (
    <section id="marketplace-layer" aria-labelledby="mk-title" className="world-layer">
      <div className="mk-head absolute inset-x-0 top-0 mx-auto max-w-7xl px-5 pt-24 sm:px-8 md:pt-28">
        <div className="max-w-xl">
          <div className="rise">
            <Eyebrow index="03">MARKETPLACE</Eyebrow>
          </div>
          <h2 id="mk-title" className="rise display mt-4 text-[clamp(2.3rem,5.2vw,4.8rem)] font-bold">
            Find Your Next
            <br />
            <span className="text-[#F07A2E]">Favorite Thing.</span>
          </h2>
          <p className="rise mt-4 hidden max-w-sm text-sm text-ink-soft sm:block sm:text-base">
            Khám phá những mô hình và sản phẩm in 3D độc đáo, được tạo ra để bạn sở hữu ngoài đời thực.
          </p>
          <div className="rise mt-6 hidden flex-wrap gap-3 md:flex">
            <MagneticButton to={ROUTES.marketplace}>Explore Marketplace</MagneticButton>
            <MagneticButton variant="ghost" to={`${ROUTES.marketplace}?view=collection`}>
              View Collection
            </MagneticButton>
          </div>
        </div>
      </div>

      {/* decorative stickers */}
      <div aria-hidden className="mk-sticker sticker invisible absolute left-[58%] top-[24%] hidden rounded-full bg-[#FFE58F] px-3 py-1.5 font-display text-sm font-bold shadow-lg md:block">
        ★ New drop
      </div>
      <div aria-hidden className="mk-sticker sticker invisible absolute right-[14%] top-[44%] hidden rotate-6 rounded-2xl bg-white px-3 py-1.5 font-display text-xs font-bold text-[#F07A2E] shadow-lg md:block" style={{ animationDelay: '-1.5s' }}>
        Made by 3DWorld
      </div>

      {/* product info + carousel controls */}
      <div className="mk-panel absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl flex-col gap-3 px-4 pb-4 sm:px-8 sm:pb-8 md:flex-row md:items-end md:justify-between">
        <div
          ref={info}
          className="interactive glass w-full rounded-[1.75rem] p-4 md:max-w-sm md:p-5"
          role="group"
          aria-roledescription="carousel"
          aria-label="Sản phẩm nổi bật"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(1)
            if (e.key === 'ArrowLeft') go(-1)
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow rounded-full px-2.5 py-1" style={{ background: `${p.accent}55` }}>
              {p.category}
            </span>
            <span className="font-nav text-xs text-ink-soft">
              {String(index + 1).padStart(2, '0')} / {String(PRODUCTS.length).padStart(2, '0')}
            </span>
          </div>
          <h3 className="mt-3 font-display text-3xl font-bold tracking-tight" aria-live="polite">
            {p.name}
          </h3>
          <p className="mt-1.5 text-sm text-ink-soft">{p.description}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="font-nav">
              <div className="text-lg font-bold">{p.demoPrice}</div>
              <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-ink/45">Giá demo · chưa kết nối dữ liệu</div>
            </div>
            <MagneticButton to={ROUTES.product(p.slug)}>View Product</MagneticButton>
          </div>
        </div>

        <div className="interactive flex items-center justify-center gap-3 md:mr-[22%] md:pb-2">
          <button type="button" className="icon-btn glass !h-12 !w-12" aria-label="Sản phẩm trước" onClick={() => go(-1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="flex gap-1.5" role="tablist" aria-label="Chọn sản phẩm">
            {PRODUCTS.map((q, i) => (
              <button
                key={q.slug}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={q.name}
                onClick={() => setProduct(i)}
                className="h-2.5 rounded-full transition-all duration-500"
                style={{ width: i === index ? 28 : 10, background: i === index ? '#202027' : 'rgba(32,32,39,.2)' }}
              />
            ))}
          </div>
          <button type="button" className="icon-btn glass !h-12 !w-12" aria-label="Sản phẩm tiếp theo" onClick={() => go(1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    </section>
  )
}
