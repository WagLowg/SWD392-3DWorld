export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** 0..1 progress of `t` through [a, b] */
export const range = (t: number, ab: readonly [number, number] | readonly number[]) => clamp((t - ab[0]) / (ab[1] - ab[0]))
export const smooth = (x: number) => x * x * (3 - 2 * x)
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
export const easeIn = (x: number) => x * x * x
export const easeOutBack = (x: number, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2)
/** Bell curve: 0 → 1 → 0 across 0..1 */
export const bell = (x: number) => Math.sin(clamp(x) * Math.PI)
/** Frame-rate independent damping */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt))
/** Seeded pseudo random */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
export const wrapAngle = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}
