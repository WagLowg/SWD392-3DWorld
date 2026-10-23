import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { PRODUCTS } from '../../config/content'
import { S } from '../../state/scene'
import { useUI } from '../../state/store'
import { T, WORLD_Y } from '../../state/timeline'
import { clamp, damp, easeInOut, easeOut, lerp, range, wrapAngle } from '../../lib/math'
import { Figure } from '../figures'
import { createWireMaterial, MaterialScope } from '../materials'
import { hoverCursor, useWorldVisibility } from '../Interaction'

const N = PRODUCTS.length
const STEP = (Math.PI * 2) / N
const BASE_SCALE = 0.75

/** shared carousel state (read by every product each frame) */
const car = { rot: 0, target: 0, wasDragging: false, dragStart: 0, rotStart: 0 }
const PEDESTALS = ['#FFE58F', '#FFCCAD', '#B9A7FF', '#98DFFF', '#B9F4D0', '#FFB3C7']

function ProductItem({ index, wireMat }: { index: number; wireMat: THREE.MeshBasicMaterial }) {
  const p = PRODUCTS[index]
  const g = useRef<THREE.Group>(null)
  const fig = useRef<THREE.Group>(null)
  const wire = useRef<THREE.Group>(null)
  const ped = useRef<THREE.Group>(null)
  const isActive = useUI((s) => s.productIndex === index)
  const hover = useRef(0)
  const hovering = useRef(false)
  const spin = useRef(0)
  const spinVel = useRef(0)
  const pop = useRef(0)
  const drag = useRef<{ x: number; t: number } | null>(null)
  const base = useMemo(() => new THREE.Vector3(0, WORLD_Y[2], 0), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if (isActive) pop.current = 1
  }, [isActive])

  useFrame((state, dt) => {
    const el = g.current
    if (!el) return
    const t = S.t
    const time = state.clock.elapsedTime
    const R = S.mobile ? 2.4 : 3.3
    const tb = range(t, T.tb)
    const descend = index === 0 ? 1 : easeOut(range(t, [T.mkDescend[0] + index * 0.07, T.mkDescend[1] + index * 0.07]))
    const arrange = easeInOut(range(t, T.mkArrange))
    const feature = easeInOut(range(t, T.mkFeature))
    const tc = range(t, T.tc)

    const angle = index * STEP + car.rot
    const front = Math.pow((Math.cos(wrapAngle(angle)) + 1) / 2, 4)
    const radius = lerp(1.6, R, arrange) * (1 + (isActive ? 0 : easeInOut(clamp(tc * 2)) * 1.2))
    let x = Math.sin(angle) * radius
    let z = Math.cos(angle) * radius + front * feature * (S.mobile ? 0.4 : 0.7)
    let y = lerp(9 + index * 0.8, 0, descend) + front * feature * 0.25
    y += Math.sin(time * 1.2 + index * 1.7) * (S.reduced ? 0 : 0.07)
    hover.current = damp(hover.current, hovering.current ? 1 : 0, 8, dt)
    y += hover.current * 0.18

    let scale = BASE_SCALE * lerp(0.75, lerp(0.6, 0.94, front), arrange)
    pop.current = damp(pop.current, 0, 4, dt)
    scale *= 1 + Math.sin(pop.current * Math.PI * 2.5) * pop.current * 0.06

    // transition C: active product becomes a wireframe and glides to the printer
    if (isActive && tc > 0) {
      const fly = easeInOut(clamp((tc - 0.3) / 0.7))
      tmp.copy(S.handoff.printAbove).sub(base)
      x = lerp(x, tmp.x, fly)
      y = lerp(y, tmp.y, fly) + Math.sin(fly * Math.PI) * 1.5
      z = lerp(z, tmp.z, fly)
      scale = lerp(scale, S.handoff.printAboveScale, fly)
    } else if (!isActive && tc > 0) {
      scale *= 1 - easeInOut(clamp(tc * 2))
    }

    el.position.set(x, y, z)
    el.scale.setScalar(Math.max(0.0001, scale))

    // rotation: face camera, slight tilt on hover, user spin on the active one
    spin.current += spinVel.current * dt
    if (!drag.current) spinVel.current *= Math.exp(-3 * dt)
    if (!isActive) spin.current = damp(spin.current, 0, 3, dt)
    const idle = S.reduced ? 0 : Math.sin(time * 0.6 + index) * 0.2
    if (fig.current) {
      fig.current.rotation.set(hover.current * -0.12 + S.pointer.y * -0.05, -angle * 0.25 + spin.current + idle + S.pointer.x * 0.2, hover.current * 0.08)
    }
    if (wire.current && fig.current) wire.current.rotation.copy(fig.current.rotation)

    const w = isActive ? clamp(tc / 0.35) : 0
    if (fig.current) fig.current.visible = w < 0.55
    if (wire.current) wire.current.visible = w > 0.01
    if (ped.current) {
      ped.current.visible = tc < 0.5
      ped.current.scale.setScalar(Math.max(0.001, 1 - clamp(tc * 3)))
    }

    // Bolt is the robot from the 3D Studio: hand-off point for transition B
    if (index === 0) {
      el.getWorldPosition(S.handoff.boltPos)
      S.handoff.boltScale = scale
      el.visible = tb >= 0.94 || t > T.tb[1]
    } else el.visible = descend > 0.001 && scale > 0.002
    if (isActive && tc > 0.97) el.visible = false
    if (isActive) {
      el.getWorldPosition(S.track.tc)
      S.track.tc.y += 1.1 * scale
    }
  })

  const holdOn = () => useUI.getState().holdWorld === 2

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!holdOn()) return
    e.stopPropagation()
    if (isActive) {
      // drag on the selected figure rotates it
      S.consumed = true
      drag.current = { x: e.clientX, t: performance.now() }
      ;(e.target as unknown as Element).setPointerCapture?.(e.pointerId)
    }
  }
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    const now = performance.now()
    const dx = (e.clientX - drag.current.x) * 0.012
    spin.current += dx
    spinVel.current = dx / Math.max(0.001, (now - drag.current.t) / 1000)
    drag.current = { x: e.clientX, t: now }
  }
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    if (performance.now() - drag.current.t > 80) spinVel.current = 0
    drag.current = null
    ;(e.target as unknown as Element).releasePointerCapture?.(e.pointerId)
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!holdOn() || isActive) return
    e.stopPropagation()
    useUI.getState().setProduct(index)
  }

  return (
    <group
      ref={g}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onClick={onClick}
      onPointerOver={(e) => {
        if (!holdOn()) return
        e.stopPropagation()
        hovering.current = true
        hoverCursor.value = isActive ? 'grab' : 'pointer'
      }}
      onPointerOut={() => {
        hovering.current = false
        hoverCursor.value = null
      }}
    >
      <Figure ref={fig} kind={p.kind} />
      {isActive && (
        <group ref={wire} visible={false}>
          <MaterialScope shared={wireMat}>
            <Figure kind={p.kind} />
          </MaterialScope>
        </group>
      )}
      <group ref={ped}>
        <mesh position={[0, -0.16, 0]}>
          <cylinderGeometry args={[0.95, 1.05, 0.32, 48]} />
          <meshPhysicalMaterial color={PEDESTALS[index]} roughness={0.3} clearcoat={1} />
        </mesh>
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.78, 48]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

function DecorRings() {
  const g = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!g.current) return
    const time = state.clock.elapsedTime
    const vis = easeOut(range(S.t, T.mkDescend)) * (1 - easeInOut(range(S.t, [T.tc[0], T.tc[0] + 0.4])))
    g.current.scale.setScalar(Math.max(0.001, vis))
    g.current.visible = vis > 0.01
    g.current.children.forEach((c, i) => {
      c.rotation.z = time * 0.08 * (i % 2 ? 1 : -1)
    })
  })
  return (
    <group ref={g} position={[0, 1.4, 0]}>
      <mesh rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[5.2, 0.025, 8, 200]} />
        <meshPhysicalMaterial color="#FFCCAD" roughness={0.2} clearcoat={1} />
      </mesh>
      <mesh rotation={[Math.PI / 1.8, 0.3, 0]}>
        <torusGeometry args={[6, 0.015, 8, 200]} />
        <meshBasicMaterial color="#FFE58F" toneMapped={false} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 5.2, Math.sin(a) * 0.9, Math.sin(a) * 5.2 * 0.4 - 2]} scale={0.1 + (i % 3) * 0.04}>
            {i % 2 ? <sphereGeometry args={[1, 16, 12]} /> : <torusGeometry args={[1, 0.4, 8, 24]} />}
            <meshPhysicalMaterial color={['#FFE58F', '#FFCCAD', '#B9A7FF', '#98DFFF'][i % 4]} roughness={0.2} clearcoat={1} />
          </mesh>
        )
      })}
    </group>
  )
}

export function MarketplaceWorld() {
  const root = useRef<THREE.Group>(null)
  const sparkles = useRef<THREE.Group>(null)
  const wireMat = useMemo(() => createWireMaterial('#7B6BFF'), [])
  const index = useUI((s) => s.productIndex)
  const accent = useMemo(() => new THREE.Color(), [])

  useWorldVisibility(2, root, 20, () => (S.t > T.tb[0] && S.t < T.tb[1] + 0.3) || (S.t > T.tc[0] - 0.2 && S.t < T.tc[1] + 0.1))

  // choosing a product → rotate the carousel the short way round
  useEffect(() => {
    const target = -index * STEP
    const diff = wrapAngle(target - car.target)
    car.target += diff
    S.handoff.marketActiveKind = PRODUCTS[index].kind
    accent.set(PRODUCTS[index].accent)
  }, [index, accent])

  useEffect(() => () => wireMat.dispose(), [wireMat])

  useFrame((_, dt) => {
    // dragging empty space spins the carousel; snap to the nearest product on release
    const dragging = S.dragging && useUI.getState().holdWorld === 2
    if (dragging && !car.wasDragging) {
      car.dragStart = S.drag[2]
      car.rotStart = car.target
    }
    if (dragging) car.target = car.rotStart + (S.drag[2] - car.dragStart)
    if (!dragging && car.wasDragging && Math.abs(car.target - car.rotStart) < 0.03) {
      // a click, not a drag — let the product's own click handler decide
      car.target = car.rotStart
      S.dragVel[2] = 0
    } else if (!dragging && car.wasDragging) {
      const vel = S.dragVel[2]
      S.dragVel[2] = 0
      const projected = car.target + clamp(vel * 0.25, -STEP * 1.5, STEP * 1.5)
      const idx = (((Math.round(-projected / STEP) % N) + N) % N) as number
      const snapTarget = -Math.round(-projected / STEP) * STEP
      car.target = snapTarget
      useUI.getState().setProduct(idx)
    }
    car.wasDragging = dragging
    car.rot = damp(car.rot, car.target, dragging ? 14 : 5, dt)

    S.productAccent.lerp(accent, 1 - Math.exp(-3 * dt))
    wireMat.opacity = 0.35 + 0.5 * clamp(range(S.t, T.tc) / 0.35)

    // sync the printable model with the featured product as we head to Order Print
    const tc = range(S.t, T.tc)
    const ui = useUI.getState()
    if (tc > 0.3 && !ui.printKindTouched && ui.printKind !== PRODUCTS[ui.productIndex].kind) {
      ui.setPrint({ printKind: PRODUCTS[ui.productIndex].kind })
    }

    if (sparkles.current) {
      const v = easeOut(range(S.t, [T.mkDescend[0] - 0.3, T.mkDescend[0] + 0.2]))
      sparkles.current.scale.setScalar(Math.max(0.001, v))
    }
  })

  return (
    <group ref={root} position={[0, WORLD_Y[2], 0]}>
      {PRODUCTS.map((_, i) => (
        <ProductItem key={i} index={i} wireMat={wireMat} />
      ))}
      <DecorRings />
      <group ref={sparkles}>
        <Sparkles count={S.mobile ? 30 : 60} scale={[12, 5, 8]} position={[0, 2, 0]} size={3.5} speed={0.35} color="#FFB37A" />
      </group>
    </group>
  )
}
