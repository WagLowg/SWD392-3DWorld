import * as THREE from 'three'

/**
 * Mutable per-frame scene state. Read inside useFrame — never triggers React renders.
 */
export const S = {
  /** smoothed timeline time (units) */
  t: 0,
  /** normalized pointer (-1..1) */
  pointer: { x: 0, y: 0 },
  /** drag deltas accumulated by the shared canvas drag handler, per world */
  drag: [0, 0, 0, 0] as number[],
  dragVel: [0, 0, 0, 0] as number[],
  dragging: false,
  /** set by 3D objects that consume a pointerdown (so the canvas drag ignores it) */
  consumed: false,
  /** AI demo zoom factor */
  aiZoom: 1,
  /** replay overrides */
  aiDemo: { t: 1 },
  printDemo: { active: false, progress: 1, rise: 1 },
  /** hand-off points shared between worlds (world space) */
  handoff: {
    boltPos: new THREE.Vector3(0, -44, 1.2),
    boltScale: 0.75,
    printAbove: new THREE.Vector3(1.4, -61.5, 0),
    printAboveScale: 0.8,
    marketActiveKind: 'robot' as string,
  },
  /** world-space points the camera follows during transitions A, B and C */
  track: {
    ta: new THREE.Vector3(0, -10, 0),
    tb: new THREE.Vector3(0, -32, 0),
    tc: new THREE.Vector3(0, -55, 0),
  },
  /** camera focus for world visibility culling */
  focusY: 0,
  reduced: false,
  mobile: false,
  /** accent colour of the selected marketplace product */
  productAccent: new THREE.Color('#7FE3C0'),
}
