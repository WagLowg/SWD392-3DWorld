import { http } from '../../services/http'

export { ApiClientError, type ApiErrorBody, type ApiFieldError, type PageResult } from '../../services/http'

type RequestOptions = Pick<RequestInit, 'method' | 'headers' | 'signal'> & {
  body?: unknown
  idempotencyKey?: string
}

/** @deprecated Code mới import `http` từ `services/http`. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = Object.fromEntries(new Headers(options.headers).entries())

  return http.request<T>({
    url: path,
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers,
    signal: options.signal ?? undefined,
    data: options.body,
    idempotencyKey: options.idempotencyKey,
  })
}
