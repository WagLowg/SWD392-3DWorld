import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../../shared/session/useSession'
import { modelService } from '../services/model.service'
import type { UploadInput } from '../types/model.types'

export const modelKeys = {
  mine: (page: number, size: number) => ['models', 'mine', page, size] as const,
  detail: (id: string) => ['models', id] as const,
  versions: (id: string, page: number) => ['models', id, 'versions', page] as const,
  version: (id: string, versionId: number | string) => ['models', id, 'version', versionId] as const,
}

export function useMyModels(page: number, size = 12) {
  const { data: user } = useSession()
  return useQuery({
    queryKey: modelKeys.mine(page, size),
    queryFn: ({ signal }) => modelService.mine(page, size, signal),
    enabled: !!user,
    placeholderData: keepPreviousData,
  })
}

export function useModel(modelId: string | undefined) {
  return useQuery({
    queryKey: modelKeys.detail(modelId ?? ''),
    queryFn: ({ signal }) => modelService.detail(modelId as string, signal),
    enabled: !!modelId,
  })
}

export function useModelVersions(modelId: string | undefined, page: number, size = 10) {
  return useQuery({
    queryKey: modelKeys.versions(modelId ?? '', page),
    queryFn: ({ signal }) => modelService.versions(modelId as string, page, size, signal),
    enabled: !!modelId,
    placeholderData: keepPreviousData,
  })
}

export function useModelVersion(modelId: string | undefined, versionId: number | string | undefined) {
  return useQuery({
    queryKey: modelKeys.version(modelId ?? '', versionId ?? ''),
    queryFn: ({ signal }) => modelService.version(modelId as string, versionId as number, signal),
    enabled: !!modelId && versionId !== undefined && versionId !== null,
  })
}

export function useUploadModel(onProgress?: (p: number) => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UploadInput) => modelService.upload(input, onProgress),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['models', 'mine'] }),
  })
}

/** Tải tệp về máy (Blob → link tạm). */
export function useDownloadModelFile() {
  return useMutation({
    mutationFn: async ({ modelId, fileId, filename }: { modelId: string; fileId: number; filename: string }) => {
      const blob = await modelService.download(modelId, fileId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    },
  })
}
