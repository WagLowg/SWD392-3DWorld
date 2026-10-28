import { Camera, Download } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { formatDateTime } from '../../../shared/format'
import { AuditTimeline, Btn, DetailLayout, Hero, KeyValues, MediaTile, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useReport } from '../hooks/useBuyer'
import { REPORT_STATUS, TARGET_TYPE } from '../lib/status'

/** MP 035 · Chi Tiết Báo Cáo Vi Phạm */
export function ReportDetailPage() {
  const id = useParams().reportId ?? ''
  const q = useReport(id)
  useEffect(() => {
    document.title = `Báo cáo ${id} · 3DWorld`
  }, [id])
  return (
    <>
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data &&
          (() => {
            const r = q.data
            return (
              <>
                <Hero
                  code="MP 035"
                  eyebrow="Chi tiết báo cáo"
                  title={`Báo Cáo #${r.id}`}
                  accent={r.target}
                  actions={
                    <Btn variant="white" icon={Download}>
                      Biên bản thẩm định PDF
                    </Btn>
                  }
                />
                <DetailLayout
                  main={
                    <>
                      <Section title="Nội dung báo cáo" aside={<StatusPill status={r.status} map={REPORT_STATUS} />}>
                        <KeyValues
                          cols={3}
                          items={[
                            { label: 'Loại đối tượng', value: TARGET_TYPE[r.targetType] },
                            { label: 'Xưởng liên quan', value: r.targetOwner },
                            { label: 'Gửi lúc', value: formatDateTime(r.createdAt) },
                          ]}
                        />
                        <p className="mt-4 rounded-2xl bg-surface-low p-4 text-sm">
                          <strong>{r.reason}</strong>
                          <br />
                          <span className="text-ink-soft">{r.description}</span>
                        </p>
                        {r.outcome && <p className="mt-3 rounded-2xl bg-mint p-4 text-sm text-[#0f5132]">Kết quả: {r.outcome}</p>}
                      </Section>
                      <Section title="Bằng chứng đã nộp">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {r.evidence.length ? (
                            r.evidence.map((e) => <MediaTile key={e} label={e} icon={Camera} />)
                          ) : (
                            <p className="text-sm text-ink-soft">Chưa có bằng chứng đính kèm.</p>
                          )}
                        </div>
                      </Section>
                    </>
                  }
                  aside={<AuditTimeline entries={r.audit} title="Tiến trình thẩm định" />}
                />
              </>
            )
          })()}
      </QueryState>
    </>
  )
}
