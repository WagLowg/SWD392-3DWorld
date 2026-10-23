import type { FileRole, OriginType, VersionSource } from '../types/model.types'

export const ORIGIN: Record<OriginType, { label: string; tone: string }> = {
  UPLOAD: { label: 'Tải lên trực tiếp', tone: 'bg-teal-soft text-teal' },
  EDITOR: { label: '3D Studio Editor', tone: 'bg-violet-soft text-violet' },
  AI: { label: 'AI Generator', tone: 'bg-peach text-orange-deep' },
}

export const SOURCE: Record<VersionSource, string> = {
  UPLOAD: 'Tải lên',
  EDITOR_SAVE: 'Lưu từ 3D Studio',
  AI_GENERATED: 'Sinh bởi AI',
}

export const FILE_ROLE: Record<FileRole, string> = {
  EDITABLE_SCENE: 'Scene chỉnh sửa (3D Studio)',
  VIEWABLE_MODEL: 'Mô hình xem trước',
  PRINT_MODEL: 'Tệp in 3D',
  SOURCE_MODEL: 'Tệp gốc',
  PREVIEW: 'Ảnh xem trước',
}

export function modelCode(id: number) {
  return `mdl_${id}`
}
