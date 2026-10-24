import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Outlines, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { S } from '../../state/scene'
import { useUI, type EditorObject, type ShapeType } from '../../state/store'
import { T, WORLD_Y } from '../../state/timeline'
import { bell, clamp, damp, easeInOut, easeOut, lerp, range, smooth } from '../../lib/math'
import { hoverCursor, useWorldVisibility } from '../Interaction'
import { AI_CHAR } from './AIStudioWorld'

const BOUNDS = { x: 2.8, z: 1.75 }
const SNAP = 0.25
const snap = (v: number) => Math.round(v / SNAP) * SNAP

/** live drag positions (not committed to the store until release) */
const live = new Map<string, THREE.Vector3>()
/** per-object displayed world positions, for trails/gizmos */
const shown = new Map<string, THREE.Object3D>()
const dropFx = { pos: new THREE.Vector3(), t: 10 }

/* ------------------------------ geometry -------------------------------- */
function ShapeMesh({
  type,
  matRef,
  children,
}: {
  type: ShapeType
  matRef: React.RefObject<THREE.MeshPhysicalMaterial | null>
  children?: React.ReactNode
}) {
  const mat = <meshPhysicalMaterial ref={matRef} roughness={0.6} clearcoat={0.2} />
  switch (type) {
    case 'cube':
      return (
        <RoundedBox args={[1.08, 1.0, 0.84]} radius={0.22} smoothness={4}>
          {mat}
          {children}
        </RoundedBox>
      )
    case 'block':
      return (
        <RoundedBox args={[0.26, 0.7, 0.32]} radius={0.1} smoothness={3}>
          {mat}
          {children}
        </RoundedBox>
      )
    case 'sphere':
      return (
        <mesh>
          <sphereGeometry args={[0.5, 48, 32]} />
          {mat}
          {children}
        </mesh>
      )
    case 'cylinder':
      return (
        <mesh>
          <cylinderGeometry args={[0.52, 0.56, 0.36, 48]} />
          {mat}
          {children}
        </mesh>
      )
    case 'torus':
      return (
        <mesh>
          <torusGeometry args={[0.28, 0.1, 20, 48]} />
          {mat}
          {children}
        </mesh>
      )
    case 'cone':
      return (
        <mesh>
          <coneGeometry args={[0.17, 0.4, 32]} />
          {mat}
          {children}
        </mesh>
      )
  }
}

/* ------------------------------ one part -------------------------------- */
function EditorPart({ obj, index }: { obj: EditorObject; index: number }) {
  const g = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshPhysicalMaterial>(null)
  const selected = useUI((s) => s.selected === obj.id)
  const hover = useRef(false)
  const lift = useRef(0)
  const pulse = useRef(0)
  const rotShown = useRef(obj.rotY)
  const color = useMemo(() => new THREE.Color(obj.color), [obj.color])
  const drag = useRef<{ mode: 'move' | 'rotate'; off: THREE.Vector3; startX: number; startRot: number; planeY: number } | null>(null)
  const plane = useMemo(() => new THREE.Plane(), [])
  const hit = useMemo(() => new THREE.Vector3(), [])
  const start = useMemo(() => new THREE.Vector3().copy(AI_CHAR).add(new THREE.Vector3(0, 1, 0)).add(new THREE.Vector3(0, WORLD_Y[0] - WORLD_Y[1], 0)), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if (selected) pulse.current = 1
  }, [selected])

  useEffect(() => {
    if (g.current) shown.set(obj.id, g.current)
    return () => void shown.delete(obj.id)
  }, [obj.id])

  useFrame((state, dt) => {
    const el = g.current
    if (!el) return
    const t = S.t
    const time = state.clock.elapsedTime
    const ta = range(t, T.ta)
    const asm = easeInOut(range(t, T.stAssemble))
    const idle = S.reduced ? 0 : 1

    const target = live.get(obj.id) ?? tmp.set(obj.pos[0], obj.pos[1], obj.pos[2])
    const fp = obj.floatPos
    const bob = Math.sin(time * 1.1 + index * 1.3) * 0.12 * idle * (1 - asm)

    let x: number, y: number, z: number
    if (ta < 1) {
      // journey from the AI character, orbiting the camera path
      const k = easeInOut(ta)
      const swirl = bell(ta) * (2.2 + (index % 3) * 0.8)
      const a = index * 1.9 + k * 4
      x = lerp(start.x, fp[0], k) + Math.cos(a) * swirl
      y = lerp(start.y, fp[1], k) + Math.sin(a * 0.7) * swirl * 0.4
      z = lerp(start.z, fp[2], k) + Math.sin(a) * swirl
    } else {
      x = lerp(fp[0], target.x, asm)
      y = lerp(fp[1] + bob, target.y, asm)
      z = lerp(fp[2], target.z, asm)
    }

    // drop-in for newly added / reset shapes
    if (obj.born) {
      const age = (performance.now() - obj.born) / 1000
      const k = clamp(age / 0.7)
      const bounce = k < 1 ? Math.abs(Math.cos(k * Math.PI * 1.5)) * (1 - k) * 2.4 : 0
      y += bounce
    }

    const hovering = hover.current && useUI.getState().holdWorld === 1
    lift.current = damp(lift.current, hovering || drag.current ? 0.14 : 0, 10, dt)
    y += lift.current

    if (live.has(obj.id)) {
      el.position.x = damp(el.position.x, x, 22, dt)
      el.position.z = damp(el.position.z, z, 22, dt)
      el.position.y = damp(el.position.y, y, 22, dt)
    } else el.position.set(x, y, z)

    const tumble = (1 - asm) * (ta < 1 ? 1 : 0.35)
    rotShown.current = damp(rotShown.current, obj.rotY, 12, dt)
    el.rotation.set((obj.rotX ?? 0) + Math.sin(time * 0.6 + index) * tumble, rotShown.current + time * 0.4 * tumble, Math.cos(time * 0.5 + index) * tumble * 0.5)

    pulse.current = damp(pulse.current, 0, 5, dt)
    const sc = 1 + Math.sin(pulse.current * Math.PI * 3) * pulse.current * 0.08
    el.scale.setScalar(sc * (ta < 1 ? lerp(0.25, 1, easeOut(ta)) : 1))

    if (mat.current) {
      mat.current.color.lerp(color, 1 - Math.exp(-8 * dt))
      // transition B: editor matte → collectible gloss
      const gloss = smooth(range(t, [T.tb[0], T.tb[0] + 0.45]))
      mat.current.roughness = lerp(0.62, 0.16, gloss)
      mat.current.clearcoat = lerp(0.15, 1, gloss)
      mat.current.clearcoatRoughness = lerp(0.4, 0.06, gloss)
    }
  })

  const canEdit = () => useUI.getState().holdWorld === 1

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!canEdit()) return
    e.stopPropagation()
    S.consumed = true
    const ui = useUI.getState()
    ui.select(obj.id)
    const el = g.current!
    const worldY = el.getWorldPosition(hit).y
    plane.set(new THREE.Vector3(0, 1, 0), -worldY)
    const p = e.ray.intersectPlane(plane, new THREE.Vector3())
    const local = p ? el.parent!.worldToLocal(p.clone()) : el.position.clone()
    drag.current = {
      mode: ui.mode,
      off: new THREE.Vector3(obj.pos[0] - local.x, 0, obj.pos[2] - local.z),
      startX: e.clientX,
      startRot: obj.rotY,
      planeY: worldY,
    }
    ;(e.target as unknown as Element).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current
    if (!d) return
    e.stopPropagation()
    if (d.mode === 'move') {
      const p = e.ray.intersectPlane(plane, hit)
      if (!p) return
      const local = g.current!.parent!.worldToLocal(p.clone())
      let nx = clamp(local.x + d.off.x, -BOUNDS.x, BOUNDS.x)
      let nz = clamp(local.z + d.off.z, -BOUNDS.z, BOUNDS.z)
      // magnetic snapping: pull toward grid lines when close
      const sx = snap(nx)
      const sz = snap(nz)
      if (Math.abs(sx - nx) < 0.06) nx = sx
      if (Math.abs(sz - nz) < 0.06) nz = sz
      live.set(obj.id, new THREE.Vector3(nx, obj.pos[1], nz))
    } else {
      const rot = d.startRot + (e.clientX - d.startX) * 0.012
      useUI.getState().updateObject(obj.id, { rotY: rot })
    }
  }
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current
    if (!d) return
    drag.current = null
    ;(e.target as unknown as Element).releasePointerCapture?.(e.pointerId)
    const ui = useUI.getState()
    if (d.mode === 'move') {
      const l = live.get(obj.id)
      if (l) {
        const p: [number, number, number] = [snap(l.x), obj.pos[1], snap(l.z)]
        live.delete(obj.id)
        ui.updateObject(obj.id, { pos: p })
        dropFx.pos.set(p[0], 0.02, p[2])
        dropFx.t = 0
      }
    } else {
      ui.updateObject(obj.id, { rotY: Math.round(obj.rotY / (Math.PI / 12)) * (Math.PI / 12) })
    }
  }

  return (
    <group
      ref={g}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerOver={(e) => {
        if (!canEdit()) return
        e.stopPropagation()
        hover.current = true
        hoverCursor.value = 'pointer'
      }}
      onPointerOut={() => {
        hover.current = false
        hoverCursor.value = null
      }}
    >
      <ShapeMesh type={obj.type} matRef={mat}>
        {selected && <Outlines thickness={0.03} color="#7955FF" />}
      </ShapeMesh>
      {obj.face && (
        <group>
          <mesh position={[0, 0.02, 0.22]} scale={[0.82, 0.58, 0.6]}>
            <sphereGeometry args={[0.5, 32, 20]} />
            <meshPhysicalMaterial color="#23222B" roughness={0.15} clearcoat={1} />
          </mesh>
          {[-0.14, 0.14].map((x) => (
            <mesh key={x} position={[x, 0.05, 0.5]} scale={[1, 1.3, 0.5]}>
              <sphereGeometry args={[0.06, 12, 8]} />
              <meshStandardMaterial color="#7FFFD4" emissive="#7FFFD4" emissiveIntensity={2} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

/* ------------------------------ gizmo ------------------------------------ */
function Gizmo() {
  const selected = useUI((s) => s.selected)
  const mode = useUI((s) => s.mode)
  const g = useRef<THREE.Group>(null)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame((state) => {
    if (!g.current) return
    const o = selected ? shown.get(selected) : null
    g.current.visible = !!o && useUI.getState().holdWorld === 1
    if (!o) return
    o.getWorldPosition(tmp)
    g.current.parent!.worldToLocal(tmp)
    g.current.position.set(tmp.x, 0.03, tmp.z)
    g.current.rotation.y = mode === 'rotate' ? state.clock.elapsedTime * 0.6 : 0
  })
  const arrows: [number, number, string][] = [
    [0.85, 0, '#FF8F7A'],
    [-0.85, 0, '#FF8F7A'],
    [0, 0.85, '#6FB8FF'],
    [0, -0.85, '#6FB8FF'],
  ]
  return (
    <group ref={g}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.68, 64]} />
        <meshBasicMaterial color="#7955FF" transparent opacity={0.8} toneMapped={false} />
      </mesh>
      {mode === 'move' &&
        arrows.map(([x, z, c], i) => (
          <mesh key={i} position={[x, 0.05, z]} rotation={[0, Math.atan2(x, z), 0]}>
            <group rotation={[Math.PI / 2, 0, 0]}>
              <mesh>
                <coneGeometry args={[0.08, 0.2, 16]} />
                <meshBasicMaterial color={c} toneMapped={false} />
              </mesh>
            </group>
          </mesh>
        ))}
      {mode === 'rotate' && (
        <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.8, 0.025, 8, 80, Math.PI * 1.6]} />
          <meshBasicMaterial color="#FFB34D" toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

/** Motion trail of the dragged shape + snap ripple on drop */
function DragFeedback() {
  const dots = useRef<THREE.Mesh[]>([])
  const ripple = useRef<THREE.Mesh>(null)
  const trail = useMemo(() => Array.from({ length: 8 }, () => new THREE.Vector3()), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    const id = [...live.keys()][0]
    const o = id ? shown.get(id) : null
    if (o) {
      o.getWorldPosition(tmp)
      dots.current[0]?.parent?.worldToLocal(tmp)
      trail[0].lerp(tmp, 0.5)
      for (let i = 1; i < trail.length; i++) trail[i].lerp(trail[i - 1], 0.35)
    }
    dots.current.forEach((d, i) => {
      if (!d) return
      d.visible = !!o
      d.position.copy(trail[i])
      d.position.y = 0.06
      d.scale.setScalar(0.09 * (1 - i / trail.length))
    })
    dropFx.t += dt
    if (ripple.current) {
      const k = clamp(dropFx.t / 0.6)
      ripple.current.visible = k < 1
      ripple.current.position.copy(dropFx.pos)
      ripple.current.scale.setScalar(0.4 + k * 1.4)
      ;(ripple.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.8
    }
  })
  return (
    <group>
      {trail.map((_, i) => (
        <mesh key={i} ref={(m) => void (m && (dots.current[i] = m))} visible={false}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color="#B9A7FF" transparent opacity={0.6} toneMapped={false} />
        </mesh>
      ))}
      <mesh ref={ripple} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.45, 0.5, 48]} />
        <meshBasicMaterial color="#7955FF" transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------ workbench -------------------------------- */
function GridLines({ matRef }: { matRef: React.RefObject<THREE.LineBasicMaterial | null> }) {
  const geo = useMemo(() => {
    const pts: number[] = []
    for (let x = -3; x <= 3.001; x += 0.25) pts.push(x, 0, -2, x, 0, 2)
    for (let z = -2; z <= 2.001; z += 0.25) pts.push(-3, 0, z, 3, 0, z)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  return (
    <lineSegments geometry={geo} position={[0, 0.006, 0]}>
      <lineBasicMaterial ref={matRef} color="#6FD6B0" transparent opacity={0.55} />
    </lineSegments>
  )
}

function Workbench() {
  const g = useRef<THREE.Group>(null)
  const grid = useRef<THREE.LineBasicMaterial>(null)
  useFrame(() => {
    const tb = range(S.t, T.tb)
    const ta = range(S.t, T.ta)
    if (g.current) {
      const out = easeInOut(clamp(tb * 1.8))
      const inn = easeOut(clamp((ta - 0.4) / 0.6))
      g.current.position.y = lerp(-3, 0, inn) - out * 4
      g.current.scale.setScalar(Math.max(0.001, lerp(0.6, 1, inn) * (1 - out * 0.6)))
      g.current.visible = inn > 0.001 && out < 0.999
    }
    if (grid.current) grid.current.opacity = 0.55 * (1 - clamp(tb * 3))
  })
  return (
    <group ref={g}>
      <RoundedBox args={[6.4, 0.42, 4.3]} radius={0.2} smoothness={4} position={[0, -0.21, 0]}>
        <meshPhysicalMaterial color="#FCFBF8" roughness={0.5} clearcoat={0.3} />
      </RoundedBox>
      <RoundedBox args={[6.7, 0.24, 4.6]} radius={0.12} smoothness={3} position={[0, -0.5, 0]}>
        <meshPhysicalMaterial color="#9FEBCB" roughness={0.4} clearcoat={0.6} />
      </RoundedBox>
      <GridLines matRef={grid} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 2.8, -0.8, sz * 1.7]}>
            <sphereGeometry args={[0.18, 20, 14]} />
            <meshStandardMaterial color="#98DFFF" emissive="#98DFFF" emissiveIntensity={0.8} />
          </mesh>
        )),
      )}
    </group>
  )
}

/** Decorative floating tool palette + transform handles */
function StudioDecor() {
  const g = useRef<THREE.Group>(null)
  const handles = useRef<THREE.Group>(null)
  useFrame((state) => {
    const time = state.clock.elapsedTime
    const ta = range(S.t, T.ta)
    const tb = range(S.t, T.tb)
    const vis = easeOut(clamp((ta - 0.5) / 0.5)) * (1 - easeInOut(clamp(tb * 2)))
    if (g.current) {
      g.current.scale.setScalar(Math.max(0.001, vis))
      g.current.visible = vis > 0.01
      g.current.children.forEach((c, i) => {
        c.position.y = (c.userData.y ?? (c.userData.y = c.position.y)) + Math.sin(time + i * 2) * (S.reduced ? 0 : 0.1)
      })
    }
    if (handles.current) handles.current.rotation.y = time * 0.3
  })
  const tools: [ShapeType, string][] = [
    ['cube', '#7FE3C0'],
    ['sphere', '#FFD166'],
    ['cylinder', '#98DFFF'],
    ['torus', '#FF8F7A'],
    ['cone', '#B9A7FF'],
  ]
  return (
    <group ref={g}>
      <group position={[-3.5, 1.5, -1.9]} rotation={[0.1, 0.5, 0.06]}>
        <RoundedBox args={[0.9, 3.1, 0.22]} radius={0.12} smoothness={4}>
          <meshPhysicalMaterial color="#ffffff" roughness={0.3} clearcoat={1} />
        </RoundedBox>
        {tools.map(([t, c], i) => (
          <mesh key={t} position={[0, 1.15 - i * 0.58, 0.22]} scale={0.32} rotation={[0.4, 0.6, 0]}>
            {t === 'cube' ? (
              <boxGeometry args={[1, 1, 1]} />
            ) : t === 'sphere' ? (
              <sphereGeometry args={[0.6, 24, 16]} />
            ) : t === 'cylinder' ? (
              <cylinderGeometry args={[0.5, 0.5, 0.9, 24]} />
            ) : t === 'torus' ? (
              <torusGeometry args={[0.45, 0.18, 12, 32]} />
            ) : (
              <coneGeometry args={[0.55, 1, 24]} />
            )}
            <meshPhysicalMaterial color={c} roughness={0.3} clearcoat={1} />
          </mesh>
        ))}
      </group>
      <group ref={handles} position={[-2.0, 3.0, -2.8]}>
        {[
          [[0.5, 0, 0], [0, 0, -Math.PI / 2], '#FF8F7A'],
          [[0, 0.5, 0], [0, 0, 0], '#7FE3C0'],
          [[0, 0, 0.5], [Math.PI / 2, 0, 0], '#6FB8FF'],
        ].map(([p, r, c], i) => (
          <group key={i} rotation={r as [number, number, number]}>
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.7, 12]} />
              <meshPhysicalMaterial color={c as string} roughness={0.3} clearcoat={1} />
            </mesh>
            <mesh position={[0, 0.78, 0]}>
              <coneGeometry args={[0.1, 0.22, 20]} />
              <meshPhysicalMaterial color={c as string} roughness={0.3} clearcoat={1} />
            </mesh>
          </group>
        ))}
        <mesh>
          <sphereGeometry args={[0.1, 20, 14]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.2} clearcoat={1} />
        </mesh>
      </group>
      <mesh position={[3.4, 0.9, 1.6]} rotation={[0.8, 0.3, 0]}>
        <torusGeometry args={[0.28, 0.1, 16, 40]} />
        <meshPhysicalMaterial color="#FFE58F" roughness={0.25} clearcoat={1} />
      </mesh>
      <mesh position={[-3.5, 0.4, 1.8]} rotation={[0.3, 0, 0.6]}>
        <capsuleGeometry args={[0.14, 0.4, 8, 16]} />
        <meshPhysicalMaterial color="#FFCCAD" roughness={0.25} clearcoat={1} />
      </mesh>
    </group>
  )
}

/* ------------------------------ world ------------------------------------ */
export function ThreeDStudioWorld() {
  const root = useRef<THREE.Group>(null)
  const creation = useRef<THREE.Group>(null)
  const objects = useUI((s) => s.objects)
  const base = useMemo(() => new THREE.Vector3(0, WORLD_Y[1], 0), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useWorldVisibility(1, root, 20, () => S.t > T.ta[0] && S.t < T.tb[1] + 0.2)

  useFrame(() => {
    const c = creation.current
    if (!c) return
    const t = S.t
    const tb = range(t, T.tb)
    // assembled creation spins, turns glossy and glides down into the showroom
    const move = easeInOut(clamp((tb - 0.15) / 0.85))
    tmp.copy(S.handoff.boltPos).sub(base)
    c.position.set(lerp(0, tmp.x, move), lerp(0, tmp.y, move) + bell(move) * 1.2, lerp(0, tmp.z, move))
    const orbit = smooth(range(t, T.stOrbit))
    c.rotation.y = easeInOut(tb) * Math.PI * 2 + orbit * 0.0
    const sc = lerp(1, S.handoff.boltScale, move)
    c.scale.setScalar(sc)
    c.visible = tb < 0.94

    // camera tracking points for transitions A (shapes flying in) and B (creation gliding out)
    const ta = easeInOut(range(t, T.ta))
    S.track.ta.set(lerp(AI_CHAR.x, 0, ta), lerp(WORLD_Y[0] + AI_CHAR.y + 1, WORLD_Y[1] + 2.0, ta), lerp(AI_CHAR.z, 0, ta))
    c.getWorldPosition(S.track.tb)
    S.track.tb.y += 1.3 * sc
  })

  return (
    <group ref={root} position={[0, WORLD_Y[1], 0]}>
      <Workbench />
      <StudioDecor />
      <group ref={creation}>
        {objects.map((o, i) => (
          <EditorPart key={o.id} obj={o} index={i} />
        ))}
        <Gizmo />
        <DragFeedback />
      </group>
    </group>
  )
}
