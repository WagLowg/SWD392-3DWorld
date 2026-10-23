import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { Suspense, useState } from 'react'
import * as THREE from 'three'
import { CameraRig } from './CameraRig'
import { Background, WorldLighting } from './WorldLighting'
import { CanvasDrag, SharedShadow } from './Interaction'
import { AIStudioWorld } from './worlds/AIStudioWorld'
import { ThreeDStudioWorld } from './worlds/ThreeDStudioWorld'
import { MarketplaceWorld } from './worlds/MarketplaceWorld'
import { OrderPrintWorld } from './worlds/OrderPrintWorld'
import { FinaleWorld } from './worlds/FinaleWorld'
import { S } from '../state/scene'
import { useUI } from '../state/store'

/**
 * The single persistent WebGL canvas behind the whole landing page.
 * All four worlds live in one scene, stacked vertically; the camera travels between them.
 */
export default function ExperienceCanvas({ onContextLost }: { onContextLost: (lost: boolean) => void }) {
  const [dpr, setDpr] = useState<number>(Math.min(window.devicePixelRatio, S.mobile ? 1.5 : 1.75))
  const setReady = useUI((s) => s.setReady)

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
      dpr={dpr}
      camera={{ fov: 32, near: 0.1, far: 80, position: [0, 2, 10] }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true
        // contact-shadow render targets must clear to transparent
        gl.setClearColor('#000000', 0)
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.outputColorSpace = THREE.SRGBColorSpace
        const el = gl.domElement
        el.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          onContextLost(true)
        })
        el.addEventListener('webglcontextrestored', () => onContextLost(false))
        // let the first frames compile shaders before revealing
        requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)))
      }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(S.mobile ? 1.5 : 1.75, d + 0.25))}
        flipflops={3}
      />
      <AdaptiveDpr pixelated={false} />
      <Background />
      <WorldLighting />
      <CameraRig />
      <CanvasDrag />
      <Suspense fallback={null}>
        <AIStudioWorld />
        <ThreeDStudioWorld />
        <MarketplaceWorld />
        <OrderPrintWorld />
        <FinaleWorld />
        <SharedShadow />
      </Suspense>
    </Canvas>
  )
}
