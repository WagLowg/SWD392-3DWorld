import { createContext, useContext, useMemo } from 'react'
import * as THREE from 'three'

/**
 * Figures are written once and rendered in several "variants":
 *  - toy:   premium satin / glossy toy materials (default)
 *  - shared: every mesh uses one supplied material (wireframe, FDM print, …)
 */
type MatCtx = { shared: THREE.Material | null; gloss: number }
const Ctx = createContext<MatCtx>({ shared: null, gloss: 0 })

export function MaterialScope({
  shared = null,
  gloss = 0,
  children,
}: {
  shared?: THREE.Material | null
  gloss?: number
  children: React.ReactNode
}) {
  const v = useMemo(() => ({ shared, gloss }), [shared, gloss])
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}

type MProps = {
  c: string
  /** satin (default), gloss, glass, emissive, metal */
  k?: 'satin' | 'gloss' | 'glass' | 'emissive' | 'metal' | 'soft'
  e?: number
  opacity?: number
}

export function M({ c, k = 'satin', e = 1.4, opacity }: MProps) {
  const { shared, gloss } = useContext(Ctx)
  if (shared) {
    // glass shells (helmets, wings) are not printed / meshed
    if (k === 'glass') return <meshBasicMaterial visible={false} />
    return <primitive object={shared} attach="material" />
  }
  switch (k) {
    case 'gloss':
      return <meshPhysicalMaterial color={c} roughness={0.18} clearcoat={1} clearcoatRoughness={0.08} />
    case 'glass':
      return (
        <meshPhysicalMaterial
          color={c}
          roughness={0.05}
          metalness={0}
          clearcoat={1}
          transparent
          opacity={opacity ?? 0.22}
          depthWrite={false}
          side={THREE.DoubleSide}
          envMapIntensity={1.6}
        />
      )
    case 'emissive':
      return <meshStandardMaterial color={c} emissive={c} emissiveIntensity={e} toneMapped={false} />
    case 'metal':
      return <meshPhysicalMaterial color={c} roughness={0.28} metalness={0.65} clearcoat={0.4} />
    case 'soft':
      return <meshPhysicalMaterial color={c} roughness={0.85} sheen={1} sheenColor="#ffffff" sheenRoughness={0.6} />
    default:
      return (
        <meshPhysicalMaterial
          color={c}
          roughness={0.42 - gloss * 0.3}
          clearcoat={0.35 + gloss * 0.65}
          clearcoatRoughness={0.25 - gloss * 0.18}
        />
      )
  }
}

/* ------------------------------------------------------------------------ */
/* FDM print material: single filament colour, layer lines, hot top layer     */
/* ------------------------------------------------------------------------ */

export type PrintMaterial = THREE.MeshPhysicalMaterial & {
  userData: { uniforms: { uClipY: { value: number }; uGlow: { value: number }; uLayer: { value: number } } }
}

export function createPrintMaterial(color: string, clipBelow = true): PrintMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.5,
    clearcoat: 0.15,
    side: THREE.DoubleSide,
  }) as PrintMaterial
  const uniforms = {
    uClipY: { value: 999 },
    uGlow: { value: 0 },
    uLayer: { value: 0.035 },
  }
  mat.userData.uniforms = uniforms
  // keep geometry below the current layer (or above, for the ghost preview)
  mat.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, clipBelow ? -1 : 1, 0), 999)]
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vWPos;\nuniform float uClipY;\nuniform float uGlow;\nuniform float uLayer;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float lp = fract(vWPos.y / uLayer);
        float ridge = smoothstep(0.0, 0.18, lp) * smoothstep(1.0, 0.82, lp);
        float fw = fwidth(vWPos.y / uLayer);
        ridge = mix(ridge, 0.75, clamp(fw * 1.5, 0.0, 1.0));
        diffuseColor.rgb *= 0.86 + 0.14 * ridge;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float hot = smoothstep(0.09, 0.0, abs(uClipY - vWPos.y)) * uGlow;
        totalEmissiveRadiance += vec3(1.0, 0.55, 0.2) * hot * 1.6;`,
      )
  }
  mat.customProgramCacheKey = () => 'fdm-print'
  return mat
}

export function setPrintClip(mat: PrintMaterial, y: number, glow: number) {
  const plane = mat.clippingPlanes![0]
  plane.constant = plane.normal.y < 0 ? y : -y
  mat.userData.uniforms.uClipY.value = y
  mat.userData.uniforms.uGlow.value = glow
}

export function createWireMaterial(color = '#8E7BFF') {
  return new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    toneMapped: false,
  })
}
