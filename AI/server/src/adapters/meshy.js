import { config } from '../config.js';

/**
 * Adapter Meshy Open API (https://docs.meshy.ai). Không bao giờ trả API key ra frontend (NFR-04).
 */
export class ProviderError extends Error {
  /** @param ambiguous true khi không chắc provider đã tạo task hay chưa (timeout / 5xx). */
  constructor(code, message, { status, retryable = false, ambiguous = false } = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.ambiguous = ambiguous;
  }
}

const PATHS = { single: '/openapi/v1/image-to-3d', multi: '/openapi/v1/multi-image-to-3d' };

async function call(method, path, body, { timeoutMs = 30000 } = {}) {
  let res;
  try {
    res = await fetch(config.meshyBaseUrl + path, {
      method,
      headers: { Authorization: `Bearer ${config.meshyApiKey}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new ProviderError('PROVIDER_UNREACHABLE', 'Không kết nối được tới Meshy.', { retryable: true, ambiguous: true });
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (res.ok) return data;
  const msg = data?.message || `Meshy trả lỗi HTTP ${res.status}`;
  const s = res.status;
  if (s === 401 || s === 403) throw new ProviderError('PROVIDER_AUTH', 'API key Meshy không hợp lệ hoặc bị chặn.', { status: s });
  if (s === 402) throw new ProviderError('PROVIDER_NO_CREDITS', 'Tài khoản Meshy hết credit hoặc chưa có gói trả phí.', { status: s });
  if (s === 404) throw new ProviderError('PROVIDER_NOT_FOUND', 'Không tìm thấy tác vụ phía Meshy.', { status: s });
  if (s === 409) throw new ProviderError('PROVIDER_CONFLICT', msg, { status: s });
  if (s === 429) throw new ProviderError('PROVIDER_RATE_LIMIT', 'Meshy đang giới hạn tần suất, sẽ thử lại.', { status: s, retryable: true });
  if (s >= 500) throw new ProviderError('PROVIDER_UNAVAILABLE', 'Meshy tạm thời gặp sự cố.', { status: s, retryable: true, ambiguous: true });
  throw new ProviderError('PROVIDER_REJECTED', msg, { status: s });
}

/** Map cấu hình nội bộ → body Meshy. Chỉ gửi tham số được hỗ trợ (BR-06). */
function toMeshyBody(mode, imageDataUris, cfg) {
  const body = {
    ai_model: cfg.aiModel,
    should_texture: cfg.shouldTexture,
    enable_pbr: cfg.enablePbr,
    should_remesh: cfg.shouldRemesh,
    target_formats: cfg.targetFormats,
    moderation: cfg.moderation,
    pose_mode: cfg.poseMode,
  };
  if (cfg.geometryResolution !== 'standard') body.geometry_resolution = cfg.geometryResolution;
  if (cfg.shouldTexture) body.texture_resolution = cfg.textureResolution;
  if (cfg.shouldTexture && cfg.texturePrompt) body.texture_prompt = cfg.texturePrompt;
  if (cfg.shouldRemesh) {
    body.topology = cfg.topology;
    body.target_polycount = cfg.targetPolycount;
  }
  if (cfg.aiModel !== 'meshy-6-lite') {
    body.image_enhancement = cfg.imageEnhancement;
    body.remove_lighting = cfg.removeLighting;
  }
  if (mode === 'multi') body.image_urls = imageDataUris;
  else body.image_url = imageDataUris[0];
  return body;
}

const STATUS = { PENDING: 'PENDING', IN_PROGRESS: 'IN_PROGRESS', SUCCEEDED: 'SUCCEEDED', FAILED: 'FAILED', CANCELED: 'CANCELED' };

export function normalizeTask(t) {
  return {
    status: STATUS[t.status] || 'PENDING',
    progress: Number(t.progress || 0),
    modelUrls: t.model_urls || {},
    thumbnailUrl: t.thumbnail_url || null,
    textureUrls: t.texture_urls || [],
    errorMessage: t.task_error?.message || null,
    consumedCredits: t.consumed_credits ?? null,
    precedingTasks: t.preceding_tasks ?? null,
  };
}

export const meshyAdapter = {
  name: 'meshy',
  async create(mode, imageDataUris, cfg) {
    // POST tạo task có thể mất thời gian do upload data URI lớn
    const data = await call('POST', PATHS[mode], toMeshyBody(mode, imageDataUris, cfg), { timeoutMs: 120000 });
    if (!data?.result) throw new ProviderError('PROVIDER_BAD_RESPONSE', 'Meshy không trả về mã tác vụ.', { ambiguous: true });
    return data.result;
  },
  async get(mode, providerTaskId) {
    return normalizeTask(await call('GET', `${PATHS[mode]}/${encodeURIComponent(providerTaskId)}`));
  },
  async cancel(mode, providerTaskId) {
    await call('DELETE', `${PATHS[mode]}/${encodeURIComponent(providerTaskId)}`);
  },
  async balance() {
    return call('GET', '/openapi/v1/balance');
  },
};
