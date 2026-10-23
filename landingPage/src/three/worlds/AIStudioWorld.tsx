import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { S } from '../../state/scene'
import { useUI } from '../../state/store'
import { T, WORLD_Y } from '../../state/timeline'
import { bell, clamp, damp, easeIn, easeInOut, easeOut, easeOutBack, lerp, rand, range } from '../../lib/math'
import { Figure, FIGURE_HEIGHT } from '../figures'
import { getIllustration } from '../../lib/illustrations'
import { useWorldVisibility } from '../Interaction'
import type { FigureKind } from '../../config/content'

export const PORTAL = new THREE.Vector3(1.6, 1.4, 0)
/** where the generated model floats (local to the AI world) */
export const AI_CHAR = new THREE.Vector3(1.6, 0.28, 1.25)
export const AI_CHAR_SCALE = 0.78

const CARD_A = new THREE.Vector3(-0.55, 1.75, 1.1)
const CARD_B = new THREE.Vector3(0.75, 1.5, 1.25)

/** Combined scroll + replay values for the generation sequence */
export function aiPhase(t: number) {
  const d = S.aiDemo.t
  const demoCard = easeInOut(clamp(d / 0.38))
  const demoScan = d < 1 ? bell(clamp((d - 0.28) / 0.42)) : 0
  const demoEmerge = clamp((d - 0.6) / 0.4)
  const card = Math.min(easeInOut(range(t, T.aiCardIn)), demoCard)
  const scan = Math.max(bell(range(t, T.aiScan)), demoScan)
  const emerge = Math.min(range(t, T.aiEmerge), demoEmerge)
  const shatter = range(t, T.ta)
  return { card, scan, emerge, shatter }
}

/* ------------------------------------------------------------------ */

const swirlVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`
const swirlFrag = /* glsl */ `
uniform float uTime; uniform float uScan;
varying vec2 vUv;
void main(){
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float a = atan(p.y, p.x);
  float sw = sin(a * 3.0 + r * 9.0 - uTime * 1.6) * 0.5 + 0.5;
  vec3 c1 = vec3(0.73, 0.65, 1.0);
  vec3 c2 = vec3(0.6, 0.87, 1.0);
  vec3 c3 = vec3(1.0, 0.8, 0.92);
  vec3 col = mix(c1, c2, sw);
  col = mix(col, c3, smoothstep(0.4, 1.0, sin(a * 2.0 - uTime * 0.7 + r * 4.0)) * 0.5);
  col += (1.0 - r) * 0.35;
  // scanning grid
  vec2 g = abs(fract(p * 6.0 + vec2(0.0, uTime * 0.6)) - 0.5);
  float grid = smoothstep(0.47, 0.5, max(g.x, g.y));
  float sweep = smoothstep(0.08, 0.0, abs(p.y - (fract(uTime * 0.5) * 2.4 - 1.2)));
  col += vec3(0.85, 0.8, 1.0) * (grid * 0.8 + sweep * 1.2) * uScan;
  float alpha = smoothstep(1.0, 0.92, r) * (0.55 + 0.35 * uScan + 0.2 * (1.0 - r));
  gl_FragColor = vec4(col, alpha);
}
`

const beamFrag = /* glsl */ `
uniform float uScan; uniform float uTime;
varying vec2 vUv;
void main(){
  float fade = pow(1.0 - vUv.y, 1.4);
  float stripes = 0.75 + 0.25 * sin(vUv.x * 60.0 + uTime * 3.0);
  gl_FragColor = vec4(vec3(0.78, 0.72, 1.0) * stripes, fade * 0.38 * uScan);
}
`

function Portal() {
  const swirl = useRef<THREE.ShaderMaterial>(null)
  const beam = useRef<THREE.ShaderMaterial>(null)
  const ring = useRef<THREE.Group>(null)
  const rings = useRef<THREE.Group>(null)
  const lights = useRef<THREE.MeshStandardMaterial[]>([])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uScan: { value: 0 } }), [])
  const beamUniforms = useMemo(() => ({ uTime: { value: 0 }, uScan: { value: 0 } }), [])

  useFrame((state, dt) => {
    const { scan, card } = aiPhase(S.t)
    const time = state.clock.elapsedTime
    uniforms.uTime.value = time
    uniforms.uScan.value = damp(uniforms.uScan.value, scan, 6, dt)
    beamUniforms.uTime.value = time
    beamUniforms.uScan.value = uniforms.uScan.value
    if (ring.current) {
      // the machine leans toward the card as it arrives, and breathes
      ring.current.rotation.y = damp(ring.current.rotation.y, -0.25 + card * 0.2 + S.pointer.x * 0.08, 3, dt)
      ring.current.rotation.x = damp(ring.current.rotation.x, -S.pointer.y * 0.05, 3, dt)
      ring.current.position.y = PORTAL.y + Math.sin(time * 1.1) * (S.reduced ? 0 : 0.05)
    }
    if (rings.current) {
      rings.current.children.forEach((c, i) => {
        c.rotation.z = time * (0.15 + i * 0.08) * (i % 2 ? -1 : 1)
        c.rotation.x = Math.PI / 2 + Math.sin(time * 0.4 + i) * 0.25
      })
    }
    lights.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = 1 + Math.sin(time * 3 + i * 1.6) * 0.4 + scan * 2
    })
  })

  const nodeColors = ['#98DFFF', '#FFE58F', '#B9F4D0', '#FFCCAD']
  return (
    <group>
      <group ref={ring} position={PORTAL.toArray()}>
        {/* body */}
        <mesh>
          <torusGeometry args={[1.55, 0.27, 40, 120]} />
          <meshPhysicalMaterial color="#FBFAFF" roughness={0.22} clearcoat={1} clearcoatRoughness={0.1} />
        </mesh>
        <mesh position={[0, 0, -0.06]}>
          <torusGeometry args={[1.31, 0.05, 16, 120]} />
          <meshStandardMaterial color="#B9A7FF" emissive="#9C86FF" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -0.12]}>
          <circleGeometry args={[1.34, 96]} />
          <shaderMaterial ref={swirl} vertexShader={swirlVert} fragmentShader={swirlFrag} uniforms={uniforms} transparent depthWrite={false} />
        </mesh>
        {/* glowing status nodes */}
        {nodeColors.map((c, i) => {
          const a = Math.PI / 4 + (i * Math.PI) / 2
          return (
            <mesh key={c} position={[Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0.26]}>
              <sphereGeometry args={[0.09, 20, 14]} />
              <meshStandardMaterial
                ref={(m) => void (m && (lights.current[i] = m))}
                color={c}
                emissive={c}
                emissiveIntensity={1.2}
                toneMapped={false}
              />
            </mesh>
          )
        })}
        {/* top antenna pill */}
        <RoundedBox args={[0.5, 0.18, 0.18]} radius={0.09} position={[0, 1.86, 0]}>
          <meshPhysicalMaterial color="#B9A7FF" roughness={0.25} clearcoat={1} />
        </RoundedBox>
        {/* volumetric beam toward the viewer */}
        <mesh position={[0, 0, 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.25, 1.3, 2.8, 48, 1, true]} />
          <shaderMaterial
            ref={beam}
            vertexShader={swirlVert}
            fragmentShader={beamFrag}
            uniforms={beamUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      {/* stand */}
      <mesh position={[PORTAL.x, -0.25, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 0.5, 24]} />
        <meshPhysicalMaterial color="#E9E5FF" roughness={0.3} clearcoat={0.6} />
      </mesh>
      <RoundedBox args={[1.6, 0.3, 1.0]} radius={0.15} smoothness={4} position={[PORTAL.x, -0.55, 0]}>
        <meshPhysicalMaterial color="#FBFAFF" roughness={0.25} clearcoat={1} />
      </RoundedBox>
      <mesh position={[PORTAL.x, -0.39, 0.42]}>
        <boxGeometry args={[0.9, 0.03, 0.04]} />
        <meshStandardMaterial color="#B9A7FF" emissive="#B9A7FF" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* soft purple orbit rings */}
      <group ref={rings} position={PORTAL.toArray()}>
        {[2.1, 2.45, 2.8].map((r, i) => (
          <mesh key={r}>
            <torusGeometry args={[r, 0.008 + i * 0.002, 6, 160]} />
            <meshBasicMaterial color="#B9A7FF" transparent opacity={0.55 - i * 0.12} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */

function ImageCard() {
  const kind = useUI((s) => s.aiPreset)
  const g = useRef<THREE.Group>(null)
  const tex = useMemo(() => getIllustration(kind).texture, [kind])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    if (!g.current) return
    const { card } = aiPhase(S.t)
    const time = state.clock.elapsedTime
    const idle = S.reduced ? 0 : 1
    const k1 = easeInOut(clamp(card / 0.6))
    const k2 = easeIn(clamp((card - 0.6) / 0.4))
    tmp.copy(CARD_A).lerp(CARD_B, k1).lerp(PORTAL, k2)
    tmp.y += Math.sin(time * 1.3) * 0.08 * idle * (1 - card)
    g.current.position.copy(tmp)
    const tiltX = -S.pointer.y * 0.12 * (1 - card)
    const tiltY = S.pointer.x * 0.18 * (1 - card)
    g.current.rotation.set(lerp(0, -0.35, k1) + k2 * 0.4 + tiltX, lerp(0.42, -0.1, k1) - k2 * 1.2 + tiltY, lerp(-0.07, 0.12, k1) + k2 * 0.5)
    const s = lerp(1, 0.82, k1) * (1 - k2 * 0.88)
    g.current.scale.setScalar(Math.max(0.001, s))
    g.current.visible = card < 0.995
    void dt
  })

  return (
    <group ref={g}>
      <RoundedBox args={[1.55, 1.95, 0.06]} radius={0.1} smoothness={4}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.3} clearcoat={1} />
      </RoundedBox>
      <mesh position={[0, 0.06, 0.035]}>
        <planeGeometry args={[1.4, 1.75]} />
        <meshBasicMaterial map={tex} toneMapped={false} transparent />
      </mesh>
      {/* tiny "PNG" tag */}
      <RoundedBox args={[0.42, 0.16, 0.04]} radius={0.06} position={[-0.48, -0.86, 0.06]}>
        <meshStandardMaterial color="#202027" />
      </RoundedBox>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Scan pixels + geometric fragments                                   */

const PIXELS = 110
function ScanPixels() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    const m = mesh.current
    if (!m) return
    const palette = ['#B9A7FF', '#98DFFF', '#FFE58F', '#FFCCAD', '#B9F4D0', '#FFFFFF'].map((c) => new THREE.Color(c))
    for (let i = 0; i < PIXELS; i++) m.setColorAt(i, palette[i % palette.length])
    m.instanceColor!.needsUpdate = true
  }, [])
  useFrame((state) => {
    const m = mesh.current
    if (!m) return
    const { scan, emerge } = aiPhase(S.t)
    const time = state.clock.elapsedTime
    const burst = bell(emerge)
    const vis = Math.max(scan, burst * 0.8)
    m.visible = vis > 0.01
    if (!m.visible) return
    for (let i = 0; i < PIXELS; i++) {
      const a = rand(i) * Math.PI * 2 + time * (0.6 + rand(i + 9) * 0.8)
      const r = (0.35 + rand(i + 3) * 1.25) * (1 - scan * 0.35) + burst * 1.2
      const z = (rand(i + 5) - 0.2) * 1.8 * scan + burst * 1.4
      dummy.position.set(PORTAL.x + Math.cos(a) * r, PORTAL.y + Math.sin(a) * r, z)
      dummy.rotation.set(time + i, time * 0.7 + i, 0)
      dummy.scale.setScalar((0.035 + rand(i + 7) * 0.05) * vis)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, PIXELS]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial emissive="#ffffff" emissiveIntensity={0.35} roughness={0.4} toneMapped={false} />
    </instancedMesh>
  )
}

/** Holographic geometric decorations + floating image tiles */
function HoloDecor() {
  const g = useRef<THREE.Group>(null)
  const tiles = useMemo(
    () =>
      (['robot', 'creature', 'bear'] as FigureKind[]).map((k, i) => ({
        tex: getIllustration(k).texture,
        p: [[-3.6, 2.9, -2.2], [4.7, 2.9, -1.8], [-2.6, -0.2, -2.6]][i] as [number, number, number],
        r: [0.25, -0.35, 0.18][i],
      })),
    [],
  )
  useFrame((state) => {
    if (!g.current) return
    const time = state.clock.elapsedTime
    g.current.children.forEach((c, i) => {
      c.position.y = (c.userData.y ?? (c.userData.y = c.position.y)) + Math.sin(time * 0.8 + i * 1.7) * (S.reduced ? 0 : 0.12)
      if (c.userData.spin) c.rotation.set(time * 0.3 + i, time * 0.4, 0)
    })
  })
  return (
    <group ref={g}>
      {tiles.map((t, i) => (
        <mesh key={i} position={t.p} rotation={[0, t.r, 0.05]}>
          <planeGeometry args={[0.85, 1.06]} />
          <meshBasicMaterial map={t.tex} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      ))}
      {[
        { p: [-0.6, 3.1, -0.5], geo: 'ico', c: '#9C86FF', s: 0.28 },
        { p: [3.9, 0.3, 0.6], geo: 'oct', c: '#7CC7FF', s: 0.24 },
        { p: [-2.3, 0.6, 0.4], geo: 'tet', c: '#FF9DB4', s: 0.2 },
        { p: [3.4, 3.4, 0.2], geo: 'ico', c: '#7FE3C0', s: 0.18 },
      ].map((d, i) => (
        <mesh key={i} position={d.p as [number, number, number]} userData={{ spin: true }} scale={d.s}>
          {d.geo === 'ico' ? <icosahedronGeometry args={[1, 0]} /> : d.geo === 'oct' ? <octahedronGeometry args={[1, 0]} /> : <tetrahedronGeometry args={[1, 0]} />}
          <meshBasicMaterial color={d.c} wireframe transparent opacity={0.85} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */

function GeneratedCharacter() {
  const kind = useUI((s) => s.aiPreset)
  const g = useRef<THREE.Group>(null)
  const yaw = useRef(0)
  const pop = useRef(1)
  const prevKind = useRef(kind)

  useFrame((state, dt) => {
    if (!g.current) return
    const { emerge, shatter } = aiPhase(S.t)
    const time = state.clock.elapsedTime
    if (prevKind.current !== kind) {
      prevKind.current = kind
      pop.current = 0
    }
    pop.current = damp(pop.current, 1, 6, dt)

    const e = easeOutBack(emerge, 1.4)
    const p = new THREE.Vector3().copy(PORTAL).lerp(AI_CHAR, easeOut(emerge))
    p.y += Math.sin(time * 1.2) * (S.reduced ? 0 : 0.06) * emerge
    g.current.position.copy(p)
    // bottom-anchored model: lift so the pivot is the model's middle while it emerges
    const h = FIGURE_HEIGHT[kind]
    g.current.position.y -= (1 - emerge) * h * 0.4 * AI_CHAR_SCALE

    yaw.current = damp(yaw.current, S.drag[0] + S.pointer.x * 0.35, 6, dt)
    const spin = (1 - emerge) * Math.PI * 2
    const idle = S.reduced ? 0 : Math.sin(time * 0.5) * 0.25
    g.current.rotation.set(-S.pointer.y * 0.08, yaw.current + spin + idle, 0)

    const zoom = THREE.MathUtils.clamp(S.aiZoom, 0.7, 1.45)
    const shrink = 1 - easeOut(clamp(shatter * 3.2))
    const s = Math.max(0.0001, e * AI_CHAR_SCALE * zoom * shrink * pop.current)
    g.current.scale.setScalar(s)
    g.current.visible = s > 0.002
  })
  return <Figure ref={g} kind={kind} />
}

/** Sparkles orbiting the generated model */
function OrbitSparkles() {
  const g = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!g.current) return
    const { emerge, shatter } = aiPhase(S.t)
    g.current.rotation.y = state.clock.elapsedTime * 0.5
    const s = emerge * (1 - shatter)
    g.current.scale.setScalar(Math.max(0.001, s))
    g.current.visible = s > 0.01
  })
  return (
    <group ref={g} position={[AI_CHAR.x, AI_CHAR.y + 1.1, AI_CHAR.z]}>
      <Sparkles count={S.mobile ? 24 : 46} scale={[3, 2.6, 3]} size={4} speed={0.5} color="#B9A7FF" />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 1.5, Math.sin(a * 2) * 0.5, Math.sin(a) * 1.5]} rotation={[a, a, 0]} scale={0.09}>
            {i % 2 ? <octahedronGeometry args={[1, 0]} /> : <torusGeometry args={[1, 0.4, 8, 20]} />}
            <meshPhysicalMaterial color={['#FFE58F', '#98DFFF', '#FFCCAD', '#B9F4D0', '#B9A7FF'][i]} roughness={0.2} clearcoat={1} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Confetti shards bursting from the character during transition A */
const SHARDS = 30
function ShatterShards() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    const m = mesh.current
    if (!m) return
    const pal = ['#7FE3C0', '#FFD166', '#FF8F7A', '#98DFFF', '#B9A7FF', '#FFFFFF'].map((c) => new THREE.Color(c))
    for (let i = 0; i < SHARDS; i++) m.setColorAt(i, pal[i % pal.length])
    m.instanceColor!.needsUpdate = true
  }, [])
  useFrame((state) => {
    const m = mesh.current
    if (!m) return
    const { shatter } = aiPhase(S.t)
    m.visible = shatter > 0.01 && shatter < 0.99
    if (!m.visible) return
    const time = state.clock.elapsedTime
    const k = easeOut(shatter)
    for (let i = 0; i < SHARDS; i++) {
      const a = rand(i) * Math.PI * 2 + k * (2 + rand(i + 1) * 3)
      const r = bell(shatter) * (1.5 + rand(i + 2) * 3.5)
      dummy.position.set(
        AI_CHAR.x * (1 - k) + Math.cos(a) * r,
        lerp(AI_CHAR.y + 1, WORLD_Y[1] + 1.5, easeInOut(shatter)) + Math.sin(a * 1.3) * r * 0.5,
        AI_CHAR.z + Math.sin(a) * r,
      )
      dummy.rotation.set(time * 2 + i, time + i, 0)
      dummy.scale.setScalar((0.08 + rand(i + 4) * 0.12) * bell(shatter))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, SHARDS]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshPhysicalMaterial roughness={0.25} clearcoat={1} flatShading />
    </instancedMesh>
  )
}

export function AIStudioWorld() {
  const root = useRef<THREE.Group>(null)
  const replay = useUI((s) => s.aiReplay)
  useWorldVisibility(0, root, 20)

  // preset change / replay → short generation animation
  useEffect(() => {
    if (replay === 0) return
    const tw = gsap.fromTo(S.aiDemo, { t: 0 }, { t: 1, duration: S.reduced ? 0.6 : 2.6, ease: 'none' })
    return () => {
      tw.kill()
      S.aiDemo.t = 1
    }
  }, [replay])

  return (
    <group ref={root} position={[0, WORLD_Y[0], 0]}>
      <Portal />
      <ImageCard />
      <ScanPixels />
      <GeneratedCharacter />
      <OrbitSparkles />
      <HoloDecor />
      <ShatterShards />
      <Sparkles count={S.mobile ? 20 : 40} scale={[12, 6, 6]} position={[0.5, 1.5, -1]} size={2.5} speed={0.25} color="#ffffff" opacity={0.8} />
    </group>
  )
}
