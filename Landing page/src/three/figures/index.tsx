import { forwardRef, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { M } from '../materials'
import type { FigureKind } from '../../config/content'
import { S } from '../../state/scene'

/** Approximate heights, used for printing (layer clipping) and framing. */
export const FIGURE_HEIGHT: Record<FigureKind, number> = {
  robot: 2.72,
  bear: 2.62,
  dragon: 2.45,
  creature: 2.1,
  knight: 2.55,
  mushroom: 2.1,
}

const INK = '#23222B'

function Eye({ p, r = 0.085 }: { p: [number, number, number]; r?: number }) {
  return (
    <group position={p}>
      <mesh>
        <sphereGeometry args={[r, 24, 16]} />
        <M c={INK} k="gloss" />
      </mesh>
      <mesh position={[r * 0.35, r * 0.4, r * 0.75]}>
        <sphereGeometry args={[r * 0.3, 12, 8]} />
        <M c="#ffffff" k="emissive" e={0.6} />
      </mesh>
    </group>
  )
}

function Cheek({ p }: { p: [number, number, number] }) {
  return (
    <mesh position={p} scale={[1, 0.6, 0.35]}>
      <sphereGeometry args={[0.09, 16, 12]} />
      <M c="#FF9DB4" k="soft" />
    </mesh>
  )
}

/* ------------------------------- BOLT ----------------------------------- */
export function Robot() {
  return (
    <group>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.52, 0.56, 0.34, 40]} />
        <M c="#FFD166" />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.045, 12, 48]} />
        <M c="#F4B740" k="gloss" />
      </mesh>
      <RoundedBox args={[1.08, 0.98, 0.82]} radius={0.22} smoothness={4} position={[0, 0.86, 0]}>
        <M c="#7FE3C0" />
      </RoundedBox>
      {/* chest panel */}
      <RoundedBox args={[0.55, 0.36, 0.08]} radius={0.06} position={[0, 0.88, 0.42]}>
        <M c="#FFFFFF" k="gloss" />
      </RoundedBox>
      {[-0.14, 0, 0.14].map((x, i) => (
        <mesh key={i} position={[x, 0.88, 0.47]}>
          <sphereGeometry args={[0.045, 12, 8]} />
          <M c={['#FF8F7A', '#FFD166', '#7955FF'][i]} k="emissive" e={1.2} />
        </mesh>
      ))}
      {/* arms */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0.7 * s, 0.98, 0]} rotation={[0, 0, 0.18 * s]}>
          <RoundedBox args={[0.24, 0.6, 0.3]} radius={0.1} position={[0, -0.18, 0]}>
            <M c="#98DFFF" />
          </RoundedBox>
          <mesh position={[0, -0.55, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.1, 0.04, 10, 24, Math.PI * 1.4]} />
            <M c="#FFFFFF" k="gloss" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.27, 0.09, 16, 40]} />
        <M c="#FF8F7A" k="gloss" />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.92, 0]}>
        <sphereGeometry args={[0.52, 48, 32]} />
        <M c="#FBFAFF" k="gloss" />
      </mesh>
      <mesh position={[0, 1.92, 0.22]} scale={[0.86, 0.6, 0.62]}>
        <sphereGeometry args={[0.5, 40, 24]} />
        <M c={INK} k="gloss" />
      </mesh>
      {[-0.15, 0.15].map((x) => (
        <mesh key={x} position={[x, 1.95, 0.53]} scale={[1, 1.35, 0.5]}>
          <sphereGeometry args={[0.065, 16, 12]} />
          <M c="#7FFFD4" k="emissive" e={2} />
        </mesh>
      ))}
      <mesh position={[0, 1.83, 0.54]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.06, 0.016, 8, 16, Math.PI]} />
        <M c="#7FFFD4" k="emissive" e={2} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.52 * s, 1.92, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.13, 0.14, 24]} />
          <M c="#FF8F7A" />
        </mesh>
      ))}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.24, 8]} />
        <M c="#9AA0B5" k="metal" />
      </mesh>
      <mesh position={[0, 2.64, 0]}>
        <sphereGeometry args={[0.085, 16, 12]} />
        <M c="#FF9A52" k="emissive" e={1.6} />
      </mesh>
    </group>
  )
}

/* ------------------------------ ASTRO BEAR ------------------------------ */
export function Bear() {
  const fur = '#C98B5B'
  const suit = '#F5F3FF'
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.3 * s, 0.14, 0.06]} scale={[1, 0.62, 1.25]}>
          <sphereGeometry args={[0.24, 24, 16]} />
          <M c="#8C7BFF" />
        </mesh>
      ))}
      <mesh position={[0, 0.78, 0]} scale={[1, 1.05, 0.9]}>
        <sphereGeometry args={[0.62, 40, 28]} />
        <M c={suit} />
      </mesh>
      <RoundedBox args={[0.5, 0.36, 0.12]} radius={0.06} position={[0, 0.82, 0.52]} rotation={[-0.1, 0, 0]}>
        <M c="#B9A7FF" k="gloss" />
      </RoundedBox>
      {['#FF8F7A', '#FFD166', '#7FE3C0'].map((c, i) => (
        <mesh key={c} position={[-0.13 + i * 0.13, 0.84, 0.59]}>
          <sphereGeometry args={[0.04, 12, 8]} />
          <M c={c} k="emissive" e={1} />
        </mesh>
      ))}
      {/* backpack */}
      <RoundedBox args={[0.72, 0.8, 0.32]} radius={0.12} position={[0, 0.92, -0.55]}>
        <M c="#B9A7FF" />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <group key={s} position={[0.6 * s, 0.98, 0.05]} rotation={[0, 0, 0.75 * s]}>
          <mesh position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.15, 0.32, 8, 16]} />
            <M c={suit} />
          </mesh>
          <mesh position={[0, -0.46, 0]}>
            <sphereGeometry args={[0.15, 20, 14]} />
            <M c={fur} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.33, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.46, 0.09, 16, 48]} />
        <M c="#8C7BFF" k="gloss" />
      </mesh>
      {/* head */}
      <group position={[0, 1.8, 0]}>
        <mesh>
          <sphereGeometry args={[0.55, 48, 32]} />
          <M c={fur} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[0.4 * s, 0.4, 0]}>
            <mesh>
              <sphereGeometry args={[0.18, 24, 16]} />
              <M c={fur} />
            </mesh>
            <mesh position={[0, 0, 0.1]} scale={[1, 1, 0.4]}>
              <sphereGeometry args={[0.1, 16, 12]} />
              <M c="#F7B7A3" k="soft" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.14, 0.44]} scale={[1.25, 0.9, 0.75]}>
          <sphereGeometry args={[0.22, 32, 20]} />
          <M c="#F3DCC3" k="soft" />
        </mesh>
        <mesh position={[0, -0.06, 0.62]} scale={[1.3, 0.9, 0.8]}>
          <sphereGeometry args={[0.07, 16, 12]} />
          <M c={INK} k="gloss" />
        </mesh>
        <Eye p={[-0.2, 0.08, 0.47]} />
        <Eye p={[0.2, 0.08, 0.47]} />
        <Cheek p={[-0.33, -0.08, 0.42]} />
        <Cheek p={[0.33, -0.08, 0.42]} />
      </group>
      {/* helmet */}
      <mesh position={[0, 1.82, 0]}>
        <sphereGeometry args={[0.8, 48, 32]} />
        <M c="#DCEBFF" k="glass" opacity={0.2} />
      </mesh>
      <mesh position={[0.35, 2.3, 0.45]} rotation={[0, 0, -0.6]} scale={[1, 0.4, 0.2]}>
        <sphereGeometry args={[0.16, 16, 12]} />
        <M c="#ffffff" k="emissive" e={0.5} />
      </mesh>
    </group>
  )
}

/* ------------------------------ MOCHI SPRITE ---------------------------- */
export function Creature() {
  const body = '#BDE7FF'
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.32 * s, 0.13, 0.15]} scale={[1, 0.65, 1.2]}>
          <sphereGeometry args={[0.2, 20, 14]} />
          <M c="#9CD7FF" k="soft" />
        </mesh>
      ))}
      <mesh position={[0, 0.9, 0]} scale={[1, 0.94, 0.95]}>
        <sphereGeometry args={[0.85, 56, 40]} />
        <M c={body} k="soft" />
      </mesh>
      <mesh position={[0, 0.72, 0.5]} scale={[1, 1, 0.55]}>
        <sphereGeometry args={[0.52, 40, 28]} />
        <M c="#FFFFFF" k="soft" />
      </mesh>
      {/* horns */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.36 * s, 1.68, 0.05]} rotation={[0.1, 0, -0.35 * s]}>
          <coneGeometry args={[0.12, 0.42, 24]} />
          <M c="#FFE58F" k="gloss" />
        </mesh>
      ))}
      {/* wings */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.62 * s, 1.15, -0.5]} rotation={[0.3, 0.7 * s, 0.6 * s]} scale={[0.12, 0.62, 0.42]}>
          <sphereGeometry args={[1, 32, 20]} />
          <M c="#D9CCFF" k="glass" opacity={0.55} />
        </mesh>
      ))}
      {/* little arms */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.8 * s, 0.75, 0.15]} rotation={[0, 0, 0.9 * s]}>
          <capsuleGeometry args={[0.11, 0.2, 6, 12]} />
          <M c={body} k="soft" />
        </mesh>
      ))}
      <Eye p={[-0.28, 1.12, 0.74]} r={0.12} />
      <Eye p={[0.28, 1.12, 0.74]} r={0.12} />
      <Cheek p={[-0.47, 0.95, 0.66]} />
      <Cheek p={[0.47, 0.95, 0.66]} />
      <mesh position={[0, 0.98, 0.8]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.07, 0.022, 8, 20, Math.PI]} />
        <M c={INK} />
      </mesh>
      <mesh position={[0, 0.55, -0.82]}>
        <sphereGeometry args={[0.16, 20, 14]} />
        <M c="#FFFFFF" k="soft" />
      </mesh>
    </group>
  )
}

/* ------------------------------ PIXEL KNIGHT ---------------------------- */
export function Knight() {
  return (
    <group>
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.3, 0.46, 0.4]} radius={0.1} position={[0.22 * s, 0.23, 0.02]}>
          <M c="#3A3A46" />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.92, 0.82, 0.62]} radius={0.2} position={[0, 0.86, 0]}>
        <M c="#5B7CFA" />
      </RoundedBox>
      <RoundedBox args={[0.96, 0.14, 0.66]} radius={0.06} position={[0, 0.58, 0]}>
        <M c="#FFD166" k="gloss" />
      </RoundedBox>
      <mesh position={[0, 0.94, 0.32]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.16, 0.16, 0.04]} />
        <M c="#FFD166" k="emissive" e={0.7} />
      </mesh>
      {/* helmet */}
      <RoundedBox args={[0.86, 0.8, 0.8]} radius={0.26} smoothness={4} position={[0, 1.7, 0]}>
        <M c="#DCE3EE" k="metal" />
      </RoundedBox>
      <RoundedBox args={[0.62, 0.16, 0.1]} radius={0.05} position={[0, 1.72, 0.39]}>
        <M c={INK} k="gloss" />
      </RoundedBox>
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, 1.72, 0.45]}>
          <boxGeometry args={[0.08, 0.06, 0.02]} />
          <M c="#7FFFD4" k="emissive" e={2.2} />
        </mesh>
      ))}
      <mesh position={[0, 2.28, -0.05]} rotation={[-0.5, 0, 0]}>
        <capsuleGeometry args={[0.1, 0.38, 6, 12]} />
        <M c="#FF6F7A" k="soft" />
      </mesh>
      {/* shield */}
      <group position={[-0.62, 0.95, 0.18]} rotation={[Math.PI / 2, 0, 0.25]}>
        <mesh>
          <cylinderGeometry args={[0.42, 0.42, 0.1, 40]} />
          <M c="#FFD166" k="gloss" />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.04, 32]} />
          <M c="#FF6F7A" />
        </mesh>
      </group>
      {/* sword */}
      <group position={[0.66, 1.0, 0.12]} rotation={[0, 0, -0.25]}>
        <RoundedBox args={[0.13, 0.95, 0.05]} radius={0.02} position={[0, 0.55, 0]}>
          <M c="#EEF3FF" k="metal" />
        </RoundedBox>
        <RoundedBox args={[0.42, 0.08, 0.1]} radius={0.03} position={[0, 0.06, 0]}>
          <M c="#FFD166" k="gloss" />
        </RoundedBox>
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.28, 12]} />
          <M c="#7A4E33" />
        </mesh>
      </group>
    </group>
  )
}

/* -------------------------------- DRAKO --------------------------------- */
const DRAKO_SEGMENTS: [number, number, number, number][] = [
  // x, y, z, radius — tail curls around the body
  [0.0, 0.85, -0.05, 0.6],
  [0.45, 0.55, -0.45, 0.36],
  [0.82, 0.42, -0.2, 0.28],
  [1.0, 0.34, 0.2, 0.21],
  [0.95, 0.3, 0.55, 0.16],
  [0.72, 0.28, 0.8, 0.12],
]

export function Dragon() {
  const seg = useRef<THREE.Group[]>([])
  const head = useRef<THREE.Group>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const amp = S.reduced ? 0.2 : 1
    seg.current.forEach((g, i) => {
      if (!g || i === 0) return
      g.position.y = DRAKO_SEGMENTS[i][1] + Math.sin(t * 2.2 - i * 0.7) * 0.05 * amp
      g.position.x = DRAKO_SEGMENTS[i][0] + Math.sin(t * 1.6 - i * 0.9) * 0.04 * i * 0.4 * amp
    })
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 1.3) * 0.08 * amp
      head.current.rotation.x = Math.sin(t * 0.9) * 0.06 * amp
    }
  })
  const pink = '#FF9FB2'
  return (
    <group>
      {DRAKO_SEGMENTS.map(([x, y, z, r], i) => (
        <group key={i} position={[x, y, z]} ref={(g) => void (g && (seg.current[i] = g))}>
          <mesh>
            <sphereGeometry args={[r, 32, 24]} />
            <M c={i % 2 ? '#FF8AA3' : pink} />
          </mesh>
          {i > 0 && (
            <mesh position={[0, r * 0.95, 0]}>
              <coneGeometry args={[r * 0.35, r * 0.6, 12]} />
              <M c="#FFE58F" k="gloss" />
            </mesh>
          )}
        </group>
      ))}
      <mesh position={[0, 0.72, 0.42]} scale={[0.9, 1, 0.6]}>
        <sphereGeometry args={[0.38, 28, 20]} />
        <M c="#FFE3B3" k="soft" />
      </mesh>
      {/* legs */}
      {[
        [-0.35, 0.18, 0.3],
        [0.35, 0.18, 0.3],
        [-0.38, 0.2, -0.3],
        [0.38, 0.2, -0.3],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <capsuleGeometry args={[0.13, 0.18, 6, 12]} />
          <M c="#FF8AA3" />
        </mesh>
      ))}
      {/* wings */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0.38 * s, 1.3, -0.25]} rotation={[0.2, 0.4 * s, 0.7 * s]}>
          <mesh scale={[0.08, 0.55, 0.45]} position={[0.1 * s, 0.25, 0]}>
            <sphereGeometry args={[1, 24, 16]} />
            <M c="#B9A7FF" k="gloss" />
          </mesh>
        </group>
      ))}
      {/* neck + head */}
      <mesh position={[0, 1.38, 0.18]} rotation={[0.35, 0, 0]}>
        <capsuleGeometry args={[0.24, 0.4, 8, 16]} />
        <M c={pink} />
      </mesh>
      <group ref={head} position={[0, 1.92, 0.32]}>
        <mesh>
          <sphereGeometry args={[0.42, 40, 28]} />
          <M c={pink} />
        </mesh>
        <mesh position={[0, -0.1, 0.34]} scale={[1.1, 0.8, 0.9]}>
          <sphereGeometry args={[0.24, 28, 20]} />
          <M c="#FFC4D0" />
        </mesh>
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, -0.05, 0.55]}>
            <sphereGeometry args={[0.025, 8, 6]} />
            <M c={INK} />
          </mesh>
        ))}
        <Eye p={[-0.17, 0.1, 0.33]} r={0.08} />
        <Eye p={[0.17, 0.1, 0.33]} r={0.08} />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.2 * s, 0.4, -0.08]} rotation={[-0.4, 0, -0.3 * s]}>
            <coneGeometry args={[0.07, 0.3, 16]} />
            <M c="#FFE58F" k="gloss" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/* -------------------------------- SHROOMY ------------------------------- */
const SPOTS: [number, number, number][] = [
  [0.0, 0.0, 0.32],
  [0.75, 0.9, 0.22],
  [-0.75, 0.9, 0.2],
  [0.55, 2.4, 0.24],
  [-0.55, 2.4, 0.18],
  [0.9, -0.6, 0.16],
  [0.95, 3.4, 0.15],
  [0.62, 4.4, 0.2],
  [-0.62, 4.3, 0.16],
]

export function Mushroom() {
  const capR = 1.0
  const capY = 1.32
  const capS = 0.72
  return (
    <group>
      <mesh position={[0, 0.06, 0]} scale={[1, 0.25, 1]}>
        <sphereGeometry args={[0.72, 32, 16]} />
        <M c="#8FDDA0" k="soft" />
      </mesh>
      <mesh position={[0, 0.66, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 1.15, 40]} />
        <M c="#FFF3E0" k="soft" />
      </mesh>
      <Eye p={[-0.16, 0.78, 0.43]} r={0.07} />
      <Eye p={[0.16, 0.78, 0.43]} r={0.07} />
      <Cheek p={[-0.28, 0.66, 0.4]} />
      <Cheek p={[0.28, 0.66, 0.4]} />
      <mesh position={[0, 0.66, 0.46]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.045, 0.016, 8, 16, Math.PI]} />
        <M c={INK} />
      </mesh>
      <mesh position={[0, capY, 0]} scale={[1, capS, 1]}>
        <sphereGeometry args={[capR, 56, 28, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <M c="#FF6F61" k="gloss" />
      </mesh>
      <mesh position={[0, capY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.12, 16, 56]} />
        <M c="#FFE9DA" k="soft" />
      </mesh>
      <mesh position={[0, capY - 0.02, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.06, 48]} />
        <M c="#FFE9DA" k="soft" />
      </mesh>
      {SPOTS.map(([theta, phi, r], i) => {
        // theta: polar from top (0..~1.2), phi: around
        const th = Math.min(theta, 1.25)
        const n = new THREE.Vector3(Math.sin(th) * Math.cos(phi), Math.cos(th) * capS, Math.sin(th) * Math.sin(phi))
        const pos = new THREE.Vector3(Math.sin(th) * Math.cos(phi) * capR, capY + Math.cos(th) * capR * capS, Math.sin(th) * Math.sin(phi) * capR)
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.normalize())
        return (
          <mesh key={i} position={pos} quaternion={q} scale={[1, 0.25, 1]}>
            <sphereGeometry args={[r, 20, 12]} />
            <M c="#FFFFFF" k="gloss" />
          </mesh>
        )
      })}
    </group>
  )
}

export const FIGURES: Record<FigureKind, () => React.JSX.Element> = {
  robot: Robot,
  bear: Bear,
  dragon: Dragon,
  creature: Creature,
  knight: Knight,
  mushroom: Mushroom,
}

export const Figure = forwardRef<THREE.Group, { kind: FigureKind } & React.JSX.IntrinsicElements['group']>(
  function Figure({ kind, ...props }, ref) {
    const C = FIGURES[kind]
    return (
      <group ref={ref} {...props}>
        <C />
      </group>
    )
  },
)
