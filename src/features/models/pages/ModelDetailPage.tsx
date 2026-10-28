import { ArrowLeft, ArrowRight, History, Lock, Printer, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDateTime } from '../../../shared/lib/format'
import { ApiNote, Breadcrumbs } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import { FileList } from '../components/FileList'
import { ModelPreview } from '../components/ModelPreview'
import { useModel, useModelVersion } from '../hooks/useModels'
import { modelCode, ORIGIN, SOURCE } from '../lib/labels'

/** MP 037 · Chi Tiết Mô Hình 3D */
export function ModelDetailPage() {
  const { modelId = '' } = useParams()
  const model = useModel(modelId)
  const latestId = model.data?.latestVersion?.modelVersionId
  const version = useModelVersion(modelId, latestId)

  useEffect(() => {
    if (model.data) document.title = `${model.data.modelName} · Thư viện 3D`
  }, [model.data])

  return (
    <QueryState isLoading={model.isLoading} error={model.error} onRetry={() => model.refetch()}>
      {model.data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
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
                { label: model.data.modelName },
              ]}
            />
            <Link
              to="/models"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-label text-xs font-semibold shadow-soft"
            >
              <ArrowLeft size={14} /> Quay lại thư viện
            </Link>
          </div>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4">
              <div className="rounded-[2.5rem] bg-white/90 p-4 shadow-soft">
                {version.data ? (
                  <ModelPreview modelId={modelId} files={version.data.files} />
                ) : (
                  <div className="aspect-[4/3] animate-pulse rounded-[2rem] bg-surface-mid" />
                )}
              </div>
              <p className="flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-xs text-ink-soft">
                <Lock size={14} className="text-violet" /> Tệp riêng tư — chỉ chủ sở hữu tải xuống được, tệp không được
                bán trên Chợ Đồ Chơi.
              </p>
            </div>

            <div className="space-y-4">
              <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft sm:p-8">
                <div className="flex flex-wrap gap-2">
                  {model.data.originType && (
                    <span
                      className={`rounded-full px-3 py-1 font-label text-xs font-semibold ${ORIGIN[model.data.originType]?.tone ?? ''}`}
                    >
                      {ORIGIN[model.data.originType]?.label ?? model.data.originType}
                    </span>
                  )}
                  <span className="rounded-full bg-surface-low px-3 py-1 font-label text-xs font-semibold">
                    {model.data.visibility}
                  </span>
                </div>
                <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">{model.data.modelName}</h1>
                <p className="mt-1 font-mono text-xs text-ink-soft">model_id: {modelCode(model.data.modelId)}</p>
                <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                  {model.data.description || 'Chưa có mô tả.'}
                </p>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <Meta
                    label="Phiên bản mới nhất"
                    value={model.data.latestVersion ? `v${model.data.latestVersion.versionNumber}` : '—'}
                  />
                  <Meta
                    label="Nguồn phiên bản"
                    value={model.data.latestVersion ? SOURCE[model.data.latestVersion.sourceType] : '—'}
                  />
                  <Meta label="Tạo lúc" value={formatDateTime(model.data.createdAt)} />
                  <Meta label="Cập nhật" value={formatDateTime(model.data.updatedAt)} />
                </dl>
                <div className="mt-6 flex flex-wrap gap-2">
                  {latestId && (
                    <a
                      href={`/pod/new?versionId=${latestId}`}
                      className="inline-flex items-center gap-2 rounded-full bg-ink py-1.5 pl-5 pr-1.5 font-label text-sm font-semibold text-white hover:bg-violet"
                    >
                      <Printer size={15} /> Gửi đặt in 3D
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-orange">
                        <ArrowRight size={14} />
                      </span>
                    </a>
                  )}
                  <Link
                    to={`/models/${modelId}/versions`}
                    className="inline-flex items-center gap-2 rounded-full bg-surface-low px-5 py-3 font-label text-sm font-semibold hover:bg-surface-high"
                  >
                    <History size={15} /> Lịch sử phiên bản
                  </Link>
                  <a
                    href="/ai/studio"
                    className="inline-flex items-center gap-2 rounded-full bg-surface-low px-5 py-3 font-label text-sm font-semibold hover:bg-surface-high"
                  >
                    <Sparkles size={15} className="text-violet" /> AI Studio
                  </a>
                </div>
                <ApiNote className="mt-4">
                  Đặt in dùng /pod/new?versionId=… theo quy ước module; mở trực tiếp trong 3D Studio chưa có tham số
                  liên kết.
                </ApiNote>
              </section>

              <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
                <h2 className="font-display text-xl font-bold">
                  Tệp của phiên bản {model.data.latestVersion ? `v${model.data.latestVersion.versionNumber}` : ''}
                </h2>
                <div className="mt-4">
                  <QueryState isLoading={version.isLoading} error={version.error} onRetry={() => version.refetch()}>
                    {version.data && (
                      <FileList
                        modelId={modelId}
                        modelName={model.data.modelName}
                        versionNumber={version.data.versionNumber}
                        files={version.data.files}
                      />
                    )}
                  </QueryState>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </QueryState>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-low p-3">
      <dt className="font-label text-[11px] text-ink-soft">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  )
}
