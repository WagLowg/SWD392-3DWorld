import { ArrowLeft, ChevronDown, GitBranch, GitCommitVertical } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { formatDateTime } from '../../../shared/format'
import { Pagination } from '../../../shared/ui/Pagination'
import { Breadcrumbs, PageHeading } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { FileList } from '../components/FileList'
import { useModel, useModelVersion, useModelVersions } from '../hooks/useModels'
import { SOURCE } from '../lib/labels'
import type { VersionSummary } from '../types/model.types'

const SOURCE_TONE: Record<string, string> = {
  UPLOAD: 'bg-teal-soft text-teal',
  EDITOR_SAVE: 'bg-violet-soft text-violet',
  AI_GENERATED: 'bg-peach text-orange-deep',
}

/** CR-012 · Lịch Sử Phả Hệ Phiên Bản */
export function ModelVersionsPage() {
  const { modelId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const page = Math.max(0, Number(params.get('page') ?? 1) - 1) || 0
  const model = useModel(modelId)
  const versions = useModelVersions(modelId, page)
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    document.title = 'Lịch sử phiên bản · Thư viện 3D'
  }, [])

  const latest = model.data?.latestVersion?.modelVersionId

  return (
    <>
      <Breadcrumbs
        items={[
          {
            label: 'Thư viện 3D',
            render: (l) => (
              <Link to="/models" className="hover:text-violet">
                {l}
              </Link>
            ),
          },
          {
            label: model.data?.modelName ?? '…',
            render: (l) => (
              <Link to={`/models/${modelId}`} className="hover:text-violet">
                {l}
              </Link>
            ),
          },
          { label: 'Lịch sử phiên bản' },
        ]}
      />
      <div className="mt-6">
        <PageHeading
          eyebrow="Phả hệ phiên bản mô hình"
          title="Lịch Sử Phiên Bản"
          accent={model.data?.modelName ?? ''}
          description="Mỗi lần tải lên, lưu từ 3D Studio hoặc sinh bằng AI tạo một phiên bản mới, liên kết với phiên bản cha."
          aside={
            <Link
              to={`/models/${modelId}`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 font-label text-xs font-semibold shadow-soft"
            >
              <ArrowLeft size={14} /> Chi tiết mô hình
            </Link>
          }
        />
      </div>

      <div className="mt-8">
        <QueryState isLoading={versions.isLoading} error={versions.error} onRetry={() => versions.refetch()}>
          {!versions.data?.content.length ? (
            <StatusBlock tone="empty" title="Chưa có phiên bản" body="Mô hình chưa có phiên bản nào." />
          ) : (
            <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-[27px] before:top-6 before:w-0.5 before:bg-line">
              {versions.data.content.map((v) => (
                <VersionRow
                  key={v.modelVersionId}
                  modelId={modelId}
                  modelName={model.data?.modelName ?? 'model'}
                  version={v}
                  latest={v.modelVersionId === latest}
                  open={open === v.modelVersionId}
                  onToggle={() => setOpen(open === v.modelVersionId ? null : v.modelVersionId)}
                />
              ))}
            </ol>
          )}
          {versions.data && (
            <Pagination
              page={versions.data.page}
              totalPages={versions.data.totalPages}
              onChange={(p) => setParams(p > 0 ? { page: String(p + 1) } : {})}
            />
          )}
        </QueryState>
      </div>
    </>
  )
}

function VersionRow({
  modelId,
  modelName,
  version: v,
  latest,
  open,
  onToggle,
}: {
  modelId: string
  modelName: string
  version: VersionSummary
  latest: boolean
  open: boolean
  onToggle: () => void
}) {
  const detail = useModelVersion(modelId, open ? v.modelVersionId : undefined)
  return (
    <li className="relative pl-16">
      <span
        className={`absolute left-0 top-4 grid h-14 w-14 place-items-center rounded-full font-display text-sm font-bold ${
          latest ? 'bg-orange text-white ring-4 ring-peach' : 'bg-white text-ink shadow-soft'
        }`}
      >
        v{v.versionNumber}
      </span>
      <div className="rounded-[1.75rem] bg-white/95 p-5 shadow-soft">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full flex-wrap items-center gap-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-lg font-bold">Phiên bản {v.versionNumber}</span>
              {latest && (
                <span className="rounded-full bg-orange px-2.5 py-0.5 font-label text-[10px] font-semibold text-white">
                  MỚI NHẤT
                </span>
              )}
              <span
                className={`rounded-full px-2.5 py-0.5 font-label text-[11px] font-semibold ${SOURCE_TONE[v.sourceType] ?? ''}`}
              >
                {SOURCE[v.sourceType] ?? v.sourceType}
              </span>
            </span>
            <span className="mt-1 block text-sm text-ink-soft">{v.changeNote || 'Không có ghi chú thay đổi.'}</span>
            <span className="mt-1 flex flex-wrap gap-x-4 font-mono text-[11px] text-ink-soft">
              <span className="inline-flex items-center gap-1">
                <GitCommitVertical size={12} /> ver_{v.modelVersionId}
              </span>
              {v.parentVersionId && (
                <span className="inline-flex items-center gap-1">
                  <GitBranch size={12} /> từ ver_{v.parentVersionId}
                </span>
              )}
              <span>{formatDateTime(v.createdAt)}</span>
            </span>
          </span>
          <ChevronDown size={18} className={`transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="mt-4 border-t border-line pt-4">
            <QueryState isLoading={detail.isLoading} error={detail.error} onRetry={() => detail.refetch()}>
              {detail.data && (
                <FileList
                  modelId={modelId}
                  modelName={modelName}
                  versionNumber={v.versionNumber}
                  files={detail.data.files}
                />
              )}
            </QueryState>
            <a
              href={`/pod/new?versionId=${v.modelVersionId}`}
              className="mt-3 inline-block font-label text-xs font-semibold text-violet"
            >
              Đặt in phiên bản này →
            </a>
          </div>
        )}
      </div>
    </li>
  )
}
