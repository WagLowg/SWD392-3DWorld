import { toQueryString } from '../../../shared/lib/query'
import { type ApiEnvelope, http } from '../../../shared/api'
import type {
  ModelDetail,
  ModelSummary,
  Paged,
  UploadInput,
  UploadResult,
  VersionDetail,
  VersionSummary,
} from '../types/model.types'

export const modelService = {
  async mine(page: number, size: number, signal?: AbortSignal) {
    return (
      await http.get<ApiEnvelope<Paged<ModelSummary>>>(`/api/models/getAll${toQueryString({ page, size })}`, { signal })
    ).data
  },

  async detail(modelId: string, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<ModelDetail>>(`/api/models/getId/${modelId}`, { signal })).data
  },

  async versions(modelId: string, page: number, size: number, signal?: AbortSignal) {
    return (
      await http.get<ApiEnvelope<Paged<VersionSummary>>>(
        `/api/models/getId/${modelId}/versions/getAll${toQueryString({ page, size })}`,
        { signal },
      )
    ).data
  },

  async version(modelId: string, versionId: number | string, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<VersionDetail>>(`/api/models/getId/${modelId}/versions/getId/${versionId}`, { signal }))
      .data
  },

  /** Tải tệp có kiểm tra quyền (cần Bearer token) → trả Blob để lưu xuống máy. */
  async download(modelId: string, fileId: number) {
    return http.get<Blob>(`/api/models/${modelId}/files/${fileId}/download`, { responseType: 'blob', timeout: 120_000 })
  },

  /**
   * POST /api/models/create — multipart `file` (OpenAPI chỉ khai báo `file`; part `metadata` gửi kèm để Backend
   * dùng tên/mô tả nếu hỗ trợ). Backend chấp nhận .glb .stl .obj .3mf, tối đa 50.000.000 byte.
   */
  async upload(input: UploadInput, onProgress?: (percent: number) => void) {
    const form = new FormData()
    form.append(
      'metadata',
      new Blob([JSON.stringify({ modelName: input.modelName, description: input.description || null })], {
        type: 'application/json',
      }),
    )
    form.append('file', input.file)
    return (
      await http.post<ApiEnvelope<UploadResult>, FormData>('/api/models/create', form, {
        timeout: 300_000,
        onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      })
    ).data
  },
}

export const MODEL_FORMATS = ['glb', 'stl', 'obj', '3mf'] as const
export const MODEL_MAX_BYTES = 50_000_000
