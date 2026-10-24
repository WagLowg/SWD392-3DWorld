import { Download, FileBox, Star } from 'lucide-react'
import { ApiClientError } from '../../../shared/api'
import { formatBytes } from '../../../shared/format'
import { useToast } from '../../../shared/ui/toast'
import { useDownloadModelFile } from '../hooks/useModels'
import { FILE_ROLE } from '../lib/labels'
import type { ModelFile } from '../types/model.types'

/** Danh sách tệp của một phiên bản + tải xuống có kiểm tra quyền. */
export function FileList({
  modelId,
  modelName,
  versionNumber,
  files,
}: {
  modelId: string
  modelName: string
  versionNumber: number
  files: ModelFile[]
}) {
  const download = useDownloadModelFile()
  const toast = useToast()
  if (!files.length)
    return <p className="rounded-2xl bg-surface-low p-4 text-sm text-ink-soft">Phiên bản này chưa có tệp.</p>

  const slug = modelName.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'model'
  return (
    <ul className="space-y-2">
      {files.map((f) => (
        <li key={f.fileId} className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-low p-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white font-mono text-[11px] font-bold uppercase text-violet">
            {f.fileFormat}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <FileBox size={14} className="text-ink-soft" /> {FILE_ROLE[f.fileRole] ?? f.fileRole}
              {f.isPrimary && (
                <span className="inline-flex items-center gap-1 rounded-full bg-peach px-2 py-0.5 font-label text-[10px] text-orange-deep">
                  <Star size={10} /> Chính
                </span>
              )}
            </span>
            <span className="font-mono text-[11px] text-ink-soft">
              file_{f.fileId} · {formatBytes(f.fileSize)}
            </span>
          </span>
          <button
            type="button"
            disabled={download.isPending}
            onClick={() =>
              download
                .mutateAsync({
                  modelId,
                  fileId: f.fileId,
                  filename: `${slug}-v${versionNumber}.${f.fileFormat.toLowerCase()}`,
                })
                .catch((e) => toast(e instanceof ApiClientError ? e.message : 'Không tải được tệp.', 'error'))
            }
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 font-label text-xs font-semibold text-white hover:bg-violet disabled:opacity-50"
          >
            <Download size={13} /> Tải tệp
          </button>
        </li>
      ))}
    </ul>
  )
}
