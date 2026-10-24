import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { S } from '../state/scene'
import { HOLDS, T, WORLD_Y } from '../state/timeline'
import { clamp, damp, lerp, range, smooth } from '../lib/math'

type Shot = { t: number; f: [number, number, number]; dist: number; yaw: number; pitch: number; fx: number }

/** Camera keyframes along the scroll timeline (world-space focus point). */
const SHOTS: Shot[] = [
  { t: 0, f: [0.55, 1.35, 0], dist: 10, yaw: 0, pitch: 0.04, fx: 0.13 },
  { t: 1.0, f: [1.35, 1.4, 0.3], dist: 8.6, yaw: -0.18, pitch: 0.07, fx: 0.15 },
  { t: 1.95, f: [1.6, 1.3, 1.0], dist: 7.8, yaw: 0.02, pitch: 0.06, fx: 0.17 },
  { t: 2.9, f: [1.6, 1.3, 1.0], dist: 7.8, yaw: 0.02, pitch: 0.06, fx: 0.17 },
  { t: 3.4, f: [0.6, -10, 1.5], dist: 11.5, yaw: 0.65, pitch: 0.18, fx: 0 },
  { t: 3.85, f: [0, -20.6, 0], dist: 11.5, yaw: -0.4, pitch: 0.34, fx: -0.14 },
  { t: 4.9, f: [0, -20.75, 0], dist: 9.6, yaw: -0.12, pitch: 0.3, fx: -0.14 },
  { t: 5.5, f: [0, -20.75, 0], dist: 11, yaw: 0.3, pitch: 0.4, fx: -0.15 },
  { t: 6.5, f: [0, -20.75, 0], dist: 11, yaw: 0.3, pitch: 0.4, fx: -0.15 },
  { t: 7.0, f: [0, -32, 1.2], dist: 10, yaw: 0.05, pitch: 0.16, fx: 0 },
  { t: 7.45, f: [0, -42.6, 0], dist: 12.5, yaw: 0, pitch: 0.12, fx: 0.06 },
  { t: 8.75, f: [0, -42.6, 0.4], dist: 11.6, yaw: 0, pitch: 0.14, fx: 0.11 },
  { t: 9.7, f: [0, -42.6, 0.4], dist: 11.6, yaw: 0, pitch: 0.14, fx: 0.11 },
  { t: 10.15, f: [0.6, -54, 0.6], dist: 10, yaw: -0.25, pitch: 0.1, fx: 0.05 },
  { t: 10.6, f: [0.9, -61.5, 0], dist: 11.5, yaw: -0.05, pitch: 0.12, fx: 0.15 },
  { t: 10.85, f: [0.9, -61.7, 0], dist: 11.2, yaw: -0.1, pitch: 0.14, fx: 0.15 },
  { t: 11.3, f: [0.85, -64.0, 0], dist: 10.2, yaw: -0.2, pitch: 0.17, fx: 0.15 },
  { t: 12.75, f: [0.85, -64.0, 0], dist: 9.6, yaw: 0.18, pitch: 0.16, fx: 0.15 },
  { t: 13.25, f: [2.3, -64.4, 0.5], dist: 11.2, yaw: -0.08, pitch: 0.12, fx: 0.2 },
  { t: 14.2, f: [2.3, -64.4, 0.5], dist: 11.2, yaw: -0.08, pitch: 0.12, fx: 0.2 },
  { t: 14.65, f: [0, -77, 0.5], dist: 11, yaw: 0.4, pitch: 0.1, fx: 0 },
  { t: 15.1, f: [0, -87.4, 0], dist: 11, yaw: 0, pitch: 0.06, fx: 0 },
  { t: 16, f: [0, -87.4, 0], dist: 11, yaw: 0, pitch: 0.06, fx: 0 },
]

function sample(t: number, out: Shot) {
  let i = 0
  while (i < SHOTS.length - 2 && t > SHOTS[i + 1].t) i++
  const a = SHOTS[i]
  const b = SHOTS[i + 1]
  const k = smooth(clamp((t - a.t) / (b.t - a.t)))
  out.f[0] = lerp(a.f[0], b.f[0], k)
  out.f[1] = lerp(a.f[1], b.f[1], k)
  out.f[2] = lerp(a.f[2], b.f[2], k)
  out.dist = lerp(a.dist, b.dist, k)
  out.yaw = lerp(a.yaw, b.yaw, k)
  out.pitch = lerp(a.pitch, b.pitch, k)
  out.fx = lerp(a.fx, b.fx, k)
  return out
}

/** 0..1 how "inside" a world's interactive hold the timeline is. */
export function holdWeight(t: number, w: number) {
  const [a, b] = HOLDS[w]
  return smooth(clamp((t - (a - 0.35)) / 0.35)) * smooth(clamp(((b + 0.35) - t) / 0.35))
}

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const shot = useRef<Shot>({ t: 0, f: [0, 0, 0], dist: 10, yaw: 0, pitch: 0, fx: 0 })
  const par = useRef({ x: 0, y: 0 })
  const focus = useRef(new THREE.Vector3())

  useFrame((_, dt) => {
    const s = sample(S.t, shot.current)
    const aspect = size.width / size.height
    const portrait = aspect < 1
    // keep the hero object in frame on narrow screens
    const distMul = portrait ? 1 + (1 / aspect - 1) * 0.55 : aspect < 1.3 ? 1.12 : 1

    const amt = S.reduced ? 0 : 1
    par.current.x = damp(par.current.x, S.pointer.x * amt, 3, dt)
    par.current.y = damp(par.current.y, S.pointer.y * amt, 3, dt)

    // user orbit in studio + print worlds
    const userYaw = S.drag[1] * holdWeight(S.t, 1) + S.drag[3] * holdWeight(S.t, 3)

    const yaw = s.yaw + par.current.x * 0.05 + userYaw
    const pitch = s.pitch + par.current.y * 0.025
    const d = s.dist * distMul

    focus.current.set(s.f[0], s.f[1], s.f[2])
    // during transitions, follow the travelling object instead of a fixed keyframe
    for (const [key, r] of [
      ['ta', T.ta],
      ['tb', T.tb],
      ['tc', T.tc],
    ] as const) {
      const x = range(S.t, r)
      const w = smooth(clamp(x / 0.22)) * smooth(clamp((1 - x) / 0.22))
      if (w > 0) focus.current.lerp(S.track[key], w)
    }
    const f = focus.current
    camera.position.set(
      f.x + Math.sin(yaw) * Math.cos(pitch) * d,
      f.y + Math.sin(pitch) * d,
      f.z + Math.cos(yaw) * Math.cos(pitch) * d,
    )
    camera.lookAt(f)
    S.focusY = f.y

    // shift the frame so the hero object sits beside the copy (desktop) or above it (mobile)
    const w = size.width
    const h = size.height
    const offX = portrait ? 0 : -s.fx * w
    // studio copy sits at the top on phones, so frame its model lower
    const studioW = clamp(1 - Math.abs(f.y - WORLD_Y[1] - 1.25) / 6)
    const offY = portrait ? (0.14 - 0.26 * studioW) * h : 0
    camera.setViewOffset(w, h, offX, offY, w, h)
  })
  return null
}
