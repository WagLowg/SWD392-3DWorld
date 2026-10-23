import axios, { type AxiosRequestConfig } from 'axios'
import { env } from '../../config/env'
import { tokenStore } from '../auth/token'
import { normalizeHttpError } from './errors'

export type HttpRequestConfig<Data = unknown> = AxiosRequestConfig<Data> & {
  idempotencyKey?: string
}

export const axiosClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

/** API công khai: không gửi token (Backend từ chối token hỏng kể cả ở endpoint permitAll). */
const PUBLIC_AUTH = /\/api\/auth\/(login|register|verify-email|resend-verification|forgot-password|reset-password)$/

// Backend mới xác thực bằng JWT Bearer; cookie phiên vẫn được gửi kèm (withCredentials) cho Backend cũ.
axiosClient.interceptors.request.use((config) => {
  if (PUBLIC_AUTH.test(config.url ?? '')) return config
  const token = tokenStore.get()
  if (token && !config.headers.has('Authorization')) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

axiosClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const normalized = normalizeHttpError(error)
    // Token hết hạn / bị thu hồi → bỏ token, đánh dấu phiên hết hạn (MP-104).
    // Không áp dụng cho 401 "A valid Bearer token is required" (lỗi khác của Backend, vd. /api/catalog).
    if (normalized.status === 401 && /invalid|expired|revoked/i.test(normalized.message)) tokenStore.expire()
    return Promise.reject(normalized)
  },
)

function prepareConfig<Data>(config: HttpRequestConfig<Data>): AxiosRequestConfig<Data> {
  const { idempotencyKey, ...axiosConfig } = config

  if (!idempotencyKey) return axiosConfig

  return {
    ...axiosConfig,
    headers: {
      ...axiosConfig.headers,
      'Idempotency-Key': idempotencyKey,
    },
  }
}

async function request<Response, Data = unknown>(config: HttpRequestConfig<Data>): Promise<Response> {
  const response = await axiosClient.request<Response, { data: Response }, Data>(prepareConfig(config))
  return response.data
}

export const http = {
  request,

  get<Response>(url: string, config: HttpRequestConfig = {}) {
    return request<Response>({ ...config, method: 'GET', url })
  },

  post<Response, Data = unknown>(url: string, data?: Data, config: HttpRequestConfig<Data> = {}) {
    return request<Response, Data>({ ...config, method: 'POST', url, data })
  },

  put<Response, Data = unknown>(url: string, data?: Data, config: HttpRequestConfig<Data> = {}) {
    return request<Response, Data>({ ...config, method: 'PUT', url, data })
  },

  patch<Response, Data = unknown>(url: string, data?: Data, config: HttpRequestConfig<Data> = {}) {
    return request<Response, Data>({ ...config, method: 'PATCH', url, data })
  },

  delete<Response>(url: string, config: HttpRequestConfig = {}) {
    return request<Response>({ ...config, method: 'DELETE', url })
  },
}
