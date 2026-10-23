import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { THEMES } from '../config/content'
import { S } from '../state/scene'
import { WORLD_Y } from '../state/timeline'
import { clamp, damp } from '../lib/math'

const themeColors = THEMES.map((t) => ({
  top: new THREE.Color(t.top),
  bottom: new THREE.Color(t.bottom),
  accent: new THREE.Color(t.accent),
  key: new THREE.Color(t.key),
  rim: new THREE.Color(t.rim),
}))

/** Continuous theme index (0..4) from the camera's vertical position. */
export function themeIndex() {
  const y = -S.focusY
  return clamp(y / -WORLD_Y[1], 0, 4)
}

const tmp = { a: new THREE.Color(), b: new THREE.Color() }
export function themeColor(key: 'top' | 'bottom' | 'accent' | 'key' | 'rim', out: THREE.Color) {
  const ti = themeIndex()
  const i = Math.floor(ti)
  const j = Math.min(4, i + 1)
  const k = THREE.MathUtils.smoothstep(ti - i, 0.15, 0.85)
  tmp.a.copy(themeColors[i][key])
  tmp.b.copy(themeColors[j][key])
  return out.copy(tmp.a).lerp(tmp.b, k)
}

const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`
const frag = /* glsl */ `
uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uAccent; uniform float uTime; uniform vec2 uRes;
varying vec2 vUv;
float blob(vec2 p, vec2 c, float r) { return smoothstep(r, 0.0, length(p - c)); }
void main() {
  vec2 p = vUv; p.x *= uRes.x / uRes.y;
  vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));
  float t = uTime * 0.05;
  float ax = uRes.x / uRes.y;
  col = mix(col, uAccent, 0.35 * blob(p, vec2(ax * (0.78 + 0.06 * sin(t * 3.0)), 0.62 + 0.05 * cos(t * 2.0)), 0.75));
  col = mix(col, vec3(1.0), 0.45 * blob(p, vec2(ax * (0.2 + 0.05 * cos(t * 2.5)), 0.85), 0.6));
  col = mix(col, uAccent * 0.9 + 0.1, 0.18 * blob(p, vec2(ax * 0.35, 0.08 + 0.04 * sin(t * 4.0)), 0.7));
  // subtle grain to avoid banding
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}
`

export function Background() {
  const size = useThree((s) => s.size)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useMemo(() => camera.layers.enable(1), [camera])
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uAccent: { value: new THREE.Color() },
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
    }),
    [],
  )
  const fogColor = useRef(new THREE.Color())
  useMemo(() => {
    scene.fog = new THREE.Fog('#ffffff', 16, 34)
  }, [scene])

  useFrame((state) => {
    themeColor('top', uniforms.uTop.value)
    themeColor('bottom', uniforms.uBottom.value)
    themeColor('accent', uniforms.uAccent.value)
    // marketplace: tint toward the selected product's accent
    const mk = clamp(1 - Math.abs(themeIndex() - 2) * 1.5)
    if (mk > 0) uniforms.uAccent.value.lerp(S.productAccent, mk * 0.6)
    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uRes.value.set(size.width, size.height)
    fogColor.current.copy(uniforms.uTop.value).lerp(uniforms.uBottom.value, 0.5)
    ;(scene.fog as THREE.Fog).color.copy(fogColor.current)
  })

  // layer 1: seen by the main camera only, so the contact-shadow pass ignores it
  return (
    <mesh frustumCulled={false} renderOrder={-1000} layers={1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial vertexShader={vert} fragmentShader={frag} uniforms={uniforms} depthWrite={false} depthTest={false} fog={false} />
    </mesh>
  )
}

export function WorldLighting() {
  const hemi = useRef<THREE.HemisphereLight>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const rim = useRef<THREE.DirectionalLight>(null)
  const accent = useRef<THREE.PointLight>(null)
  const c = useMemo(() => new THREE.Color(), [])

  useFrame((_, dt) => {
    const y = S.focusY
    if (hemi.current) {
      themeColor('top', hemi.current.color)
      themeColor('bottom', hemi.current.groundColor)
    }
    if (key.current) {
      themeColor('key', key.current.color)
      key.current.position.set(5, y + 9, 7)
      key.current.target.position.set(0, y, 0)
      key.current.target.updateMatrixWorld()
    }
    if (rim.current) {
      themeColor('rim', rim.current.color)
      rim.current.position.set(-6, y + 4, -6)
      rim.current.target.position.set(0, y, 0)
      rim.current.target.updateMatrixWorld()
    }
    if (accent.current) {
      themeColor('accent', c)
      const mk = clamp(1 - Math.abs(themeIndex() - 2) * 1.5)
      if (mk > 0) c.lerp(S.productAccent, mk)
      accent.current.color.lerp(c, 1 - Math.exp(-4 * dt))
      accent.current.position.set(-3, y + 2.5, 4)
    }
  })

  return (
    <>
      <hemisphereLight ref={hemi} intensity={0.9} />
      <directionalLight ref={key} intensity={2.1} />
      <directionalLight ref={rim} intensity={1.6} />
      <pointLight ref={accent} intensity={14} distance={14} decay={1.6} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#ffffff" position={[0, 6, 4]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#d7ccff" position={[-6, 2, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#c8f7e4" position={[6, 1, -2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="ring" intensity={1.6} color="#ffe0c2" position={[2, 3, 6]} scale={2.5} />
        <Lightformer form="rect" intensity={0.6} color="#ffffff" position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
      </Environment>
    </>
  )
}

/** Damped value helper for colour/number lerping outside React */
export const dampTo = damp
