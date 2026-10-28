import { http, type ApiEnvelope } from '../../../shared/api'
import type { PodAddress, PodProfile, PrintMaterial, PrintRequest } from '../types'

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
    const response = await http.post<ApiEnvelope<PrintRequest>, FormData>(
      `/api/print/requests/getId/${printRequestId}/file/versions/create`,
      form,
      { params: { expectedCurrentFileVersion } },
    )
    return dataOf(response)
  },

  /**
   * Tạo yêu cầu in từ một tệp (dùng chung cho AI Studio & 3D Studio): tạo bản nháp → cập nhật thông số
   * (kích thước, màu, số lượng, ghi chú) → tuỳ chọn xác nhận xem trước + gửi thẩm định.
   * Mỗi bước sau bước tạo là best-effort: lỗi không xoá yêu cầu đã tạo, người dùng vẫn sửa tiếp ở module POD.
   */
  async createFromFile(
    file: File,
    materialId: number,
    spec: {
      color?: string
      quality?: string
      widthMm?: number
      heightMm?: number
      depthMm?: number
      quantity?: number
      notes?: string
    },
    options: { submit?: boolean } = {},
  ) {
    let request = await podService.createRequest(file, materialId, true)
    const workflow = (request as PrintRequest & { workflow?: { currentFileVersion?: number; currentSpecVersion?: number } })
      .workflow
    const fileVersion = workflow?.currentFileVersion ?? 1
    let specVersion = workflow?.currentSpecVersion ?? 1
    const item = request.items?.[0]
    if (item) {
      try {
        const updated = dataOf(
          await http.patch<ApiEnvelope<{ version?: number }>>(
            `/api/print/requests/getId/${request.printRequestId}/updateSpecification`,
            {
              expectedCurrentSpecVersion: specVersion,
              items: [{ printRequestItemId: item.printRequestItemId, materialId, ...spec }],
            },
          ),
        )
        if (updated?.version) specVersion = updated.version
      } catch {
        // giữ thông số mặc định
      }
    }
    if (options.submit) {
      const versions = { expectedFileVersion: fileVersion, expectedSpecVersion: specVersion }
      try {
        await http.post(`/api/print/requests/getId/${request.printRequestId}/preview/confirm`, versions)
        await http.post(`/api/print/requests/getId/${request.printRequestId}/submit`, versions)
      } catch {
        // chưa gửi được thẩm định → người dùng gửi lại ở module POD
      }
      request = await podService.getRequest(String(request.printRequestId)).catch(() => request)
    }
    return request
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
