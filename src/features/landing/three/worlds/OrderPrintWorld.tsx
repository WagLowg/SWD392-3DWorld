import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { QuadraticBezierLine, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { PRINT_SCALES } from '../../config/content'
import { S } from '../../state/scene'
import { useUI } from '../../state/store'
import { T, WORLD_Y } from '../../state/timeline'
import { bell, clamp, damp, easeInOut, easeOutBack, lerp, range } from '../../lib/math'
import { Figure, FIGURE_HEIGHT } from '../figures'
import { createPrintMaterial, createWireMaterial, MaterialScope, setPrintClip } from '../materials'
import { useWorldVisibility } from '../Interaction'

const PX = 0.8
const BED_Y = 0.62
const TOP_Y = 4.0
const ABOVE = new THREE.Vector3(PX, 4.45, 0)
const PEDESTAL = new THREE.Vector3(3.7, 0.5, 1.0)
const BASE_PRINT_SCALE = 0.78

/** Effective print state: scroll-driven, or the replay demo when it runs */
export function printPhase(t: number) {
  const demo = S.printDemo
  const progress = demo.active ? demo.progress : range(t, T.prPrint)
  const rise = demo.active ? demo.rise : easeInOut(range(t, T.prRise))
  return {
    wireIn: range(t, T.prWireIn),
    descend: easeInOut(range(t, T.prDescend)),
    progress,
    rise,
    demo: demo.active,
  }
}

const bezier = new THREE.CubicBezierCurve3(
  new THREE.Vector3(PX, BED_Y, 0),
  new THREE.Vector3(PX, BED_Y + 1.4, 2.4),
  new THREE.Vector3(PEDESTAL.x, PEDESTAL.y + 1.6, PEDESTAL.z + 0.4),
  PEDESTAL.clone(),
)

/* ------------------------------------------------------------------ */
function Printer({ colorRef }: { colorRef: React.RefObject<THREE.Color> }) {
  const gantry = useRef<THREE.Group>(null)
  const xRail = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const spool = useRef<THREE.Group>(null)
  const filament = useRef<THREE.MeshPhysicalMaterial>(null)
  const nozzleGlow = useRef<THREE.Mesh>(null)
  const interior = useRef<THREE.PointLight>(null)
  const screenBar = useRef<THREE.Mesh>(null)
  const fan = useRef<THREE.Mesh>(null)
  const line = useRef<any>(null)
  const pathT = useRef(0)
  const lastProgress = useRef(0)
  const headPos = useRef(new THREE.Vector3(PX - 1.1, 3.5, -1.0))
  const kind = useUI((s) => s.printKind)
  const scaleId = useUI((s) => s.printScale)
  const v = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), m: new THREE.Vector3() }), [])

  useFrame((state, dt) => {
    const ph = printPhase(S.t)
    const factor = PRINT_SCALES.find((s) => s.id === scaleId)!.factor
    const s = BASE_PRINT_SCALE * factor
    const H = FIGURE_HEIGHT[kind] * s
    const printing = ph.progress > 0.001 && ph.progress < 0.999 && ph.rise < 0.01

    // head time advances with print progress, plus a slow trace while paused
    const dp = Math.abs(ph.progress - lastProgress.current)
    lastProgress.current = ph.progress
    pathT.current += printing ? dp * 260 + dt * 1.2 : 0
    const u = pathT.current
    const tri = (x: number) => 2 * Math.abs(x - Math.floor(x + 0.5)) * 2 - 1
    const target = printing
      ? v.a.set(PX + Math.sin(u * 2.3) * 0.62 * factor, BED_Y + ph.progress * H + 0.06, tri(u * 0.18) * 0.55 * factor)
      : v.a.set(PX - 1.15, Math.min(TOP_Y - 0.4, Math.max(BED_Y + 0.6, BED_Y + ph.progress * H + 0.3)), -1.05)
    const k = printing ? 30 : 4
    headPos.current.x = damp(headPos.current.x, target.x, k, dt)
    headPos.current.y = damp(headPos.current.y, target.y, k, dt)
    headPos.current.z = damp(headPos.current.z, target.z, k, dt)

    if (gantry.current) gantry.current.position.y = headPos.current.y + 0.42
    if (xRail.current) xRail.current.position.z = headPos.current.z
    if (head.current) head.current.position.set(headPos.current.x, headPos.current.y + 0.32, headPos.current.z)
    if (fan.current) fan.current.rotation.z += dt * (printing ? 30 : 4)
    if (spool.current) spool.current.rotation.x -= printing ? dt * 1.4 : 0
    if (filament.current) filament.current.color.copy(colorRef.current)
    if (nozzleGlow.current) {
      nozzleGlow.current.visible = printing
      nozzleGlow.current.position.set(headPos.current.x, headPos.current.y - 0.01, headPos.current.z)
      nozzleGlow.current.scale.setScalar(0.05 + Math.sin(state.clock.elapsedTime * 30) * 0.01)
    }
    if (interior.current) interior.current.intensity = damp(interior.current.intensity, printing ? 9 : 4, 3, dt)
    if (screenBar.current) {
      screenBar.current.scale.x = Math.max(0.001, ph.progress)
      screenBar.current.position.x = -0.32 + 0.32 * ph.progress
    }
    if (line.current) {
      v.a.set(PX + 1.95, 2.6, -0.4)
      v.b.set(headPos.current.x, headPos.current.y + 0.62, headPos.current.z)
      v.m.set(PX + 1.6, TOP_Y + 1.1, -0.6)
      line.current.setPoints(v.a, v.b, v.m)
    }
  })

  const body = '#F7F7FA'
  const frame = '#2E2E38'
  const orange = '#FF8A3D'
  return (
    <group>
      {/* base + bed */}
      <RoundedBox args={[3.3, 0.5, 3.2]} radius={0.16} smoothness={4} position={[PX, 0.25, 0]}>
        <meshPhysicalMaterial color={body} roughness={0.35} clearcoat={0.6} />
      </RoundedBox>
      <RoundedBox args={[2.5, 0.08, 2.4]} radius={0.03} position={[PX, BED_Y - 0.04, 0]}>
        <meshPhysicalMaterial color="#2C2C36" roughness={0.55} clearcoat={0.4} />
      </RoundedBox>
      <mesh position={[PX, BED_Y + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.3, 2.2, 1, 1]} />
        <meshPhysicalMaterial color="#C9A86A" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* front screen */}
      <RoundedBox args={[0.9, 0.26, 0.06]} radius={0.04} position={[PX + 0.9, 0.27, 1.6]}>
        <meshPhysicalMaterial color="#202027" roughness={0.2} clearcoat={1} />
      </RoundedBox>
      <mesh ref={screenBar} position={[PX + 0.9 - 0.32, 0.27, 1.64]}>
        <boxGeometry args={[0.64, 0.05, 0.01]} />
        <meshStandardMaterial color={orange} emissive={orange} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[PX - 1.1, 0.27, 1.61]}>
        <circleGeometry args={[0.07, 24]} />
        <meshStandardMaterial color="#7FE3C0" emissive="#7FE3C0" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* corner posts */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <RoundedBox key={`${sx}${sz}`} args={[0.2, TOP_Y - 0.5, 0.2]} radius={0.06} position={[PX + sx * 1.5, (TOP_Y + 0.5) / 2, sz * 1.45]}>
            <meshPhysicalMaterial color={frame} roughness={0.4} clearcoat={0.5} />
          </RoundedBox>
        )),
      )}
      {/* top cap with LED strip */}
      <RoundedBox args={[3.3, 0.36, 3.2]} radius={0.14} smoothness={4} position={[PX, TOP_Y + 0.18, 0]}>
        <meshPhysicalMaterial color={body} roughness={0.35} clearcoat={0.6} />
      </RoundedBox>
      <mesh position={[PX, TOP_Y - 0.02, 1.4]}>
        <boxGeometry args={[2.6, 0.04, 0.06]} />
        <meshStandardMaterial color="#FFE2B8" emissive="#FFD39A" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <pointLight ref={interior} position={[PX, TOP_Y - 0.6, 0.6]} color="#FFC58A" intensity={4} distance={5} decay={1.5} />
      {/* glass side + back panels */}
      {[
        { p: [PX - 1.52, (TOP_Y + 0.5) / 2, 0], r: [0, Math.PI / 2, 0], s: [2.9, TOP_Y - 0.5] },
        { p: [PX + 1.52, (TOP_Y + 0.5) / 2, 0], r: [0, Math.PI / 2, 0], s: [2.9, TOP_Y - 0.5] },
        { p: [PX, (TOP_Y + 0.5) / 2, -1.47], r: [0, 0, 0], s: [3.0, TOP_Y - 0.5] },
      ].map((g, i) => (
        <mesh key={i} position={g.p as [number, number, number]} rotation={g.r as [number, number, number]}>
          <planeGeometry args={g.s as [number, number]} />
          <meshPhysicalMaterial color="#DDF2FF" roughness={0.05} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} clearcoat={1} />
        </mesh>
      ))}
      {/* gantry: side rails ride the Z axis, X rail slides in Y */}
      <group ref={gantry} position={[0, 2, 0]}>
        {[-1, 1].map((sx) => (
          <RoundedBox key={sx} args={[0.12, 0.12, 2.8]} radius={0.04} position={[PX + sx * 1.38, 0, 0]}>
            <meshPhysicalMaterial color="#9AA0B5" metalness={0.6} roughness={0.3} />
          </RoundedBox>
        ))}
        <group ref={xRail}>
          <RoundedBox args={[2.9, 0.12, 0.14]} radius={0.04} position={[PX, 0, 0]}>
            <meshPhysicalMaterial color="#9AA0B5" metalness={0.6} roughness={0.3} />
          </RoundedBox>
        </group>
      </group>
      {/* print head */}
      <group ref={head}>
        <RoundedBox args={[0.46, 0.46, 0.4]} radius={0.1} smoothness={3}>
          <meshPhysicalMaterial color={body} roughness={0.3} clearcoat={1} />
        </RoundedBox>
        <mesh ref={fan} position={[0, 0, 0.21]}>
          <circleGeometry args={[0.15, 6]} />
          <meshStandardMaterial color={orange} />
        </mesh>
        <mesh position={[0, 0, 0.215]}>
          <ringGeometry args={[0.15, 0.18, 32]} />
          <meshStandardMaterial color="#202027" />
        </mesh>
        <mesh position={[0, -0.3, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.07, 0.16, 20]} />
          <meshPhysicalMaterial color="#D9A441" metalness={0.8} roughness={0.25} />
        </mesh>
      </group>
      <mesh ref={nozzleGlow}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color="#FFB066" toneMapped={false} />
      </mesh>
      {/* filament spool */}
      <group position={[PX + 1.95, 2.6, -0.4]}>
        <mesh position={[0, -1.15, 0]}>
          <boxGeometry args={[0.12, 0.9, 0.12]} />
          <meshPhysicalMaterial color={frame} roughness={0.4} />
        </mesh>
        <group ref={spool} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.5, 0.5, 0.36, 48]} />
            <meshPhysicalMaterial ref={filament} color="#A894FF" roughness={0.35} clearcoat={0.6} />
          </mesh>
          {[-0.2, 0.2].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <cylinderGeometry args={[0.62, 0.62, 0.05, 48]} />
              <meshPhysicalMaterial color={body} roughness={0.25} clearcoat={1} />
            </mesh>
          ))}
          <mesh>
            <cylinderGeometry args={[0.16, 0.16, 0.5, 24]} />
            <meshPhysicalMaterial color={orange} roughness={0.3} clearcoat={1} />
          </mesh>
        </group>
      </group>
      <QuadraticBezierLine ref={line} start={[0, 0, 0]} end={[0, 1, 0]} color="#ffffff" lineWidth={2.2} transparent opacity={0.85} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
function PrintJob({ colorRef }: { colorRef: React.RefObject<THREE.Color> }) {
  const kind = useUI((s) => s.printKind)
  const material = useUI((s) => s.printMaterial)
  const scaleId = useUI((s) => s.printScale)
  const color = useUI((s) => s.printColor)
  const printMat = useMemo(() => createPrintMaterial('#A894FF', true), [])
  const ghostMat = useMemo(() => {
    const m = createWireMaterial('#6CB8FF')
    m.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 999)]
    return m
  }, [])
  const solid = useRef<THREE.Group>(null)
  const ghost = useRef<THREE.Group>(null)
  const scaleShown = useRef(1)
  const pop = useRef(1)
  const prevKind = useRef(kind)
  const target = useMemo(() => new THREE.Color(color), [color])
  const pos = useMemo(() => new THREE.Vector3(), [])
  const base = useMemo(() => new THREE.Vector3(0, WORLD_Y[3], 0), [])
  const worldTmp = useMemo(() => new THREE.Vector3(), [])

  useEffect(
    () => () => {
      printMat.dispose()
      ghostMat.dispose()
    },
    [printMat, ghostMat],
  )

  useFrame((state, dt) => {
    const ph = printPhase(S.t)
    const time = state.clock.elapsedTime
    if (prevKind.current !== kind) {
      prevKind.current = kind
      pop.current = 0
    }
    pop.current = damp(pop.current, 1, 5, dt)
    const factor = PRINT_SCALES.find((s) => s.id === scaleId)!.factor
    scaleShown.current = damp(scaleShown.current, factor, 6, dt)
    const printScale = BASE_PRINT_SCALE * scaleShown.current

    // material: filament colour + PLA (satin) / PETG (glossy)
    colorRef.current.lerp(target, 1 - Math.exp(-10 * dt))
    printMat.color.copy(colorRef.current)
    const petg = material === 'PETG' ? 1 : 0
    printMat.roughness = damp(printMat.roughness, lerp(0.55, 0.2, petg), 6, dt)
    printMat.clearcoat = damp(printMat.clearcoat, lerp(0.1, 0.9, petg), 6, dt)

    // the digital model: hand-off from marketplace → hover → descend onto the bed
    const above = ph.descend <= 0
    pos.copy(ABOVE).lerp(new THREE.Vector3(PX, BED_Y, 0), ph.descend)
    const sc = lerp(S.handoff.printAboveScale, printScale, ph.descend)
    const popS = easeOutBack(clamp(pop.current), 1.6)

    // after printing, the finished piece moves to the display pedestal
    if (ph.rise > 0) bezier.getPoint(ph.rise, pos)
    pos.y += ph.rise > 0 ? bell(ph.rise) * 0.2 : 0

    const H = FIGURE_HEIGHT[kind] * printScale
    const clipLocal = BED_Y + ph.progress * H
    const clipWorld = clipLocal + WORLD_Y[3]
    const printed = ph.progress > 0.001
    const finished = ph.rise > 0.001 || (ph.progress >= 0.999 && !ph.demo && S.t > T.prPrint[1])

    if (solid.current) {
      solid.current.position.copy(pos)
      solid.current.scale.setScalar(Math.max(0.0001, sc * popS))
      solid.current.visible = printed
      solid.current.rotation.y = ph.rise * Math.PI * 0.25 + (finished && ph.rise > 0.99 ? Math.sin(time * 0.5) * 0.2 : 0)
    }
    setPrintClip(printMat, finished ? 999 : clipWorld, finished ? 0 : printed ? 1 : 0)

    if (ghost.current) {
      ghost.current.position.copy(pos)
      ghost.current.scale.setScalar(Math.max(0.0001, sc * popS))
      const handedOff = S.t >= T.tc[1] - 0.03 || ph.demo
      ghost.current.visible = handedOff && !finished && ph.progress < 0.999
      ghost.current.rotation.y = above ? Math.sin(time * 0.8) * 0.4 * (1 - ph.wireIn) + time * 0.3 * (1 - ph.wireIn) : 0
      solid.current && (solid.current.rotation.y = ghost.current.visible ? 0 : solid.current.rotation.y)
    }
    const plane = ghostMat.clippingPlanes![0]
    plane.constant = printed ? -clipWorld : 999
    ghostMat.opacity = above ? 0.55 + 0.4 * bell(ph.wireIn) : 0.45

    // world-space hand-off for the marketplace wireframe
    S.handoff.printAbove.copy(worldTmp.copy(ABOVE).add(base))
    S.handoff.printAboveScale = 0.8
  })

  return (
    <>
      <group ref={solid}>
        <MaterialScope shared={printMat}>
          <Figure kind={kind} />
        </MaterialScope>
      </group>
      <group ref={ghost}>
        <MaterialScope shared={ghostMat}>
          <Figure kind={kind} />
        </MaterialScope>
      </group>
    </>
  )
}

function Workshop() {
  return (
    <group>
      {/* presentation pedestal */}
      <mesh position={[PEDESTAL.x, PEDESTAL.y / 2, PEDESTAL.z]}>
        <cylinderGeometry args={[0.85, 0.95, PEDESTAL.y, 56]} />
        <meshPhysicalMaterial color="#FFFFFF" roughness={0.3} clearcoat={1} />
      </mesh>
      <mesh position={[PEDESTAL.x, PEDESTAL.y + 0.005, PEDESTAL.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.66, 56]} />
        <meshStandardMaterial color="#FF8A3D" emissive="#FF8A3D" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      {/* tidy workshop props */}
      <RoundedBox args={[0.8, 0.5, 0.6]} radius={0.12} position={[-1.7, 0.25, 0.6]} rotation={[0, 0.4, 0]}>
        <meshPhysicalMaterial color="#B9F4D0" roughness={0.35} clearcoat={0.6} />
      </RoundedBox>
      <mesh position={[-1.7, 0.75, 0.6]} rotation={[0, 0.4, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.3, 32]} />
        <meshPhysicalMaterial color="#FF8A3D" roughness={0.35} clearcoat={0.6} />
      </mesh>
      <mesh position={[-1.4, 0.06, 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 32]} />
        <meshPhysicalMaterial color="#98DFFF" roughness={0.4} />
      </mesh>
    </group>
  )
}

export function OrderPrintWorld() {
  const root = useRef<THREE.Group>(null)
  const colorRef = useRef(new THREE.Color('#A894FF'))
  const replay = useUI((s) => s.printReplay)
  useWorldVisibility(3, root, 20, () => S.t > T.tc[0] - 0.1 && S.t < T.tc[1] + 0.2)

  useEffect(() => {
    if (replay === 0) return
    const d = S.printDemo
    d.active = true
    d.progress = 1
    d.rise = 1
    const slow = S.reduced ? 0.3 : 1
    const tl = gsap
      .timeline({ onComplete: () => void (d.active = false) })
      .to(d, { rise: 0, duration: 0.9 * slow, ease: 'power2.inOut' })
      .set(d, { progress: 0 })
      .to(d, { progress: 1, duration: 4.2 * slow, ease: 'none' })
      .to(d, { rise: 1, duration: 1.2 * slow, ease: 'power2.inOut' })
    return () => {
      tl.kill()
      d.active = false
    }
  }, [replay])

  return (
    <group ref={root} position={[0, WORLD_Y[3], 0]}>
      <Printer colorRef={colorRef} />
      <PrintJob colorRef={colorRef} />
      <Workshop />
    </group>
  )
}
