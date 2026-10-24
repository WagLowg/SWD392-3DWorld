export type ApiFieldError = {
  field: string
  message: string
}

export type ApiErrorBody = {
  code: string
  message: string
  fieldErrors?: ApiFieldError[]
  correlationId?: string
}

export type PageResult<T> = {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message)
    this.name = 'ApiClientError'
  }
}

/** Envelope chung của Backend OpenAPI: { status, message, data, timestamp }. */
export type ApiEnvelope<T> = {
  status: number
  message: string
  data: T
  timestamp: string
}
