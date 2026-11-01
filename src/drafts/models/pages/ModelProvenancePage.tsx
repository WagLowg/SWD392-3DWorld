import { ArrowLeft, GitBranch, Lock, Sparkles, Upload, Wrench } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { formatDateTime } from '../../../shared/lib/format'
import { Btn, DetailLayout, Hero, KeyValues, Pill, Section } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useModel, useModelVersions } from '../../../features/models/hooks/useModels'
import { modelCode, ORIGIN, SOURCE } from '../../../features/models/lib/labels'

const ICON = { UPLOAD: Upload, EDITOR_SAVE: Wrench, AI_GENERATED: Sparkles }

/** MP-095 · Nguồn Gốc Mô Hình 3D & Phả Hệ Phiên Bản — API thật (models + versions). */
export function ModelProvenancePage() {
  const { modelId = '' } = useParams()
  const model = useModel(modelId)
  const versions = useModelVersions(modelId, 0, 50)

  useEffect(() => {
    document.title = 'Nguồn gốc mô hình · 3DWorld'
  }, [])

  const list = [...(versions.data?.content ?? [])].sort((a, b) => a.versionNumber - b.versionNumber)

  return (
    <QueryState isLoading={model.isLoading} error={model.error}>
      {model.data && (
        <>
          <Hero
            code="MP-095"
            eyebrow="Nguồn gốc mô hình"
            title={model.data.modelName}
            accent="Phả Hệ Phiên Bản & Quyền Sở Hữu."
            actions={
              <>
                <Btn to={`/models/${modelId}`} variant="white" icon={ArrowLeft}>
                  Quay lại mô hình
                </Btn>
                <Btn href="/studio/" variant="primary">
                  Mở trong 3D Studio
                </Btn>
              </>
            }
          />
          <DetailLayout
            main={
              <Section title="Lịch sử chuỗi phiên bản bất biến" aside={<Pill tone="green">API thật</Pill>}>
                <QueryState isLoading={versions.isLoading} error={versions.error}>
                  <ol className="relative space-y-4 before:absolute before:bottom-4 before:left-5 before:top-4 before:w-0.5 before:bg-line">
                    {list.map((v) => {
                      const Icon = ICON[v.sourceType] ?? GitBranch
                      return (
                        <li key={v.modelVersionId} className="relative flex gap-4 pl-0">
                          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet text-white ring-4 ring-white">
                            <Icon size={16} />
                          </span>
                          <div className="flex-1 rounded-2xl bg-surface-low p-4">
                            <p className="font-display font-bold">
                              v{v.versionNumber} · {SOURCE[v.sourceType]}
                            </p>
                            <p className="text-sm text-ink-soft">{v.changeNote || 'Không có ghi chú.'}</p>
                            <p className="mt-1 font-mono text-[11px] text-ink-soft">
                              ver_{v.modelVersionId}
                              {v.parentVersionId ? ` ← ver_${v.parentVersionId}` : ' (gốc)'} · {formatDateTime(v.createdAt)}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </QueryState>
              </Section>
            }
            aside={
              <Section title="Định danh & sở hữu">
                <KeyValues
                  items={[
                    { label: 'Model ID', value: modelCode(model.data.modelId) },
                    { label: 'Nguồn gốc', value: ORIGIN[model.data.originType]?.label ?? model.data.originType },
                    { label: 'Hiển thị', value: model.data.visibility },
                    { label: 'Tạo lúc', value: formatDateTime(model.data.createdAt) },
                  ]}
                />
                <p className="mt-4 flex gap-2 rounded-2xl bg-violet-soft/40 p-3 text-xs text-violet">
                  <Lock size={14} className="shrink-0" /> Quyền sở hữu thuộc tài khoản tạo mô hình; chuỗi phiên bản không thể sửa đổi.
                </p>
              </Section>
            }
          />
        </>
      )}
    </QueryState>
  )
}
