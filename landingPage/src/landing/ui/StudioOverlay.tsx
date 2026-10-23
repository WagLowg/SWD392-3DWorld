import { useState } from 'react'
import { EDITOR_COLORS } from '../../config/content'
import { ROUTES } from '../../config/routes'
import { SHAPE_REST_Y, useUI, type ShapeType } from '../../state/store'
import { WORLD_ANCHORS } from '../../state/timeline'
import { scrollToTime } from '../director'
import { Eyebrow, MagneticButton } from './Button'

const SHAPES: { type: ShapeType; label: string; icon: React.ReactNode }[] = [
  { type: 'cube', label: 'Cube', icon: <rect x="4" y="4" width="12" height="12" rx="3" /> },
  { type: 'sphere', label: 'Sphere', icon: <circle cx="10" cy="10" r="6.5" /> },
  { type: 'cylinder', label: 'Cylinder', icon: <path d="M4 6c0-1.7 12-1.7 12 0v8c0 1.7-12 1.7-12 0z" /> },
  { type: 'torus', label: 'Torus', icon: <circle cx="10" cy="10" r="5.5" fill="none" strokeWidth="3" stroke="currentColor" /> },
  { type: 'cone', label: 'Cone', icon: <path d="M10 3l6.5 13h-13z" /> },
  { type: 'block', label: 'Block', icon: <rect x="7" y="3" width="6" height="14" rx="2.5" /> },
]

export function StudioOverlay() {
  const mode = useUI((s) => s.mode)
  const setMode = useUI((s) => s.setMode)
  const selected = useUI((s) => s.selected)
  const objects = useUI((s) => s.objects)
  const update = useUI((s) => s.updateObject)
  const addShape = useUI((s) => s.addShape)
  const reset = useUI((s) => s.resetScene)
  const [panel, setPanel] = useState<'shapes' | 'colors' | null>(null)
  const [tips, setTips] = useState(false)
  const sel = objects.find((o) => o.id === selected)

  const nudge = (dx: number, dz: number) => {
    if (!sel) return
    const x = Math.max(-2.75, Math.min(2.75, sel.pos[0] + dx))
    const z = Math.max(-1.75, Math.min(1.75, sel.pos[2] + dz))
    update(sel.id, { pos: [x, sel.pos[1], z] })
  }

  return (
    <section id="3d-studio-layer" aria-labelledby="st-title" className="world-layer">
      <div className="st-head absolute inset-x-0 top-0 mx-auto flex max-w-7xl justify-end px-5 pt-24 sm:px-8 md:pt-32 lg:pr-24">
        <div className="max-w-md text-right">
          <div className="rise">
            <Eyebrow index="02">3D STUDIO</Eyebrow>
          </div>
          <h2 id="st-title" className="rise display mt-4 text-[clamp(2.6rem,6vw,5.6rem)] font-bold">
            Shape it.
            <br />
            <span className="text-[#16A37B]">Make it yours.</span>
          </h2>
          <p className="rise ml-auto mt-4 hidden max-w-sm text-sm sm:block text-ink-soft sm:text-base">
            Sáng tạo và tùy chỉnh mô hình 3D ngay trên trình duyệt, theo cách đơn giản nhất.
          </p>
          <div className="rise mt-6 hidden flex-wrap justify-end gap-3 sm:flex">
            <MagneticButton to={ROUTES.studio3d}>Open 3D Studio</MagneticButton>
            <MagneticButton
              variant="ghost"
              onClick={() => {
                setTips(true)
                scrollToTime(WORLD_ANCHORS[1])
              }}
            >
              Explore the Tools
            </MagneticButton>
          </div>
        </div>
      </div>

      {/* Mini editor toolbar */}
      <div className="st-tools absolute inset-x-0 bottom-3 flex flex-col items-center gap-2 px-3 sm:bottom-8">
        {tips && (
          <div className="interactive glass max-w-md rounded-2xl px-4 py-3 text-center text-xs text-ink-soft sm:text-sm">
            <b className="text-ink">Mẹo:</b> chạm một khối để chọn · kéo để di chuyển (tự bám lưới) · chế độ Rotate để xoay · kéo nền để xoay camera.
            <button type="button" className="ml-2 font-semibold text-ink underline" onClick={() => setTips(false)}>
              Ok
            </button>
          </div>
        )}

        {panel === 'shapes' && (
          <div className="interactive glass flex gap-1 rounded-2xl p-1.5" role="group" aria-label="Thêm khối">
            {SHAPES.map((s) => (
              <button
                key={s.type}
                type="button"
                className="flex flex-col items-center gap-1 rounded-xl px-2.5 py-2 font-nav text-[0.65rem] font-semibold hover:bg-white"
                onClick={() => {
                  addShape(s.type)
                  setPanel(null)
                }}
                aria-label={`Thêm ${s.label}`}
                data-rest={SHAPE_REST_Y[s.type]}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-[#16A37B]">
                  {s.icon}
                </svg>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {panel === 'colors' && (
          <div className="interactive glass flex items-center gap-2 rounded-full px-3 py-2" role="group" aria-label="Đổi màu">
            {!sel && <span className="font-nav text-xs text-ink-soft">Chọn một khối trước</span>}
            {sel &&
              EDITOR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="swatch"
                  style={{ background: c }}
                  aria-label={`Màu ${c}`}
                  aria-pressed={sel.color.toLowerCase() === c.toLowerCase()}
                  onClick={() => update(sel.id, { color: c })}
                />
              ))}
          </div>
        )}

        <div className="interactive glass flex items-center gap-1 rounded-full p-1.5 font-nav" role="toolbar" aria-label="Công cụ 3D Studio">
          <button type="button" className="icon-btn" aria-pressed={mode === 'move'} aria-label="Move" title="Move" onClick={() => setMode('move')}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2v16M2 10h16M10 2l-2.5 2.5M10 2l2.5 2.5M10 18l-2.5-2.5M10 18l2.5-2.5M2 10l2.5-2.5M2 10l2.5 2.5M18 10l-2.5-2.5M18 10l-2.5 2.5" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-pressed={mode === 'rotate'}
            aria-label="Rotate"
            title="Rotate (nhấn khi đang chọn để xoay 45°)"
            onClick={() => {
              if (mode === 'rotate' && sel) update(sel.id, { rotY: sel.rotY + Math.PI / 4 })
              setMode('rotate')
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.5 10A6.5 6.5 0 1 1 10 3.5c2 0 3.8.9 5 2.4M15.5 2.5v3.8h-3.8" />
            </svg>
          </button>
          <span className="mx-1 h-6 w-px bg-ink/10" />
          <button type="button" className="chip !border-0" aria-expanded={panel === 'shapes'} onClick={() => setPanel(panel === 'shapes' ? null : 'shapes')}>
            Shapes
          </button>
          <button type="button" className="chip !border-0" aria-expanded={panel === 'colors'} onClick={() => setPanel(panel === 'colors' ? null : 'colors')}>
            <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: sel?.color ?? 'conic-gradient(#7FE3C0,#FFD166,#FF8F7A,#98DFFF,#B9A7FF,#7FE3C0)' }} />
            Colors
          </button>
          <span className="mx-1 h-6 w-px bg-ink/10" />
          <button type="button" className="icon-btn" aria-label="Reset" title="Reset" onClick={() => reset()}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 10A6.5 6.5 0 1 0 10 3.5c-2 0-3.8.9-5 2.4M4.5 2.5v3.8h3.8" />
            </svg>
          </button>
        </div>

        {/* touch-friendly nudge pad when something is selected */}
        {sel && mode === 'move' && (
          <div className="interactive glass flex items-center gap-1 rounded-full p-1 md:hidden" role="group" aria-label="Di chuyển khối">
            {(
              [
                ['←', -0.25, 0],
                ['↑', 0, -0.25],
                ['↓', 0, 0.25],
                ['→', 0.25, 0],
              ] as const
            ).map(([l, dx, dz]) => (
              <button key={l} type="button" className="icon-btn !h-9 !w-9" onClick={() => nudge(dx, dz)} aria-label={`Di chuyển ${l}`}>
                {l}
              </button>
            ))}
          </div>
        )}
        <MagneticButton to={ROUTES.studio3d} className="sm:hidden">
          Open 3D Studio
        </MagneticButton>
      </div>
    </section>
  )
}
