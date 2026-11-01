import { podService } from '../../pod/services/pod.service';
import type { PrintRequest } from '../../pod/types';
import {
  api,
  type Asset,
  type ConfigOptions,
  type Estimate,
  type GenConfig,
  type ProjectDetail,
  type ProjectStatus,
  type ProjectSummary,
  type SourceImage,
  type SourceMode,
  type Task,
  type TaskStatus,
  type Version,
  type Wallet,
} from './api';
import { fetchAuthed } from './authed';

/**
 * Lớp nối AI Studio với Backend chính (OpenAPI "AI Studio & Generation", prefix /api/ai-studio).
 * Mỗi hàm gọi API thật rồi chuyển dữ liệu sang kiểu frontend đang dùng (api.ts), để các trang ít phải sửa.
 * Chỗ nào Backend chưa hỗ trợ được ghi rõ bằng UnsupportedError / ghi chú — xem docs/MISSING_APIS.md (mục AI Studio).
 */

export class UnsupportedError extends Error {}

const ts = (iso?: string | null) => (iso ? Date.parse(iso) || Date.now() : Date.now());

/* ------------------------------------------------------------ kiểu Backend */

type BVersionSummary = {
  modelVersionId: number;
  versionNumber: number;
  sourceType?: string;
  createdAt?: string;
  fileId?: number | null;
  glbDownloadUrl?: string | null;
};
type BTaskSummary = {
  aiRequestId: number;
  requestType?: string;
  actionType?: string;
  status: string;
  prompt?: string | null;
  providerName?: string | null;
  creditsUsed?: number | null;
  createdAt?: string;
  completedAt?: string | null;
};
type BTaskDetail = BTaskSummary & {
  modelId: number;
  modelName?: string;
  progress?: number | null;
  providerJobReference?: string | null;
  failureReason?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  versions?: BVersionSummary[];
  stats?: Record<string, unknown> | null;
  config?: Partial<GenConfig> | null;
  imageIds?: string[] | null;
  variantIndex?: number | null;
};
type BProjectDetail = {
  modelId: number;
  modelName: string;
  description?: string | null;
  visibility?: string | null;
  createdAt?: string;
  updatedAt?: string;
  versions?: BVersionSummary[];
  tasks?: BTaskSummary[];
  stats?: Record<string, unknown>;
};
type BProjectSummary = {
  modelId: number;
  modelName: string;
  description?: string | null;
  visibility?: string | null;
  latestVersion?: number | null;
  primaryFileId?: number | null;
  downloadUrl?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  stats?: Record<string, unknown> | null;
  status?: string | null;
  thumbnailUrl?: string | null;
  activeVersionId?: number | null;
  favorite?: boolean | null;
  archived?: boolean | null;
  sourceMode?: string | null;
  versionCount?: number | null;
  formats?: string[] | null;
};
type BFile = { fileId: number; fileRole?: string; fileFormat?: string; fileSize?: number; downloadUrl?: string };
type BVersionDetail = {
  modelVersionId: number;
  modelId: number;
  parentVersionId?: number | null;
  versionNumber: number;
  sourceType?: string;
  changeNote?: string | null;
  createdAt?: string;
  files?: BFile[];
  stats?: Record<string, unknown>;
};
type BUpload = { uploadId: string; fileName: string; fileSize: number; mimeType: string; downloadUrl: string; createdAt: string };

/* --------------------------------------------------------------- adapters */

/** Trạng thái Backend (chưa công bố enum) → trạng thái hiển thị. */
export function taskStatus(s: string | undefined): TaskStatus {
  const v = (s ?? '').toUpperCase();
  if (['PENDING', 'QUEUED', 'CREATED', 'WAITING'].includes(v)) return 'QUEUED';
  if (v === 'SUBMITTED') return 'SUBMITTED';
  if (['IN_PROGRESS', 'RUNNING', 'PROCESSING', 'GENERATING'].includes(v)) return 'RUNNING';
  if (['SUCCEEDED', 'SUCCESS', 'COMPLETED', 'DONE', 'AVAILABLE'].includes(v)) return 'AVAILABLE';
  if (['INGESTING', 'SAVING'].includes(v)) return 'INGESTING';
  if (['CANCELED', 'CANCELLED'].includes(v)) return 'CANCELLED';
  if (['ASSET_ERROR'].includes(v)) return 'ASSET_ERROR';
  if (['FAILED', 'ERROR', 'EXPIRED'].includes(v)) return 'FAILED';
  if (['NEEDS_RECONCILIATION', 'UNKNOWN'].includes(v)) return 'NEEDS_RECONCILIATION';
  return 'QUEUED';
}

const BLANK_CONFIG: GenConfig = {
  aiModel: '',
  shouldTexture: true,
  enablePbr: false,
  textureResolution: '2k',
  texturePrompt: '',
  geometryResolution: 'standard',
  shouldRemesh: false,
  topology: 'triangle',
  targetPolycount: 30000,
  poseMode: '',
  imageEnhancement: false,
  removeLighting: false,
  moderation: true,
  targetFormats: ['glb'],
};

/** sourceMode / requestType của Backend → chế độ hiển thị. */
function sourceModeOf(s?: string | null): SourceMode {
  const v = (s ?? '').toUpperCase();
  if (v.includes('TEXT')) return 'text';
  if (v.includes('MULTI')) return 'multi';
  return 'single';
}

/** Chế độ frontend → `mode` gửi Backend (estimates / tasks). */
const MODE: Record<SourceMode, string> = { single: 'image', multi: 'multi-image', text: 'text' };

function toTask(t: BTaskSummary | BTaskDetail, projectId: string): Task {
  const d = t as BTaskDetail;
  const status = taskStatus(t.status);
  return {
    id: String(t.aiRequestId),
    projectId,
    provider: t.providerName ?? '',
    providerTaskId: d.providerJobReference ?? null,
    type: (t.requestType ?? 'image-to-3d').toLowerCase(),
    status,
    providerStatus: t.status,
    progress: d.progress ?? (status === 'AVAILABLE' ? 100 : 0),
    errorCode: d.errorCode ?? null,
    errorMessage: d.errorMessage ?? d.failureReason ?? null,
    variantIndex: d.variantIndex ?? 0,
    credits: t.creditsUsed ?? 0,
    config: { ...BLANK_CONFIG, ...(d.config ?? {}) },
    imageIds: d.imageIds ?? [],
    createdAt: ts(t.createdAt),
    updatedAt: ts(t.completedAt ?? t.createdAt),
    finishedAt: t.completedAt ? ts(t.completedAt) : null,
  };
}

function versionFromSummary(v: BVersionSummary, projectId: string): Version {
  const assets: Asset[] = v.glbDownloadUrl
    ? [{ id: String(v.fileId ?? v.modelVersionId), kind: 'model', format: 'glb', sizeBytes: 0, checksum: '', url: v.glbDownloadUrl }]
    : [];
  return {
    id: String(v.modelVersionId),
    projectId,
    label: `V${v.versionNumber}`,
    sourceTaskId: null,
    metadata: { stats: null },
    dimensions: null,
    createdAt: ts(v.createdAt),
    assets,
    glbUrl: v.glbDownloadUrl ?? null,
    thumbnailUrl: null,
  };
}

function statsOf(s?: Record<string, unknown> | null) {
  if (!s) return null;
  const n = (k: string) => (typeof s[k] === 'number' ? (s[k] as number) : 0);
  const size = Array.isArray(s.size) ? (s.size as number[]) : null;
  return {
    vertices: n('vertices') || n('vertexCount'),
    triangles: n('triangles') || n('triangleCount') || n('faces'),
    size: size && size.length === 3 ? (size as [number, number, number]) : null,
    materials: n('materials'),
    textures: n('textures'),
  };
}

function projectStatus(versions: number, tasks: Task[]): ProjectStatus {
  if (tasks.some((t) => ['QUEUED', 'SUBMITTED', 'RUNNING', 'INGESTING', 'NEEDS_RECONCILIATION'].includes(t.status))) return 'PROCESSING';
  if (versions > 0) return 'READY';
  if (tasks[0]?.status === 'FAILED') return 'FAILED';
  return 'DRAFT';
}

/* ---------------------------------------------------------------- service */

const P = '/api/ai-studio';

export const aiStudio = {
  async configOptions(): Promise<ConfigOptions> {
    const d = await api<{
      defaultProvider?: string;
      priceVersion: string;
      models: ConfigOptions['models'];
      presets: ConfigOptions['presets'];
      uploadLimits?: { maxBytes?: number; minSide?: number };
      pricing?: ConfigOptions['pricing'];
    }>(`${P}/config-options`);
    const provider = (d.defaultProvider ?? '').toUpperCase();
    return {
      provider: provider === 'MESHY' ? 'meshy' : provider === 'MOCK' ? 'mock' : 'unconfigured',
      priceVersion: d.priceVersion,
      models: d.models,
      presets: d.presets,
      upload: {
        maxBytes: d.uploadLimits?.maxBytes ?? 20 * 1024 * 1024,
        minSide: d.uploadLimits?.minSide ?? 64,
        mimes: ['image/jpeg', 'image/png', 'image/webp'],
      },
      pricing: d.pricing ?? [],
    };
  },

  async wallet(): Promise<Wallet> {
    const w = await api<{ availableCredits: number; totalTasksRun?: number; successfulTasks?: number }>(`${P}/wallet`);
    return { balance: w.availableCredits, held: 0, spent: 0, ledger: [], totalTasks: w.totalTasksRun ?? 0, successfulTasks: w.successfulTasks ?? 0 };
  },

  /** Chỉ chạy khi Backend bật demo top-up (môi trường dev/test). */
  async topup(amount: number) {
    await api(`${P}/wallet/topup`, { body: { amount } });
  },

  async estimate(input: { mode: SourceMode; config: GenConfig; variants: number }, signal?: AbortSignal): Promise<Estimate> {
    const e = await api<{ perVariant: number; variants: number; total: number; userBalance: number; sufficient: boolean; priceVersion: string; config: GenConfig }>(
      `${P}/estimates`,
      { body: { mode: MODE[input.mode], config: input.config, variants: input.variants }, signal },
    );
    return {
      priceVersion: e.priceVersion,
      perVariant: e.perVariant,
      variants: e.variants,
      total: e.total,
      breakdown: [{ label: 'Mỗi biến thể', credits: e.perVariant }],
      balance: e.userBalance,
      sufficient: e.sufficient,
      config: { ...BLANK_CONFIG, ...e.config },
    };
  },

  async uploads(): Promise<SourceImage[]> {
    return (await api<BUpload[]>(`${P}/uploads`)).map(toImage);
  },

  /**
   * Tạo tác vụ thống nhất (POST /tasks, JSON `CreateAiUnifiedTaskRequest`):
   * ảnh đã upload (`uploadIds`, 1 ảnh hoặc Multi-View), hoặc văn bản (`prompt`), kèm cấu hình, số biến thể,
   * dự án có sẵn (`projectId` → thêm phiên bản) và giá đã báo (`priceVersion` + `quotedCredits`).
   * `key` gửi qua header Idempotency-Key để bấm lại không tạo trùng.
   */
  async createTask(input: {
    mode: SourceMode;
    name: string;
    images?: SourceImage[];
    prompt?: string;
    config: GenConfig;
    variants: number;
    projectId?: string | null;
    estimate: Pick<Estimate, 'priceVersion' | 'total'>;
    key: string;
  }): Promise<{ projectId: string; tasks: Task[] }> {
    const uploadIds = (input.images ?? []).map((i) => i.id);
    const prompt = input.prompt?.trim() ?? '';
    // Chặn ở frontend: Backend tự chuyển sang Text-to-3D (và trừ tín dụng) khi uploadIds rỗng.
    if (input.mode !== 'text' && !uploadIds.length) throw new Error('Chưa chọn ảnh tham chiếu.');
    if (input.mode === 'text' && !prompt) throw new Error('Nhập mô tả mô hình để tạo từ văn bản.');
    const t = await api<BTaskDetail | BTaskDetail[]>(`${P}/tasks`, {
      headers: { 'Idempotency-Key': input.key },
      body: {
        mode: MODE[input.mode],
        name: input.name,
        prompt: input.mode === 'text' ? prompt : undefined,
        uploadIds: input.mode === 'text' ? [] : uploadIds,
        config: input.config,
        variants: input.variants,
        projectId: input.projectId ? Number(input.projectId) : undefined,
        consent: true,
        priceVersion: input.estimate.priceVersion,
        quotedCredits: input.estimate.total,
      },
    });
    const list = Array.isArray(t) ? t : [t];
    const pid = String(list[0]?.modelId ?? input.projectId ?? '');
    return { projectId: pid, tasks: list.map((x) => toTask(x, pid)) };
  },

  /** Danh sách tác vụ của người dùng (lọc theo trạng thái Backend, phân trang từ 0). */
  async tasks(q: { status?: string; page?: number; size?: number } = {}): Promise<Task[]> {
    const qs = new URLSearchParams();
    if (q.status) qs.set('status', q.status);
    qs.set('page', String(q.page ?? 0));
    qs.set('size', String(q.size ?? 20));
    return (await api<BTaskDetail[]>(`${P}/tasks?${qs}`)).map((t) => toTask(t, String(t.modelId)));
  },

  async cancelTask(id: string) {
    await api(`${P}/tasks/${id}/cancel`, { method: 'POST' });
  },

  async refreshTask(id: string) {
    await api(`${P}/tasks/${id}/refresh`, { method: 'POST' });
  },

  async project(id: string): Promise<ProjectDetail> {
    const d = await api<BProjectDetail>(`${P}/projects/${id}`);
    const pid = String(d.modelId);
    let tasks = (d.tasks ?? []).map((t) => toTask(t, pid));
    // Danh sách tóm tắt không có % tiến độ / lỗi → đọc chi tiết các tác vụ đang chạy hoặc vừa lỗi
    const needDetail = tasks.filter((t) => t.status !== 'AVAILABLE' && t.status !== 'CANCELLED').slice(0, 5);
    if (needDetail.length) {
      const details = await Promise.all(needDetail.map((t) => api<BTaskDetail>(`${P}/tasks/${t.id}`).catch(() => null)));
      tasks = tasks.map((t) => {
        const hit = details.find((x) => x && String(x.aiRequestId) === t.id);
        return hit ? toTask(hit, pid) : t;
      });
    }
    tasks.sort((a, b) => b.createdAt - a.createdAt);
    const versions = (d.versions ?? []).map((v) => versionFromSummary(v, pid)).sort((a, b) => a.createdAt - b.createdAt);
    const stats = statsOf(d.stats);
    if (stats && versions.length) versions[versions.length - 1].metadata.stats = stats;
    return {
      project: {
        id: pid,
        title: d.modelName,
        sourceMode: sourceModeOf(d.tasks?.[d.tasks.length - 1]?.requestType),
        favorite: false,
        archived: false,
        visibility: d.visibility ?? 'PRIVATE',
        status: projectStatus(versions.length, tasks),
        activeVersionId: versions[versions.length - 1]?.id ?? null,
        versionCount: versions.length,
        formats: versions.length ? ['glb'] : [],
        thumbnailUrl: null,
        modelUrl: versions[versions.length - 1]?.glbUrl ?? null,
        stats,
        createdAt: ts(d.createdAt),
        updatedAt: ts(d.updatedAt),
      },
      versions,
      tasks,
      images: [],
    };
  },

  /** Backend chưa có lọc / phân trang / sắp xếp cho danh sách dự án → lọc phía trình duyệt. */
  async projects(q: { tab?: string; q?: string; status?: string; sort?: string; page?: number; pageSize?: number } = {}) {
    const all = (await api<BProjectSummary[]>(`${P}/projects`)).map(toSummary);
    const term = q.q?.trim().toLowerCase();
    let rows = all.filter((p) => (!term || p.title.toLowerCase().includes(term)) && (!q.status || p.status === q.status));
    // Tab Lưu trữ chỉ hiện dự án đã lưu trữ; các tab khác ẩn chúng.
    rows = rows.filter((p) => (q.tab === 'archived' ? p.archived : !p.archived));
    if (q.tab === 'favorites') rows = rows.filter((p) => p.favorite);
    if (q.tab === 'recent') rows = rows.filter((p) => Date.now() - p.updatedAt < 7 * 86_400_000);
    rows.sort((a, b) => (q.sort === 'oldest' ? a.createdAt - b.createdAt : q.sort === 'name' ? a.title.localeCompare(b.title, 'vi') : b.updatedAt - a.updatedAt));
    const size = q.pageSize ?? rows.length;
    const page = Math.max(1, q.page ?? 1);
    return { items: rows.slice((page - 1) * size, page * size), total: rows.length };
  },

  /** Cập nhật tên, mô tả, hiển thị, yêu thích, lưu trữ, phiên bản chính (UpdateAiProjectRequest). */
  async patchProject(id: string, body: { title?: string; description?: string; visibility?: string; favorite?: boolean; archived?: boolean; activeVersionId?: string }) {
    await api(`${P}/projects/${id}`, {
      method: 'PATCH',
      body: {
        name: body.title,
        description: body.description,
        visibility: body.visibility,
        favorite: body.favorite,
        archived: body.archived,
        activeVersionId: body.activeVersionId ? Number(body.activeVersionId) : undefined,
      },
    });
  },

  async version(id: string): Promise<Version> {
    const v = await api<BVersionDetail>(`${P}/versions/${id}`);
    const assets: Asset[] = (v.files ?? []).map((f) => ({
      id: String(f.fileId),
      kind: /PREVIEW|THUMB/i.test(f.fileRole ?? '') ? 'thumbnail' : 'model',
      format: (f.fileFormat ?? 'glb').toLowerCase(),
      sizeBytes: f.fileSize ?? 0,
      checksum: '',
      url: f.downloadUrl ?? `${P}/assets/${f.fileId}/file`,
    }));
    const glb = assets.find((a) => a.kind === 'model' && a.format === 'glb');
    return {
      id: String(v.modelVersionId),
      projectId: String(v.modelId),
      label: `V${v.versionNumber}`,
      sourceTaskId: null,
      metadata: { stats: statsOf(v.stats) },
      dimensions: null,
      createdAt: ts(v.createdAt),
      assets,
      glbUrl: glb?.url ?? null,
      thumbnailUrl: assets.find((a) => a.kind === 'thumbnail')?.url ?? null,
    };
  },

  /** Xuất GLB / STL / OBJ / FBX. Backend chuyển đổi từ GLB khi chưa có sẵn → trả URL tải (cần token). */
  async exportVersion(id: string, format: string) {
    const r = await api<{ fileId: number; format: string; fileName?: string | null; fileSize: number; downloadUrl: string; fileHash?: string }>(
      `${P}/versions/${id}/exports`,
      { body: { format: format.toUpperCase() } },
    );
    // OBJ có thể được đóng gói thành ZIP (OBJ + MTL + texture) → nhận biết qua tên tệp.
    const zip = /.zip$/i.test(r.fileName ?? '');
    return {
      downloadUrl: r.downloadUrl,
      sizeBytes: r.fileSize,
      format: (r.format ?? format).toLowerCase(),
      fileName: r.fileName ?? null,
      checksum: r.fileHash ?? null,
      packaging: zip ? ('zip' as const) : undefined,
    };
  },

  /** Lưu kích thước in thật (mm). Dài (X) ↔ depthMm, Rộng (Z) ↔ widthMm, Cao (Y) ↔ heightMm. */
  async saveDimensions(id: string, d: { l: number; w: number; h: number }) {
    return api<{ computedDimensions?: Record<string, unknown> }>(`${P}/versions/${id}/dimensions`, {
      method: 'PUT',
      body: { depthMm: d.l, widthMm: d.w, heightMm: d.h, unit: 'mm' },
    });
  },
};

function toImage(u: BUpload): SourceImage {
  return { id: u.uploadId, name: u.fileName, mime: u.mimeType, sizeBytes: u.fileSize, width: 0, height: 0, url: u.downloadUrl, createdAt: ts(u.createdAt) };
}

export function uploadResponseToImage(data: unknown): SourceImage | null {
  const u = data as BUpload | null;
  return u?.uploadId ? toImage(u) : null;
}

const PROJECT_STATUS_MAP: Record<string, ProjectStatus> = {
  READY: 'READY', AVAILABLE: 'READY', COMPLETED: 'READY', SUCCEEDED: 'READY',
  PROCESSING: 'PROCESSING', PENDING: 'PROCESSING', IN_PROGRESS: 'PROCESSING', RUNNING: 'PROCESSING', QUEUED: 'PROCESSING',
  FAILED: 'FAILED', ERROR: 'FAILED',
  DRAFT: 'DRAFT',
};

/**
 * Backend hiện ghi cứng phần lớn trường tóm tắt (status READY, versionCount = latestVersion,
 * thumbnailUrl = link tải GLB). Chỉ tin `primaryFileId` / `downloadUrl` để biết đã có mô hình chưa.
 */
function toSummary(p: BProjectSummary): ProjectSummary {
  const hasModel = p.primaryFileId != null && !!p.downloadUrl;
  const count = hasModel ? (p.versionCount ?? p.latestVersion ?? 1) : 0;
  const reported = PROJECT_STATUS_MAP[(p.status ?? '').toUpperCase()];
  // "READY" mà chưa có tệp mô hình → thực ra là đang xử lý hoặc đã lỗi; hiển thị là nháp.
  const status = reported === 'READY' && !hasModel ? 'DRAFT' : (reported ?? (hasModel ? 'READY' : 'DRAFT'));
  // thumbnailUrl trùng link tải mô hình (GLB) thì không phải ảnh → bỏ qua.
  const thumb = p.thumbnailUrl && p.thumbnailUrl !== p.downloadUrl && !/\/assets\/\d+\/file$|\.glb$/i.test(p.thumbnailUrl) ? p.thumbnailUrl : null;
  return {
    id: String(p.modelId),
    title: p.modelName,
    sourceMode: sourceModeOf(p.sourceMode),
    favorite: !!p.favorite,
    archived: !!p.archived,
    visibility: p.visibility ?? 'PRIVATE',
    status,
    // activeVersionId có thể null (chưa chọn) → trang chọn mô hình mở dự án để lấy phiên bản mới nhất.
    activeVersionId: p.activeVersionId != null ? String(p.activeVersionId) : null,
    versionCount: count,
    formats: hasModel ? (p.formats ?? ['glb']).map((f) => f.toLowerCase()) : [],
    thumbnailUrl: thumb,
    modelUrl: hasModel ? p.downloadUrl! : null,
    stats: statsOf(p.stats),
    createdAt: ts(p.createdAt),
    updatedAt: ts(p.updatedAt ?? p.createdAt),
  };
}

/* ------------------------------------------------------------- In 3D (POD) */

/**
 * Chưa có API bàn giao AI → POD. Dùng luồng POD sẵn có: tạo yêu cầu in bằng tệp GLB của phiên bản
 * rồi cập nhật thông số (kích thước, màu, chất lượng, số lượng, ghi chú).
 */
export async function createPrintRequestFromVersion(input: {
  version: Version;
  projectTitle: string;
  materialId: number;
  dims: { l: number; w: number; h: number };
  quality: string;
  color: string;
  quantity: number;
  note: string;
}): Promise<PrintRequest> {
  const glb = input.version.assets.find((a) => a.kind === 'model' && ['glb', 'stl', 'obj'].includes(a.format));
  if (!glb) throw new Error('Phiên bản chưa có tệp GLB/STL/OBJ để gửi in.');
  const blob = await fetchAuthed(glb.url);
  const safe = input.projectTitle.replace(/[^\w\-À-ỹ ]+/g, '').trim() || 'model';
  const file = new File([blob], `${safe}_${input.version.label}.${glb.format}`, { type: blob.type || 'model/gltf-binary' });
  return podService.createFromFile(file, input.materialId, {
    color: input.color,
    quality: input.quality,
    widthMm: input.dims.w,
    heightMm: input.dims.h,
    depthMm: input.dims.l,
    quantity: input.quantity,
    notes: [input.note, `Nguồn: AI Studio · ${input.projectTitle} · ${input.version.label}`].filter(Boolean).join('\n'),
  });
}
