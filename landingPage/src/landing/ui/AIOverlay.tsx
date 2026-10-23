import { useEffect, useState } from 'react'
import { AI_PRESETS } from '../../config/content'
import { ROUTES } from '../../config/routes'
import { useUI } from '../../state/store'
import { S } from '../../state/scene'
import { T, WORLD_ANCHORS } from '../../state/timeline'
import { getIllustration } from '../../lib/illustrations'
import { scrollToTime } from '../director'
import { Eyebrow, MagneticButton } from './Button'

const STEPS = [
  { n: '01', label: 'Ảnh 2D' },
  { n: '02', label: 'AI quét chiều sâu' },
  { n: '03', label: 'Mô hình 3D' },
]

function StepIndicator() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    let raf = 0
    let last = -1
    const loop = () => {
      const t = S.t
      const s = t < T.aiScan[0] ? 0 : t < T.aiEmerge[0] + 0.2 ? 1 : 2
      if (s !== last) {
        last = s
        setStep(s)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <ol className="ai-steps glass invisible fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full p-1.5 font-nav text-xs font-semibold sm:bottom-10 sm:text-sm">
      {STEPS.map((s, i) => (
        <li
          key={s.n}
          className={`flex items-center gap-2 rounded-full px-3 py-2 transition-all duration-500 ${
            i === step ? 'bg-ink text-white' : i < step ? 'text-ink' : 'text-ink/40'
          }`}
        >
          <span className={`grid h-5 w-5 place-items-center rounded-full text-[0.6rem] ${i <= step ? 'bg-violet text-white' : 'bg-ink/10'}`}>
            {i < step ? '✓' : s.n}
          </span>
          <span className={i === step ? '' : 'hidden sm:inline'}>{s.label}</span>
        </li>
      ))}
    </ol>
  )
}

export function AIOverlay() {
  const preset = useUI((s) => s.aiPreset)
  const setPreset = useUI((s) => s.setAiPreset)
  const replay = useUI((s) => s.replayAi)
  const [how, setHow] = useState(false)
  const [zoom, setZoom] = useState(1)
  const thumbs = AI_PRESETS.map((p) => ({ ...p, url: getIllustration(p.kind).url }))
  const current = thumbs.find((p) => p.kind === preset)!

  const changeZoom = (d: number) => {
    const z = Math.min(1.4, Math.max(0.75, +(zoom + d).toFixed(2)))
    setZoom(z)
    S.aiZoom = z
  }

  return (
    <section id="ai-studio-layer" aria-labelledby="ai-hero-title" className="world-layer">
      {/* Hero — beginning of World 1 */}
      <div className="ai-hero absolute inset-x-0 bottom-0 top-0 mx-auto flex max-w-7xl flex-col justify-end px-5 pb-24 sm:px-8 md:justify-center md:pb-0">
        <div className="max-w-xl md:max-w-[40rem]">
          <div className="rise">
            <Eyebrow index="01">AI STUDIO</Eyebrow>
          </div>
          <h1 id="ai-hero-title" className="rise display mt-5 text-[clamp(3rem,7vw,6.4rem)] font-bold">
            Imagine it.
            <br />
            <span className="bg-gradient-to-r from-violet via-[#9C86FF] to-[#5FB8FF] bg-clip-text text-transparent">Make it 3D.</span>
          </h1>
          <p className="rise mt-5 max-w-md text-base text-ink-soft sm:text-lg">Biến một bức ảnh thành mô hình 3D chỉ với vài thao tác.</p>
          <div className="rise mt-7 flex flex-wrap gap-3">
            <MagneticButton to={ROUTES.aiStudio}>Try AI Studio</MagneticButton>
            <MagneticButton
              variant="ghost"
              onClick={() => {
                setHow(true)
                scrollToTime(WORLD_ANCHORS[0])
              }}
            >
              See How It Works
            </MagneticButton>
          </div>
        </div>
      </div>

      <div className="scroll-hint pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 font-nav text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 md:flex">
        <span className="relative h-9 w-6 rounded-full border-2 border-ink/30">
          <span className="scroll-hint-dot absolute left-1/2 top-1.5 h-2 w-1 -translate-x-1/2 rounded-full bg-ink/60" />
        </span>
        Scroll to Explore
      </div>

      <StepIndicator />

      {/* Interactive demo — hold point of World 1 */}
      <div className="ai-panel absolute inset-x-0 bottom-0 top-0 mx-auto flex max-w-7xl flex-col justify-end px-4 pb-4 sm:px-8 md:justify-center md:pb-0">
        <div className="w-full max-w-[25rem] md:max-w-[34rem] [&>.glass]:max-w-[25rem]">
          <div className="rise hidden md:block">
            <Eyebrow index="01">AI STUDIO</Eyebrow>
            <h2 className="display mt-4 text-[clamp(2.2rem,4.2vw,3.6rem)] font-bold">
              Turn Imagination
              <br />
              Into Dimensions.
            </h2>
          </div>

          <div className="rise interactive glass mt-5 rounded-[1.75rem] p-4">
            {/* before / after surface */}
            <div className="flex items-center gap-3">
              <figure className="relative h-20 w-16 shrink-0 overflow-hidden rounded-2xl ring-1 ring-black/5 sm:h-24 sm:w-20">
                <img src={current.url} alt={`Ảnh 2D mẫu: ${current.label}`} className="h-full w-full object-cover" />
                <figcaption className="absolute bottom-1 left-1 rounded-full bg-ink px-1.5 py-0.5 font-nav text-[0.55rem] font-bold text-white">2D</figcaption>
              </figure>
              <div className="flex flex-1 items-center gap-1 text-violet" aria-hidden>
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-violet/60" />
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor" />
                </svg>
                <span className="h-px flex-1 bg-gradient-to-r from-violet/60 to-transparent" />
              </div>
              <div className="grid h-20 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#EEE8FF] to-[#D4E2FF] ring-1 ring-white sm:h-24 sm:w-20">
                <span className="font-display text-xl font-bold text-violet">3D</span>
              </div>
            </div>
            <p className="mt-3 font-nav text-xs text-ink-soft">
              Tệp mẫu: <span className="font-semibold text-ink">{current.file}</span> · bản demo dùng mô hình dựng sẵn
            </p>

            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Chọn ảnh mẫu">
              {thumbs.map((p) => (
                <button
                  key={p.kind}
                  type="button"
                  role="radio"
                  aria-checked={preset === p.kind}
                  aria-pressed={preset === p.kind}
                  className="chip !py-1 !pl-1"
                  onClick={() => setPreset(p.kind)}
                >
                  <img src={p.url} alt="" className="h-7 w-6 rounded-lg object-cover" />
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button type="button" className="icon-btn" aria-label="Thu nhỏ" onClick={() => changeZoom(-0.15)}>
                  <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
                <span className="w-10 text-center font-nav text-xs font-semibold tabular-nums">{Math.round(zoom * 100)}%</span>
                <button type="button" className="icon-btn" aria-label="Phóng to" onClick={() => changeZoom(0.15)}>
                  <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7h10M7 2v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
              <button type="button" className="chip" onClick={replay}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.3.8 4.3 2.1M12.5 1.5v3.2H9.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Replay
              </button>
            </div>

            {how && (
              <ol className="mt-4 grid gap-2 border-t border-ink/10 pt-3 text-sm">
                {[
                  ['Tải ảnh', 'Chọn ảnh nhân vật hoặc đồ vật, nền càng gọn càng tốt.'],
                  ['AI dựng khối', 'AI ước lượng chiều sâu, hình khối và chất liệu.'],
                  ['Nhận mô hình', 'Xoay, chỉnh sửa trong 3D Studio hoặc đặt in ngay.'],
                ].map(([a, b], i) => (
                  <li key={a} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet font-nav text-xs font-bold text-white">{i + 1}</span>
                    <span>
                      <b className="font-semibold">{a}</b> — <span className="text-ink-soft">{b}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rise mt-4 flex flex-wrap gap-3">
            <MagneticButton to={ROUTES.aiStudio}>Try AI Studio</MagneticButton>
            <MagneticButton variant="ghost" onClick={() => setHow((h) => !h)}>
              {how ? 'Hide steps' : 'See How It Works'}
            </MagneticButton>
          </div>
        </div>
      </div>

      <div className="ai-drag-hint glass invisible absolute right-[18%] top-[22%] hidden items-center gap-2 rounded-full px-3 py-1.5 font-nav text-xs font-semibold md:flex">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M2 8h12M2 8l2.5-2.5M2 8l2.5 2.5M14 8l-2.5-2.5M14 8l-2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Kéo để xoay mô hình
      </div>
    </section>
  )
}
