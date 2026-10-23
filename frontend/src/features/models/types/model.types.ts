export type ModelType = 'WEB_EDITOR' | 'AI_GENERATOR'
export type OriginType = 'UPLOAD' | 'EDITOR' | 'AI'
export type VersionSource = 'UPLOAD' | 'EDITOR_SAVE' | 'AI_GENERATED'
export type FileRole = 'EDITABLE_SCENE' | 'VIEWABLE_MODEL' | 'PRINT_MODEL' | 'SOURCE_MODEL' | 'PREVIEW'

export type Paged<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type ModelSummary = {
  modelId: number
  modelName: string
  description?: string | null
  modelType: ModelType
  originType: OriginType
  visibility: string
  createdAt: string
}

export type ModelDetail = ModelSummary & {
  latestVersion?: { modelVersionId: number; versionNumber: number; sourceType: VersionSource } | null
  updatedAt: string
}

export type VersionSummary = {
  modelVersionId: number
  versionNumber: number
  sourceType: VersionSource
  parentVersionId?: number | null
  changeNote?: string | null
  createdAt: string
}

export type ModelFile = {
  fileId: number
  fileRole: FileRole
  fileFormat: string
  fileSize: number
  isPrimary: boolean
}

export type VersionDetail = VersionSummary & {
  modelId: number
  files: ModelFile[]
}

export type UploadResult = {
  modelId: number
  modelVersionId: number
  fileId: number
  modelName: string
  versionNumber: number
  fileFormat: string
  fileSize: number
  visibility: string
  createdAt: string
}

export type UploadInput = {
  modelName: string
  description?: string
  file: File
}
