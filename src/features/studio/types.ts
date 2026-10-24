export type Vec3 = [number, number, number];

export type PrimitiveKind = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane';
export type NodeKind = PrimitiveKind | 'text' | 'extrude' | 'mesh' | 'group';

export type ProfileShape = 'rectangle' | 'circle' | 'polygon';

export interface NodeParams {
  // box / plane
  width?: number;
  height?: number;
  depth?: number;
  // sphere / cylinder / cone / torus
  radius?: number;
  tube?: number;
  segments?: number;
  // text
  text?: string;
  fontSize?: number;
  // extrude profile
  profile?: ProfileShape;
  cornerRadius?: number;
  sides?: number;
  holeRadius?: number;
  holeOffsetX?: number;
}

export interface MeshData {
  /** base64 encoded Float32Array of non-indexed triangle positions (mm) */
  positions: string;
  sourceHash?: string;
  provenance?: string;
}

export interface Appearance {
  color: string;
  roughness: number;
  metalness: number;
}

export interface SceneNode {
  id: string;
  name: string;
  kind: NodeKind;
  parentId: string | null;
  position: Vec3; // mm
  rotation: Vec3; // degrees
  scale: Vec3;
  params: NodeParams;
  mesh?: MeshData;
  appearance: Appearance;
  visible: boolean;
  locked: boolean;
  includedForPrint: boolean;
}

export type SaveState = 'clean' | 'dirty' | 'saving' | 'error' | 'conflict' | 'offline';

export type CheckLevel = 'PASS' | 'WARNING' | 'BLOCK' | 'UNKNOWN';

export interface CheckItem {
  id: string;
  label: string;
  level: CheckLevel;
  detail: string;
  nodeIds?: string[];
}

export interface PrintReport {
  sceneHash: string;
  createdAt: string;
  engine: string;
  items: CheckItem[];
  overall: CheckLevel;
  dims: Vec3;
  shells: number;
  parts: number;
  triangles: number;
}

export type SnapshotState = 'CREATING' | 'VALIDATING' | 'READY' | 'FAILED';

export interface Snapshot {
  id: string;
  revision: number;
  meshHash: string;
  dims: Vec3;
  parts: number;
  triangles: number;
  state: SnapshotState;
  createdAt: string;
  acknowledgedWarnings: string[];
  unit: 'mm';
  consentVersion?: string;
  bytes: number;
}

export type PodStage =
  | 'STAFF_REVIEW'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'PAID_100'
  | 'IN_PRODUCTION'
  | 'SHIPPED';

export interface PrintRequestReceipt {
  id: string;
  snapshotId: string;
  projectId?: string;
  idempotencyKey: string;
  quantity: number;
  technology: string;
  material: string;
  note: string;
  stage: PodStage;
  observedAt: string;
  createdAt: string;
}
