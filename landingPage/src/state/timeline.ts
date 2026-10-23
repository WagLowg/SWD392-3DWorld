/**
 * The whole landing page is one scroll-scrubbed timeline measured in "units".
 * 1 unit ≈ 65vh of scroll on desktop (55vh on mobile).
 * Every 3D value is derived from the current time `t`, so scrolling up
 * reverses every transformation exactly.
 */
export const T = {
  aiCardIn: [0.2, 1.0],
  aiScan: [0.85, 1.5],
  aiEmerge: [1.3, 1.95],
  aiHold: [1.95, 2.9],
  ta: [2.9, 3.85],
  stAssemble: [4.15, 4.9],
  stOrbit: [4.75, 5.5],
  stHold: [5.5, 6.5],
  tb: [6.5, 7.45],
  mkDescend: [6.95, 7.7],
  mkArrange: [7.65, 8.3],
  mkFeature: [8.3, 8.75],
  mkHold: [8.75, 9.7],
  tc: [9.7, 10.6],
  prWireIn: [10.45, 10.8],
  prDescend: [10.8, 11.3],
  prPrint: [11.3, 12.75],
  prRise: [12.75, 13.25],
  prHold: [13.25, 14.2],
  fin: [14.2, 15.1],
  TOTAL: 16,
} as const

/** Where each world begins (used by navigation + progress indicator). */
export const WORLD_STARTS = [0, 3.35, 7.0, 10.15, 14.65]
/** Time the nav jumps to for each world — its interactive hold point. */
export const WORLD_ANCHORS = [2.2, 5.75, 9.0, 13.5, 15.6]

export const HOLDS: [number, number][] = [
  [T.aiHold[0] - 0.05, T.aiHold[1] + 0.05],
  [T.stHold[0] - 0.05, T.stHold[1] + 0.05],
  [T.mkHold[0] - 0.05, T.mkHold[1] + 0.05],
  [T.prHold[0] - 0.05, T.prHold[1] + 0.1],
]

export function worldAt(t: number) {
  let w = 0
  for (let i = 0; i < WORLD_STARTS.length; i++) if (t >= WORLD_STARTS[i]) w = i
  return w
}

export function holdAt(t: number) {
  for (let i = 0; i < HOLDS.length; i++) if (t >= HOLDS[i][0] && t <= HOLDS[i][1]) return i
  return -1
}

/** Progress (0..1) through a given world, for the progress rail. */
export function worldProgress(t: number, i: number) {
  const a = WORLD_STARTS[i]
  const b = WORLD_STARTS[i + 1] ?? T.TOTAL
  return Math.min(1, Math.max(0, (t - a) / (b - a)))
}

export const WORLD_Y = [0, -22, -44, -66, -88]
