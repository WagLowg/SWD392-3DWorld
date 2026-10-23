import axios, { type AxiosRequestConfig } from 'axios'
import { env } from '../config/env'
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

axiosClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeHttpError(error)),
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
