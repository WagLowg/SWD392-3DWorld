import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { S } from '../state/scene'
import { useUI } from '../state/store'
import { WORLD_Y } from '../state/timeline'

/**
 * One drag handler for the whole canvas. Horizontal drags on empty space feed
 * S.drag[world] while that world is in its interactive hold — the AI model
 * spins, the studio camera orbits, the carousel rotates, the printer turns.
 * Wheel events are never captured, so page scrolling always works.
 */
export function CanvasDrag() {
  const gl = useThree((s) => s.gl)
  const st = useRef({ id: -1, x: 0, lastT: 0, world: -1 })

  useEffect(() => {
    const el = gl.domElement
    const onDown = (e: PointerEvent) => {
      if (e.target !== el) return
      if (S.consumed) {
        S.consumed = false
        return
      }
      const hold = useUI.getState().holdWorld
      if (hold < 0) return
      st.current = { id: e.pointerId, x: e.clientX, lastT: performance.now(), world: hold }
      S.dragging = true
      S.dragVel[hold] = 0
    }
    const onMove = (e: PointerEvent) => {
      S.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      S.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
      if (!S.dragging || e.pointerId !== st.current.id) return
      const now = performance.now()
      const dx = (e.clientX - st.current.x) / Math.max(400, window.innerWidth * 0.6)
      const w = st.current.world
      S.drag[w] += dx * Math.PI
      if (w === 1 || w === 3) S.drag[w] = THREE.MathUtils.clamp(S.drag[w], -1.1, 1.1)
      const dtt = Math.max(1, now - st.current.lastT) / 1000
      S.dragVel[w] = (dx * Math.PI) / dtt
      st.current.x = e.clientX
      st.current.lastT = now
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== st.current.id) return
      S.dragging = false
      st.current.id = -1
      // released after holding still → no fling
      if (performance.now() - st.current.lastT > 80) S.dragVel[st.current.world] = 0
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [gl])

  // inertia after release + cursor feedback
  useFrame((_, dt) => {
    for (let w = 0; w < 4; w++) {
      if (S.dragging && st.current.world === w) continue
      const v = S.dragVel[w]
      if (Math.abs(v) > 0.001) {
        S.drag[w] += v * dt
        S.dragVel[w] *= Math.exp(-5 * dt)
        if (w === 1 || w === 3) S.drag[w] = THREE.MathUtils.clamp(S.drag[w], -1.1, 1.1)
      }
    }
    const hold = useUI.getState().holdWorld
    const cursor = S.dragging ? 'grabbing' : hoverCursor.value ?? (hold >= 0 ? 'grab' : 'auto')
    if (gl.domElement.style.cursor !== cursor) gl.domElement.style.cursor = cursor
  })
  return null
}

/** 3D objects set this on hover to show a pointer cursor. */
export const hoverCursor: { value: string | null } = { value: null }

const SHADOW_FLOORS = [
  { y: WORLD_Y[0] - 0.7, x: 1.4, z: 0.6, s: 9 },
  { y: WORLD_Y[1] - 1.6, x: 0, z: 0, s: 12 },
  { y: WORLD_Y[2] - 0.32, x: 0, z: 0, s: 14 },
  { y: WORLD_Y[3] + 0.01, x: 1.4, z: 0.3, s: 12 },
  { y: WORLD_Y[4] - 1.9, x: 0, z: 0, s: 10 },
]

/** One contact-shadow pass that follows whichever world the camera is in. */
export function SharedShadow() {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!g.current) return
    let best = 0
    for (let i = 1; i < 5; i++) if (Math.abs(S.focusY - WORLD_Y[i]) < Math.abs(S.focusY - WORLD_Y[best])) best = i
    const f = SHADOW_FLOORS[best]
    g.current.position.set(f.x, f.y, f.z)
    g.current.scale.setScalar(f.s / 12)
  })
  return (
    <group ref={g}>
      <ContactShadows scale={12} far={4} blur={2.6} opacity={0.42} resolution={S.mobile ? 256 : 512} color="#3b2f5c" frames={Infinity} />
    </group>
  )
}

/** Hide worlds the camera is far from (keeps draw calls low). */
export function useWorldVisibility(
  index: number,
  ref: React.RefObject<THREE.Object3D | null>,
  range = 19,
  force?: () => boolean,
) {
  useFrame(() => {
    if (ref.current) ref.current.visible = Math.abs(S.focusY - WORLD_Y[index]) < range || (force?.() ?? false)
  })
}
