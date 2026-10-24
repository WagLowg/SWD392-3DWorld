import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { S } from '../../state/scene'
import { T, WORLD_Y } from '../../state/timeline'
import { easeOut, range } from '../../lib/math'
import { Figure } from '../figures'
import { createPrintMaterial, MaterialScope } from '../materials'
import { useWorldVisibility } from '../Interaction'

/** The 3DWorld brand mark: a glossy little planet with a ring and an orbiting cube */
export function BrandMark() {
  const cube = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (cube.current) {
      cube.current.position.set(Math.cos(t * 0.8) * 1.75, Math.sin(t * 0.8) * 0.45, Math.sin(t * 0.8) * 1.75 * 0.4)
      cube.current.rotation.set(t, t * 1.3, 0)
    }
    if (ring.current) ring.current.rotation.z = -0.35 + Math.sin(t * 0.4) * 0.05
  })
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 64, 48]} />
        <meshPhysicalMaterial color="#9C86FF" roughness={0.12} clearcoat={1} iridescence={0.6} iridescenceIOR={1.4} sheen={0.4} sheenColor="#98DFFF" />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2.3, 0, -0.35]}>
        <torusGeometry args={[1.55, 0.09, 24, 120]} />
        <meshPhysicalMaterial color="#202027" roughness={0.2} clearcoat={1} />
      </mesh>
      <RoundedBox ref={cube} args={[0.34, 0.34, 0.34]} radius={0.07}>
        <meshPhysicalMaterial color="#FFE58F" roughness={0.2} clearcoat={1} />
      </RoundedBox>
    </group>
  )
}

function PrimitiveStack() {
  return (
    <group>
      <RoundedBox args={[0.9, 0.7, 0.9]} radius={0.16} position={[0, 0.35, 0]}>
        <meshPhysicalMaterial color="#7FE3C0" roughness={0.3} clearcoat={1} />
      </RoundedBox>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.4, 32, 24]} />
        <meshPhysicalMaterial color="#FFD166" roughness={0.3} clearcoat={1} />
      </mesh>
      <mesh position={[0, 1.65, 0]}>
        <coneGeometry args={[0.28, 0.5, 32]} />
        <meshPhysicalMaterial color="#FF8F7A" roughness={0.3} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.07, 12, 40]} />
        <meshPhysicalMaterial color="#98DFFF" roughness={0.3} clearcoat={1} />
      </mesh>
    </group>
  )
}

export function FinaleWorld() {
  const root = useRef<THREE.Group>(null)
  const orbit = useRef<THREE.Group>(null)
  const printMat = useMemo(() => createPrintMaterial('#FF8A70'), [])
  useWorldVisibility(4, root, 20)
  useEffect(() => () => printMat.dispose(), [printMat])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const enter = easeOut(range(S.t, [T.fin[0] + 0.2, T.fin[1]]))
    if (orbit.current) {
      orbit.current.rotation.y = t * (S.reduced ? 0.05 : 0.22)
      orbit.current.children.forEach((c, i) => {
        const a = (i / 4) * Math.PI * 2
        const r = 3.4 * enter + 0.5
        c.position.set(Math.cos(a) * r, Math.sin(t * 0.9 + i * 1.5) * 0.25 - 0.9, Math.sin(a) * r)
        // keep each object facing the viewer as it orbits
        c.rotation.y = -orbit.current!.rotation.y + Math.sin(t * 0.5 + i) * 0.5
        c.scale.setScalar(Math.max(0.001, 0.55 * enter))
      })
    }
  })

  return (
    <group ref={root} position={[0, WORLD_Y[4], 0]}>
      <group position={[0, 0.6, 0]}>
        <BrandMark />
      </group>
      <group ref={orbit} position={[0, 0.4, 0]}>
        <Figure kind="bear" />
        <PrimitiveStack />
        <Figure kind="dragon" />
        <group>
          <MaterialScope shared={printMat}>
            <Figure kind="mushroom" />
          </MaterialScope>
        </group>
      </group>
      <Sparkles count={S.mobile ? 24 : 50} scale={[10, 5, 6]} size={3} speed={0.3} color="#B9A7FF" />
    </group>
  )
}
