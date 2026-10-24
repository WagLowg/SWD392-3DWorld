export type User = { id: string; email: string; name: string; role: string };

export type GenConfig = {
  aiModel: string;
  shouldTexture: boolean;
  enablePbr: boolean;
  textureResolution: string;
  texturePrompt: string;
  geometryResolution: string;
  shouldRemesh: boolean;
  topology: 'triangle' | 'quad';
  targetPolycount: number;
  poseMode: '' | 'a-pose' | 't-pose';
  imageEnhancement: boolean;
  removeLighting: boolean;
  moderation: boolean;
  targetFormats: string[];
};

export type SourceImage = { id: string; name: string; mime: string; sizeBytes: number; width: number; height: number; url: string; createdAt: number };

export type TaskStatus =
  | 'SUBMITTED' | 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'INGESTING' | 'AVAILABLE'
  | 'ASSET_ERROR' | 'FAILED' | 'CANCELLED' | 'NEEDS_RECONCILIATION';

export type Task = {
  id: string; projectId: string; provider: string; providerTaskId: string | null; type: string;
  status: TaskStatus; providerStatus: string | null; progress: number; errorCode: string | null; errorMessage: string | null;
  variantIndex: number; credits: number; config: GenConfig; imageIds: string[];
  createdAt: number; updatedAt: number; finishedAt: number | null;
};

export type Asset = { id: string; kind: 'model' | 'thumbnail' | 'texture' | 'bundle'; format: string; sizeBytes: number; checksum: string; url: string };
export type MeshStats = { vertices: number; triangles: number; size: [number, number, number] | null; materials: number; textures: number };
export type Dimensions = { lengthMm: number; widthMm: number; heightMm: number; keepRatio: boolean; confirmedAt: number };

export type Version = {
  id: string; projectId: string; label: string; sourceTaskId: string | null;
  metadata: { stats: MeshStats | null; aiModel?: string; texture?: string | null; topology?: string; credits?: number; provider?: string; providerTaskId?: string };
  dimensions: Dimensions | null; createdAt: number; assets: Asset[]; glbUrl: string | null; thumbnailUrl: string | null;
};

export type ProjectStatus = 'DRAFT' | 'PROCESSING' | 'READY' | 'FAILED';
export type ProjectSummary = {
  id: string; title: string; sourceMode: 'single' | 'multi'; favorite: boolean; archived: boolean; visibility: string;
  status: ProjectStatus; activeVersionId: string | null; versionCount: number; formats: string[];
  thumbnailUrl: string | null; stats: MeshStats | null; createdAt: number; updatedAt: number;
};
export type ProjectDetail = { project: ProjectSummary; versions: Version[]; tasks: Task[]; images: SourceImage[] };

export type Estimate = {
  priceVersion: string; perVariant: number; variants: number; total: number;
  breakdown: { label: string; credits: number }[]; balance: number; sufficient: boolean; config: GenConfig;
};

export type ConfigOptions = {
  provider: 'meshy' | 'mock'; priceVersion: string;
  models: { id: string; label: string; textureResolutions: string[]; geometryResolutions: string[] }[];
  presets: Record<'fast' | 'balanced' | 'high', { aiModel: string; textureResolution: string; geometryResolution: string }>;
  upload: { maxBytes: number; mimes: string[]; minSide: number };
};

export type LedgerEntry = { id: string; amount: number; type: string; taskId: string | null; note: string | null; createdAt: number; projectTitle: string | null };
export type Wallet = { balance: number; held: number; spent: number; ledger: LedgerEntry[] };

export type PodOptions = Record<'FDM' | 'RESIN', { materials: string[]; qualities: string[] }>;
export type Handoff = {
  id: string; printRequestId: string; versionId: string; versionLabel: string; projectTitle: string; projectId: string;
  config: { technology: string; material: string; quality: string; color: string; quantity: number; note: string; dimensions: Dimensions };
  files: { id: string; format: string; checksum: string; size_bytes: number }[]; status: string; createdAt: number;
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public data?: Record<string, unknown>) {
    super(message);
  }
}

type Opts = { method?: string; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal };

/** Phát sự kiện khi phiên hết hạn để AuthProvider chuyển về trang đăng nhập. */
export const authEvents = new EventTarget();

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const isForm = opts.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method || (opts.body ? 'POST' : 'GET'),
      headers: { ...(opts.body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...opts.headers },
      body: opts.body ? (isForm ? (opts.body as FormData) : JSON.stringify(opts.body)) : undefined,
      credentials: 'same-origin',
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'NETWORK', 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.');
  }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) {
    const err = data?.error || {};
    if (res.status === 401 && !path.startsWith('/api/auth/')) authEvents.dispatchEvent(new Event('expired'));
    throw new ApiError(res.status, err.code || 'HTTP_' + res.status, err.message || `Lỗi ${res.status}`, err);
  }
  return data as T;
}

export const newKey = () =>
  (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^\w-]/g, '');
