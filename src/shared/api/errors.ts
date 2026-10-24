import axios from 'axios'
import { ApiClientError, type ApiErrorBody } from './types'

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== 'object') return false
  const body = value as Partial<ApiErrorBody>
  return typeof body.code === 'string' && typeof body.message === 'string'
}

export function normalizeHttpError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error

  if (axios.isCancel(error)) {
    return new ApiClientError(0, {
      code: 'REQUEST_CANCELLED',
      message: 'Yêu cầu đã được hủy.',
    })
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0
    const responseBody: unknown = error.response?.data
    const correlationHeader = error.response?.headers?.['x-correlation-id']

    if (isApiErrorBody(responseBody)) {
      return new ApiClientError(status, {
        ...responseBody,
        correlationId: responseBody.correlationId ?? correlationHeader,
      })
    }

    // Envelope { status, message, data } của Backend mới không có `code`
    const envelopeMessage =
      responseBody &&
      typeof responseBody === 'object' &&
      typeof (responseBody as { message?: unknown }).message === 'string'
        ? (responseBody as { message: string }).message
        : undefined
    if (status && envelopeMessage) {
      return new ApiClientError(status, {
        code: `HTTP_${status}`,
        message: envelopeMessage,
        correlationId: correlationHeader,
      })
    }

    return new ApiClientError(status, {
      code: status ? `HTTP_${status}` : 'NETWORK_ERROR',
      message: status
        ? 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.'
        : 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền.',
      correlationId: correlationHeader,
    })
  }

  return new ApiClientError(0, {
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.',
  })
}
