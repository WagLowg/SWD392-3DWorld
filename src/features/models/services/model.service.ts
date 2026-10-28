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
    return (await http.get<ApiEnvelope<VersionDetail>>(`/api/models/getId/${modelId}/versions/getId/${versionId}`, { signal })).data
  },

  /** Tải tệp có kiểm tra quyền (cần Bearer token) → trả Blob để lưu xuống máy. */
  async download(modelId: string, fileId: number) {
    return http.get<Blob>(`/api/models/${modelId}/files/${fileId}/download`, { responseType: 'blob', timeout: 120_000 })
  },

  /**
   * Backend hiện nhận duy nhất multipart part `file`; tên mô hình lấy từ tên tệp.
   */
  async upload(input: UploadInput, onProgress?: (percent: number) => void) {
    const form = new FormData()
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
