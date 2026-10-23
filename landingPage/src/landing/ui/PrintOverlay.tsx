import { useEffect, useRef } from 'react'
import { PRINT_COLORS, PRINT_SAMPLES, PRINT_SCALES, PRODUCTS } from '../../config/content'
import { ROUTES } from '../../config/routes'
import { useUI } from '../../state/store'
import { S } from '../../state/scene'
import { printPhase } from '../../three/worlds/OrderPrintWorld'
import { Eyebrow, MagneticButton } from './Button'

const TOTAL_LAYERS = 168

function PrintStatus() {
  const text = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const material = useUI((s) => s.printMaterial)
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const p = printPhase(S.t).progress
      if (text.current) text.current.textContent = `Lớp ${Math.round(p * TOTAL_LAYERS)}/${TOTAL_LAYERS}`
      if (bar.current) bar.current.style.transform = `scaleX(${p})`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="pr-status glass invisible absolute right-[7%] top-[13%] hidden w-56 rounded-2xl px-4 py-3 font-nav md:block" aria-hidden>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF8A3D]" /> Mô phỏng in FDM
        </span>
        <span className="text-ink/50">{material}</span>
      </div>
      <div className="mt-2 font-display text-lg font-bold tabular-nums">
        <span ref={text}>Lớp 0/{TOTAL_LAYERS}</span>
      </div>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ink/10">
        <span ref={bar} className="block h-full origin-left rounded-full bg-[#FF8A3D]" style={{ transform: 'scaleX(0)' }} />
      </span>
    </div>
  )
}

export function PrintOverlay() {
  const kind = useUI((s) => s.printKind)
  const material = useUI((s) => s.printMaterial)
  const color = useUI((s) => s.printColor)
  const scale = useUI((s) => s.printScale)
  const setPrint = useUI((s) => s.setPrint)
  const replay = useUI((s) => s.replayPrint)
  const fromMarket = !PRINT_SAMPLES.some((s) => s.kind === kind)
  const marketName = PRODUCTS.find((p) => p.kind === kind)?.name

  return (
    <section id="order-print-layer" aria-labelledby="pr-title" className="world-layer">
      <div className="pr-head absolute inset-x-0 top-0 mx-auto max-w-7xl px-5 pt-24 sm:px-8 md:pt-28">
        <div className="max-w-md">
          <div className="rise">
            <Eyebrow index="04">ORDER PRINT</Eyebrow>
          </div>
          <h2 id="pr-title" className="rise display mt-4 text-[clamp(2.3rem,5.4vw,5rem)] font-bold">
            Dream it.
            <br />
            <span className="text-[#FF8A3D]">We&rsquo;ll Print it.</span>
          </h2>
          <p className="rise mt-4 hidden max-w-sm text-sm text-ink-soft sm:block sm:text-base">
            Tải mô hình 3D, chọn chất liệu và màu sắc. 3DWorld giúp biến ý tưởng của bạn thành sản phẩm thật.
          </p>
          <div className="rise">
            <div className="pr-ctas mt-6 hidden flex-wrap gap-3 md:flex">
              <MagneticButton to={ROUTES.printOnDemand}>Order Your 3D Print</MagneticButton>
              <MagneticButton variant="ghost" to={`${ROUTES.printOnDemand}#how-it-works`}>
                Discover Printing
              </MagneticButton>
            </div>
          </div>
        </div>
      </div>

      <PrintStatus />

      <div className="pr-panel absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-4 sm:px-8 sm:pb-8">
        <div className="interactive glass w-full rounded-[1.75rem] p-4 font-nav md:max-w-[25rem] md:p-5">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Cấu hình in · demo</span>
            <button type="button" className="chip" onClick={replay}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
              </svg>
              Preview
            </button>
          </div>

          <fieldset className="mt-3">
            <legend className="text-xs font-semibold text-ink-soft">Model</legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PRINT_SAMPLES.map((s) => (
                <button key={s.kind} type="button" className="chip !py-1.5" aria-pressed={kind === s.kind} onClick={() => setPrint({ printKind: s.kind, printKindTouched: true })}>
                  {s.label}
                </button>
              ))}
              {fromMarket && (
                <span className="chip !cursor-default !py-1.5" aria-pressed="true">
                  {marketName} · từ Marketplace
                </span>
              )}
            </div>
          </fieldset>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <fieldset>
              <legend className="text-xs font-semibold text-ink-soft">Material</legend>
              <div className="mt-1.5 flex gap-1.5">
                {(['PLA', 'PETG'] as const).map((m) => (
                  <button key={m} type="button" className="chip !py-1.5" aria-pressed={material === m} onClick={() => setPrint({ printMaterial: m })}>
                    {m}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-xs font-semibold text-ink-soft">Scale</legend>
              <div className="mt-1.5 flex gap-1.5">
                {PRINT_SCALES.map((s) => (
                  <button key={s.id} type="button" className="chip !px-2.5 !py-1.5" aria-pressed={scale === s.id} aria-label={s.label} title={s.label} onClick={() => setPrint({ printScale: s.id })}>
                    {s.id}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset className="mt-3">
            <legend className="text-xs font-semibold text-ink-soft">
              Color · <span className="text-ink">{PRINT_COLORS.find((c) => c.hex === color)?.name}</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {PRINT_COLORS.map((c) => (
                <button key={c.hex} type="button" className="swatch" style={{ background: c.hex }} aria-label={c.name} aria-pressed={color === c.hex} onClick={() => setPrint({ printColor: c.hex })} />
              ))}
            </div>
          </fieldset>

          <p className="mt-3 text-[0.7rem] leading-snug text-ink/50">
            Bản xem trước minh họa. Kiểm tra kỹ thuật, báo giá và đặt hàng thực hiện trong Order Print.
          </p>
          <div className="mt-3">
            <MagneticButton to={ROUTES.printOnDemand} className="w-full justify-between">
              Order Your 3D Print
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  )
}
