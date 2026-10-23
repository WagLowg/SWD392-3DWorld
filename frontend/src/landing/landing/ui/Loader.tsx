import { useEffect, useState } from 'react'
import { useUI } from '../../state/store'

/** Simple 3D-cube loader; fades out once the canvas has rendered and fonts are in. */
export function Loader() {
  const ready = useUI((s) => s.ready)
  const [fonts, setFonts] = useState(false)
  const [minTime, setMinTime] = useState(false)
  const [gone, setGone] = useState(false)
  const done = ready && fonts && minTime

  useEffect(() => {
    document.fonts?.ready.then(() => setFonts(true)).catch(() => setFonts(true))
    const t = setTimeout(() => setMinTime(true), 700)
    // never block the page forever
    const failsafe = setTimeout(() => setFonts(true), 3500)
    return () => {
      clearTimeout(t)
      clearTimeout(failsafe)
    }
  }, [])
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setGone(true), 700)
    return () => clearTimeout(t)
  }, [done])

  if (gone) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 grid place-items-center bg-paper transition-opacity duration-700 ${done ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <div className="flex flex-col items-center gap-7" style={{ perspective: 400 }}>
        <div className="loader-cube">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        <p className="font-nav text-xs font-semibold uppercase tracking-[0.3em] text-ink/50">Building worlds…</p>
      </div>
    </div>
  )
}
