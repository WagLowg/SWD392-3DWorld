import { config } from '../config.js';
import { meshyAdapter } from './meshy.js';
import { mockAdapter } from './mock.js';

const adapters = { meshy: meshyAdapter, mock: mockAdapter };

/** Adapter cho task mới, theo cấu hình hiện tại. */
export const currentAdapter = () => adapters[config.providerMode];

/** Adapter của task đã tạo (giữ nguyên provider ban đầu kể cả khi đổi cấu hình). */
export const adapterFor = (name) => adapters[name] || adapters.mock;
