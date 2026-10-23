import { create } from 'zustand'
import type { FigureKind } from '../config/content'
import { EDITOR_COLORS } from '../config/content'

export type ShapeType = 'cube' | 'sphere' | 'cylinder' | 'torus' | 'cone' | 'block'

export type EditorObject = {
  id: string
  type: ShapeType
  color: string
  pos: [number, number, number]
  /** where it floats before the scroll assembles it */
  floatPos: [number, number, number]
  rotY: number
  rotX?: number
  scale: [number, number, number]
  face?: boolean
  /** born after reset/add — animates in */
  born?: number
}

/** The default creation: a little toy robot assembled from primitives. */
export const DEFAULT_SCENE = (): EditorObject[] => [
  { id: 'base', type: 'cylinder', color: '#FFD166', pos: [0, 0.18, 0], floatPos: [-2.4, 1.4, 0.6], rotY: 0, scale: [1, 1, 1] },
  { id: 'body', type: 'cube', color: '#7FE3C0', pos: [0, 0.86, 0], floatPos: [2.3, 2.2, -0.4], rotY: 0, scale: [1, 1, 1] },
  { id: 'armL', type: 'block', color: '#98DFFF', pos: [-0.78, 0.92, 0], floatPos: [-1.5, 3.0, -1.1], rotY: 0, scale: [1, 1, 1] },
  { id: 'armR', type: 'block', color: '#98DFFF', pos: [0.78, 0.92, 0], floatPos: [1.4, 0.9, 1.3], rotY: 0, scale: [1, 1, 1] },
  { id: 'neck', type: 'torus', color: '#FF8F7A', pos: [0, 1.42, 0], floatPos: [-2.6, 2.7, -0.9], rotY: 0, rotX: Math.PI / 2, scale: [1, 1, 1] },
  { id: 'head', type: 'sphere', color: '#FFFFFF', pos: [0, 1.92, 0], floatPos: [0.2, 3.3, 0.2], rotY: 0, scale: [1, 1, 1], face: true },
  { id: 'antenna', type: 'cone', color: '#FF8F7A', pos: [0, 2.6, 0], floatPos: [2.7, 3.2, 0.8], rotY: 0, scale: [1, 1, 1] },
]

/** Resting height (center y) for a shape placed on the platform. */
export const SHAPE_REST_Y: Record<ShapeType, number> = {
  cube: 0.5,
  sphere: 0.5,
  cylinder: 0.18,
  torus: 0.12,
  cone: 0.2,
  block: 0.35,
}

type UIState = {
  ready: boolean
  activeWorld: number
  holdWorld: number
  setReady: (v: boolean) => void
  setWorld: (w: number, h: number) => void

  // AI Studio
  aiPreset: FigureKind
  aiReplay: number
  setAiPreset: (k: FigureKind) => void
  replayAi: () => void

  // 3D Studio editor
  objects: EditorObject[]
  selected: string | null
  mode: 'move' | 'rotate'
  select: (id: string | null) => void
  setMode: (m: 'move' | 'rotate') => void
  updateObject: (id: string, patch: Partial<EditorObject>) => void
  addShape: (type: ShapeType) => void
  resetScene: () => void

  // Marketplace
  productIndex: number
  setProduct: (i: number) => void

  // Order Print
  printKind: FigureKind
  printKindTouched: boolean
  printMaterial: 'PLA' | 'PETG'
  printColor: string
  printScale: 'S' | 'M' | 'L'
  printReplay: number
  setPrint: (patch: Partial<Pick<UIState, 'printKind' | 'printKindTouched' | 'printMaterial' | 'printColor' | 'printScale'>>) => void
  replayPrint: () => void
}

let uid = 0

export const useUI = create<UIState>((set, get) => ({
  ready: false,
  activeWorld: 0,
  holdWorld: -1,
  setReady: (v) => set({ ready: v }),
  setWorld: (w, h) => {
    const s = get()
    if (s.activeWorld === w && s.holdWorld === h) return
    // leaving the studio hold: drop the selection so gizmos don't linger
    const patch: Partial<UIState> = { activeWorld: w, holdWorld: h }
    if (h !== 1 && s.selected) patch.selected = null
    set(patch)
  },

  aiPreset: 'bear',
  aiReplay: 0,
  setAiPreset: (k) => set({ aiPreset: k, aiReplay: get().aiReplay + 1 }),
  replayAi: () => set({ aiReplay: get().aiReplay + 1 }),

  objects: DEFAULT_SCENE(),
  selected: null,
  mode: 'move',
  select: (id) => set({ selected: id }),
  setMode: (m) => set({ mode: m }),
  updateObject: (id, patch) =>
    set({ objects: get().objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) }),
  addShape: (type) => {
    const objs = get().objects
    if (objs.length >= 16) return
    const id = `${type}-${++uid}`
    // find a free spot on the platform, spiralling out from the front-left
    const spots: [number, number][] = []
    for (let r = 1.4; r < 2.8; r += 0.5) for (let a = 0; a < 8; a++) spots.push([Math.cos(a * 0.8 + r) * r, Math.sin(a * 0.8 + r) * r * 0.55])
    const free =
      spots.find(([x, z]) => objs.every((o) => Math.hypot(o.pos[0] - x, o.pos[2] - z) > 0.9)) ?? [0, 1.2]
    const snap = (v: number) => Math.round(v * 4) / 4
    const y = SHAPE_REST_Y[type]
    const color = EDITOR_COLORS[(objs.length + 2) % EDITOR_COLORS.length]
    const obj: EditorObject = {
      id,
      type,
      color,
      pos: [snap(free[0]), y, snap(free[1])],
      floatPos: [snap(free[0]), y + 2.2, snap(free[1])],
      rotY: 0,
      rotX: type === 'torus' ? Math.PI / 2 : 0,
      scale: [1, 1, 1],
      born: performance.now(),
    }
    set({ objects: [...objs, obj], selected: id })
  },
  resetScene: () => set({ objects: DEFAULT_SCENE().map((o) => ({ ...o, born: performance.now() })), selected: null, mode: 'move' }),

  productIndex: 0,
  setProduct: (i) => set({ productIndex: i }),

  printKind: 'bear',
  printKindTouched: false,
  printMaterial: 'PLA',
  printColor: '#A894FF',
  printScale: 'M',
  printReplay: 0,
  setPrint: (patch) => set(patch),
  replayPrint: () => set({ printReplay: get().printReplay + 1 }),
}))
