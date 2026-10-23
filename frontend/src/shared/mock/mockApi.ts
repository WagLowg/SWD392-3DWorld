/**
 * Lớp dữ liệu mẫu cho các màn chưa có API trong OpenAPI (Stitch nhóm 2).
 * Service của từng feature gọi các hàm này thay cho `http`; khi Backend có API,
 * chỉ cần đổi phần thân service sang `http.get/post…` — hook & page giữ nguyên.
 */
export const MOCK_LATENCY = 280

export function mockResponse<T>(data: T, ms = MOCK_LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms))
}

export class MockNotFoundError extends Error {
  status = 404
}

export function mockFind<T>(list: T[], match: (item: T) => boolean, label = 'Bản ghi'): Promise<T> {
  const found = list.find(match)
  if (!found) return Promise.reject(new MockNotFoundError(`${label} không tồn tại.`))
  return mockResponse(found)
}

let seq = 1000
export function mockId(prefix: string) {
  seq += 1
  return `${prefix}-${seq}`
}

export function nowIso(offsetHours = 0) {
  return new Date(Date.now() - offsetHours * 3600_000).toISOString()
}
