import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { THEMES, WORLDS } from '../config/content'
import { S } from '../state/scene'
import { useUI } from '../state/store'
import { T, WORLD_ANCHORS } from '../state/timeline'
import { buildDirector, scrollToTime } from './director'
import { LandingNavigation, WorldProgress } from './ui/LandingNavigation'
import { AIOverlay } from './ui/AIOverlay'
import { StudioOverlay } from './ui/StudioOverlay'
import { MarketOverlay } from './ui/MarketOverlay'
import { PrintOverlay } from './ui/PrintOverlay'
import { FinaleOverlay } from './ui/FinaleOverlay'
import { Loader } from './ui/Loader'

const ExperienceCanvas = lazy(() => import('../three/ExperienceCanvas'))

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Shown when WebGL is unavailable: the same four worlds as a simple page. */
function WebGLFallback() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-32">
      <h1 className="display text-6xl font-bold">
        Imagine it. <span className="text-violet">Make it 3D.</span>
      </h1>
      <p className="mt-4 text-ink-soft">Trình duyệt của bạn không hỗ trợ WebGL, nên trải nghiệm 3D tương tác đang được thay bằng phiên bản tối giản.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {WORLDS.map((w, i) => (
          <Link key={w.id} to={w.route} className="rounded-3xl p-6 ring-1 ring-black/5" style={{ background: THEMES[i].top }}>
            <div className="eyebrow">0{i + 1}</div>
            <div className="mt-2 font-display text-3xl font-bold">{w.name}</div>
            <div className="mt-4 font-nav text-sm font-semibold">Open →</div>
          </Link>
        ))}
      </div>
    </main>
  )
}

export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null)
  const spacer = useRef<HTMLDivElement>(null)
  const [webgl] = useState(hasWebGL)
  const [lost, setLost] = useState(false)
  const [mobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const active = useUI((s) => s.activeWorld)

  // global flags read inside the render loop
  useState(() => {
    S.mobile = mobile
    S.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return null
  })

  useLayoutEffect(() => {
    if (!webgl || !root.current || !spacer.current) return
    window.history.scrollRestoration = 'manual'
    const dispose = buildDirector(root.current, spacer.current)
    // deep links: /#marketplace etc.
    const hash = window.location.hash.slice(1)
    const i = WORLDS.findIndex((w) => w.id === hash)
    if (i >= 0) setTimeout(() => scrollToTime(WORLD_ANCHORS[i]), 300)
    return dispose
  }, [webgl])

  // accent colour of the UI follows the current world
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', THEMES[active].ui)
  }, [active])

  if (!webgl)
    return (
      <>
        <LandingNavigation />
        <WebGLFallback />
      </>
    )

  const unit = mobile ? 55 : 65

  return (
    <div ref={root} id="top">
      <Suspense fallback={null}>
        <ExperienceCanvas onContextLost={setLost} />
      </Suspense>

      <LandingNavigation />
      <WorldProgress />

      <AIOverlay />
      <StudioOverlay />
      <MarketOverlay />
      <PrintOverlay />
      <FinaleOverlay />

      {/* the scroll track that drives the timeline; anchors give each world a real section in the document */}
      <div ref={spacer} aria-hidden style={{ height: `calc(${T.TOTAL * unit}vh + 100vh)` }} className="relative">
        {WORLDS.map((w, i) => (
          <div key={w.id} id={w.id} className="absolute left-0 h-px w-px" style={{ top: `${(WORLD_ANCHORS[i] / T.TOTAL) * T.TOTAL * unit}vh` }} />
        ))}
      </div>

      {lost && (
        <div role="alert" className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-full bg-ink px-5 py-3 font-nav text-sm text-white shadow-xl">
          Đồ họa 3D tạm dừng — đang khôi phục…{' '}
          <button className="ml-2 underline" onClick={() => window.location.reload()}>
            Tải lại
          </button>
        </div>
      )}
      <Loader />
    </div>
  )
}
