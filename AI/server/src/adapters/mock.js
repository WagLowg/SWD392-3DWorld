import crypto from 'node:crypto';
import { ProviderError } from './meshy.js';

/**
 * Adapter MOCK: mô phỏng vòng đời task Meshy (PENDING → IN_PROGRESS → SUCCEEDED) mà không gọi mạng.
 * Trạng thái được suy ra từ thời điểm tạo ghi trong id nên vẫn đúng sau khi restart server.
 */
const QUEUE_MS = 3000;
const RUN_MS = 15000;
const cancelled = new Set();

const parse = (id) => Number(id.split('-')[2]);

export const mockAdapter = {
  name: 'mock',
  async create(mode) {
    return `mock-${mode}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  },
  async get(_mode, id) {
    const t0 = parse(id);
    if (!t0) throw new ProviderError('PROVIDER_NOT_FOUND', 'Không tìm thấy tác vụ.');
    if (cancelled.has(id)) return { status: 'CANCELED', progress: 0, modelUrls: {}, thumbnailUrl: null, errorMessage: null };
    const el = Date.now() - t0;
    if (el < QUEUE_MS) return { status: 'PENDING', progress: 0, modelUrls: {}, thumbnailUrl: null, errorMessage: null, precedingTasks: 1 };
    if (el < QUEUE_MS + RUN_MS) {
      return { status: 'IN_PROGRESS', progress: Math.min(99, Math.round(((el - QUEUE_MS) / RUN_MS) * 100)), modelUrls: {}, thumbnailUrl: null, errorMessage: null };
    }
    return {
      status: 'SUCCEEDED',
      progress: 100,
      modelUrls: { glb: `mock://glb/${id}`, stl: `mock://stl/${id}` },
      thumbnailUrl: null,
      errorMessage: null,
    };
  },
  async cancel(_mode, id) {
    if (Date.now() - parse(id) >= QUEUE_MS) {
      throw new ProviderError('PROVIDER_CONFLICT', 'Tác vụ đang xử lý, không thể hủy.', { status: 409 });
    }
    cancelled.add(id);
  },
  async balance() {
    return { balance: null, mock: true };
  },
};
