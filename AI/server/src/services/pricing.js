import { bad } from '../lib/http.js';

/**
 * Bảng giá credit nội bộ của 3DWorld (BR-07). Giá tính tại server, có priceVersion.
 * Mức hiện tại bám theo bảng giá công khai của Meshy (1 credit 3DWorld ≈ 1 credit Meshy).
 */
export const PRICE_VERSION = 'pv-2026-10-22';

export const MODELS = {
  latest: { label: 'Meshy 7.1 · Mới nhất', meshOnly: 20, tex: { '2k': 30, '4k': 30, '8k': 35 }, geo: ['standard', '2k', '4k'], multi: true },
  'meshy-6': { label: 'Meshy 6', meshOnly: 20, tex: { '2k': 30, '4k': 30, '8k': 35 }, geo: ['standard'], multi: true },
  'meshy-6-lite': { label: 'Meshy 6 Lite · Nhanh', meshOnly: 5, tex: { '2k': 15 }, geo: ['standard'], multi: true },
};

export const PRESETS = {
  fast: { aiModel: 'meshy-6-lite', textureResolution: '2k', geometryResolution: 'standard' },
  balanced: { aiModel: 'latest', textureResolution: '2k', geometryResolution: 'standard' },
  high: { aiModel: 'latest', textureResolution: '4k', geometryResolution: '2k' },
};

const FORMATS = ['glb', 'obj', 'fbx', 'stl', 'usdz', '3mf'];

/**
 * Chuẩn hóa + validate cấu hình người dùng gửi lên. Chỉ giữ tham số adapter hỗ trợ (BR-06).
 */
export function normalizeConfig(input = {}, mode = 'single') {
  const aiModel = MODELS[input.aiModel] ? input.aiModel : 'latest';
  const m = MODELS[aiModel];
  const shouldTexture = input.shouldTexture !== false;
  const textureResolution = shouldTexture ? String(input.textureResolution || '2k') : '2k';
  if (shouldTexture && !m.tex[textureResolution]) {
    throw bad('UNSUPPORTED_CONFIG', `Độ phân giải texture ${textureResolution} không hỗ trợ với ${m.label}.`);
  }
  let geometryResolution = String(input.geometryResolution || 'standard');
  if (!m.geo.includes(geometryResolution)) {
    throw bad('UNSUPPORTED_CONFIG', `Độ phân giải hình học ${geometryResolution} không hỗ trợ với ${m.label}.`);
  }
  if (mode === 'multi' && geometryResolution === '4k') {
    throw bad('UNSUPPORTED_CONFIG', 'Multi-View không hỗ trợ hình học 4K.');
  }
  const shouldRemesh = !!input.shouldRemesh;
  const targetPolycount = Math.round(Number(input.targetPolycount || 30000));
  if (shouldRemesh && (targetPolycount < 100 || targetPolycount > 300000)) {
    throw bad('UNSUPPORTED_CONFIG', 'Số đa giác phải nằm trong khoảng 100 – 300.000.');
  }
  const topology = input.topology === 'quad' ? 'quad' : 'triangle';
  const poseMode = ['a-pose', 't-pose'].includes(input.poseMode) ? input.poseMode : '';
  const texturePrompt = String(input.texturePrompt || '').slice(0, 800);
  let targetFormats = Array.isArray(input.targetFormats) ? input.targetFormats.filter((f) => FORMATS.includes(f)) : [];
  if (!targetFormats.includes('glb')) targetFormats = ['glb', ...targetFormats]; // GLB bắt buộc cho viewer
  return {
    aiModel,
    shouldTexture,
    enablePbr: shouldTexture && !!input.enablePbr,
    textureResolution,
    texturePrompt: shouldTexture ? texturePrompt : '',
    geometryResolution,
    shouldRemesh,
    topology,
    targetPolycount,
    poseMode,
    imageEnhancement: input.imageEnhancement !== false && aiModel !== 'meshy-6-lite',
    removeLighting: input.removeLighting !== false && aiModel !== 'meshy-6-lite',
    moderation: !!input.moderation,
    targetFormats,
  };
}

export function estimate(cfg, variants = 1) {
  const m = MODELS[cfg.aiModel];
  const base = cfg.shouldTexture ? m.tex[cfg.textureResolution] : m.meshOnly;
  const geoSurcharge = cfg.geometryResolution !== 'standard' ? 5 : 0;
  const perVariant = base + geoSurcharge;
  return {
    priceVersion: PRICE_VERSION,
    perVariant,
    variants,
    total: perVariant * variants,
    breakdown: [
      { label: cfg.shouldTexture ? `${m.label} · Mesh + Texture ${cfg.textureResolution.toUpperCase()}` : `${m.label} · Chỉ Mesh`, credits: base },
      ...(geoSurcharge ? [{ label: `Hình học ${cfg.geometryResolution.toUpperCase()}`, credits: geoSurcharge }] : []),
    ],
  };
}
