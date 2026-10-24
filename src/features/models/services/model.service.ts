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
      await http.get<ApiEnvelope<Paged<ModelSummary>>>(`/api/models/my${toQueryString({ page, size })}`, { signal })
    ).data
  },

  async detail(modelId: string, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<ModelDetail>>(`/api/models/${modelId}`, { signal })).data
  },

  async versions(modelId: string, page: number, size: number, signal?: AbortSignal) {
    return (
      await http.get<ApiEnvelope<Paged<VersionSummary>>>(
        `/api/models/${modelId}/versions${toQueryString({ page, size })}`,
        { signal },
      )
    ).data
  },

  async version(modelId: string, versionId: number | string, signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<VersionDetail>>(`/api/models/${modelId}/versions/${versionId}`, { signal })).data
  },

  /** Tải tệp có kiểm tra quyền (cần Bearer token) → trả Blob để lưu xuống máy. */
  async download(modelId: string, fileId: number) {
    return http.get<Blob>(`/api/models/${modelId}/files/${fileId}/download`, { responseType: 'blob', timeout: 120_000 })
  },

  /**
   * Multipart: part `metadata` (JSON CreateModelRequest) + part `file`.
   * Backend chấp nhận .glb .stl .obj .3mf, tối đa 50.000.000 byte.
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
      await http.post<ApiEnvelope<UploadResult>, FormData>('/api/models/uploads', form, {
        timeout: 300_000,
        onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      })
    ).data
  },
}

export const MODEL_FORMATS = ['glb', 'stl', 'obj', '3mf'] as const
export const MODEL_MAX_BYTES = 50_000_000
