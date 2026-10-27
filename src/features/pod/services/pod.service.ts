import { http, type ApiEnvelope } from '../../../shared/api'
import type {
  PodAddress,
  PodPayment,
  PodPaymentStatus,
  PodProfile,
  PrintFileVersion,
  PrintMaterial,
  PrintQuote,
  PrintRequest,
  PrintSpecificationVersion,
  PrintStatusHistory,
  UpdatePrintSpecificationInput,
} from '../types'

type PageLike<T> = {
  content?: T[]
  items?: T[]
  page?: number
  number?: number
  totalPages?: number
  totalElements?: number
}

function dataOf<T>(response: ApiEnvelope<T> | T): T {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<T>).data
    : (response as T)
}

function listOf<T>(response: ApiEnvelope<PageLike<T> | T[]> | PageLike<T> | T[]): T[] {
  const data = dataOf(response)
  if (Array.isArray(data)) return data
  return data.content ?? data.items ?? []
}

/** Backend giới hạn size 1–50 cho các API phân trang của POD. */
export const podService = {
  async listMaterials(technologyCode?: string, signal?: AbortSignal) {
    const response = await http.get<ApiEnvelope<PageLike<PrintMaterial> | PrintMaterial[]>>(
      '/api/print/materials/getAll',
      { params: { technologyCode: technologyCode || undefined, page: 0, size: 50 }, signal },
    )
    return listOf(response)
  },

  async getMaterial(materialId: string, signal?: AbortSignal) {
    const response = await http.get<ApiEnvelope<PrintMaterial>>(`/api/print/materials/getId/${materialId}`, {
      signal,
    })
    return dataOf(response)
  },

  async createRequest(file: File, materialId: number, rightsDeclarationAccepted: boolean) {
    const form = new FormData()
    form.append('file', file)
    const response = await http.post<ApiEnvelope<PrintRequest>, FormData>('/api/print/requests/create', form, {
      params: { materialId, rightsDeclarationAccepted },
    })
    return dataOf(response)
  },

  async listRequests(signal?: AbortSignal) {
    const response = await http.get<ApiEnvelope<PageLike<PrintRequest> | PrintRequest[]>>(
      '/api/print/requests/getAll',
      { params: { page: 0, size: 50 }, signal },
    )
    return listOf(response)
  },

  async getRequest(printRequestId: string, signal?: AbortSignal) {
    const response = await http.get<ApiEnvelope<PrintRequest>>(
      `/api/print/requests/getId/${printRequestId}`,
      { signal },
    )
    return dataOf(response)
  },

  async replaceRequestFile(printRequestId: string, expectedCurrentFileVersion: number, file: File) {
    const form = new FormData()
    form.append('file', file)
    const response = await http.post<ApiEnvelope<PrintFileVersion>, FormData>(
      `/api/print/requests/getId/${printRequestId}/file/versions/create`,
      form,
      { params: { expectedCurrentFileVersion } },
    )
    return dataOf(response)
  },

  async listFileVersions(printRequestId: string, signal?: AbortSignal) {
    const response = await http.get<ApiEnvelope<PrintFileVersion[]>>(
      `/api/print/requests/getId/${printRequestId}/file/versions/getAll`,
      { signal },
    )
    return dataOf(response)
  },

  async downloadFileVersion(printRequestId: string, version: number) {
    return http.get<Blob>(
      `/api/print/requests/getId/${printRequestId}/file/versions/${version}/download`,
      { responseType: 'blob' },
    )
  },

  async updateSpecification(printRequestId: string, input: UpdatePrintSpecificationInput) {
    const response = await http.patch<ApiEnvelope<PrintSpecificationVersion>>(
      `/api/print/requests/getId/${printRequestId}/updateSpecification`,
      input,
    )
    return dataOf(response)
  },

  async listSpecificationVersions(printRequestId: string, signal?: AbortSignal) {
    const response = await http.get<ApiEnvelope<PrintSpecificationVersion[]>>(
      `/api/print/requests/getId/${printRequestId}/specifications/versions/getAll`,
      { signal },
    )
    return dataOf(response)
  },

  async confirmPreview(printRequestId: string, expectedFileVersion: number, expectedSpecVersion: number) {
    const response = await http.post<ApiEnvelope<unknown>>(
      `/api/print/requests/getId/${printRequestId}/preview/confirm`,
      { expectedFileVersion, expectedSpecVersion },
    )
    return dataOf(response)
  },

  async submitRequest(printRequestId: string, expectedFileVersion: number, expectedSpecVersion: number) {
    const response = await http.post<ApiEnvelope<unknown>>(
      `/api/print/requests/getId/${printRequestId}/submit`,
      { expectedFileVersion, expectedSpecVersion },
    )
    return dataOf(response)
  },

  async cancelRequest(printRequestId: string, reason: string) {
    const response = await http.post<ApiEnvelope<unknown>>(
      `/api/print/requests/getId/${printRequestId}/cancel`,
      { reason },
    )
    return dataOf(response)
  },

  async listStatusHistory(printRequestId: string, signal?: AbortSignal) {
    const response = await http.get<ApiEnvelope<PrintStatusHistory[]>>(
      `/api/print/requests/getId/${printRequestId}/status-history/getAll`,
      { signal },
    )
    return dataOf(response)
  },

  async listQuotes(printRequestId: string, signal?: AbortSignal) {
    const response = await http.get<ApiEnvelope<PrintQuote[]>>(
      `/api/print/requests/getId/${printRequestId}/quotes/getAll`,
      { signal },
    )
    return dataOf(response)
  },

  async acceptQuote(printRequestId: string, quoteId: number) {
    const response = await http.post<ApiEnvelope<PrintQuote>>(
      `/api/print/requests/getId/${printRequestId}/quotes/${quoteId}/accept`,
    )
    return dataOf(response)
  },

  async requestQuoteRevision(
    printRequestId: string,
    quoteId: number,
    input: { expectedFileVersion: number; expectedSpecVersion: number; reason: string },
  ) {
    const response = await http.post<ApiEnvelope<PrintQuote>>(
      `/api/print/requests/getId/${printRequestId}/quotes/${quoteId}/request-revision`,
      input,
    )
    return dataOf(response)
  },

  async createPodPayment(printRequestId: number) {
    const response = await http.post<ApiEnvelope<PodPayment>>('/api/payments/zalopay', {
      sourceType: 'PRINT_REQUEST',
      sourceId: printRequestId,
      stage: 'FULL',
      description: `Thanh toán 100% yêu cầu in POD-${printRequestId}`,
      idempotencyKey: crypto.randomUUID(),
    })
    return dataOf(response)
  },

  async getPodPaymentStatus(printRequestId: string, signal?: AbortSignal) {
    const response = await http.get<ApiEnvelope<PodPaymentStatus>>(
      `/api/payments/print-requests/${printRequestId}`,
      { signal },
    )
    return dataOf(response)
  },

  async selectShippingAddress(printRequestId: string, addressId: number) {
    const response = await http.patch<ApiEnvelope<{ printRequestId: number; shippingAddressId: number }>>(
      `/api/print/requests/getId/${printRequestId}/updateShippingAddress`,
      { addressId },
    )
    return dataOf(response)
  },

  async getProfile(signal?: AbortSignal) {
    const response = await http.get<ApiEnvelope<PodProfile>>('/api/users/me', { signal })
    return dataOf(response)
  },

  async updateProfile(input: Pick<PodProfile, 'fullName' | 'phone' | 'dateOfBirth'>) {
    const response = await http.patch<ApiEnvelope<PodProfile>>('/api/users/me', input)
    return dataOf(response)
  },

  async listAddresses(signal?: AbortSignal) {
    const response = await http.get<ApiEnvelope<PodAddress[]>>('/api/users/me/addresses', { signal })
    return dataOf(response)
  },

  async createAddress(input: Omit<PodAddress, 'id' | 'addressId' | 'isDefault'>) {
    const response = await http.post<ApiEnvelope<PodAddress>>('/api/users/me/addresses', input)
    return dataOf(response)
  },

  async setDefaultAddress(id: number) {
    const response = await http.post<ApiEnvelope<PodAddress>>(`/api/users/me/addresses/${id}/default`)
    return dataOf(response)
  },

  async createGeneralReport(name: string, description: string) {
    const response = await http.post<ApiEnvelope<unknown>>('/api/reports', { name, description })
    return dataOf(response)
  },
}
