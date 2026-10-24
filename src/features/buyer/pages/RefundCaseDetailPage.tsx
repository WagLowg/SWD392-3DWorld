import { Camera, MessageSquare, Upload } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { inputClass } from '../../../shared/ui/form'
import { AuditTimeline, Btn, Countdown, DetailLayout, Hero, KeyValues, MediaTile, MockNotice, MoneyRows, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useAddRefundEvidence, useRefundCase } from '../hooks/useBuyer'
import { REFUND_STATUS } from '../lib/status'

/** MP 029 · Chi Tiết Yêu Cầu Hoàn Tiền */
export function RefundCaseDetailPage() {
  const id = useParams().refundId ?? ''
  const q = useRefundCase(id)
  const add = useAddRefundEvidence()
  const uid = useId()
  const [note, setNote] = useState('')

  useEffect(() => {
    document.title = `Hoàn tiền ${id} · 3DWorld`
  }, [id])

  return (
    <>
      <MockNotice api="GET /api/refunds/{id}" />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data &&
          (() => {
            const r = q.data
            const open = r.status === 'NEEDS_EVIDENCE' || r.status === 'PENDING_STAFF'
            return (
              <>
                <Hero code="MP 029" eyebrow="Hồ sơ hoàn tiền" title={`Yêu Cầu ${r.id}`} accent={r.product} />
                <DetailLayout
                  main={
                    <>
                      <Section title="Hồ sơ yêu cầu" aside={<StatusPill status={r.status} map={REFUND_STATUS} />}>
                        <KeyValues
                          cols={3}
                          items={[
                            { label: 'Đơn hàng', value: `#ORD-${r.orderId}` },
                            { label: 'Xưởng', value: r.storefront },
                            { label: 'Gửi lúc', value: formatDateTime(r.createdAt) },
                          ]}
                        />
                        <p className="mt-4 rounded-2xl bg-surface-low p-4 text-sm">
                          <strong>Lý do:</strong> {r.reason}
                          <br />
                          <span className="text-ink-soft">{r.buyerNote}</span>
                        </p>
                        {r.resolution && <p className="mt-3 rounded-2xl bg-mint p-4 text-sm text-[#0f5132]">{r.resolution}</p>}
                      </Section>
                      <Section title="Bằng chứng nghiệm thu">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {r.evidence.map((e, i) => (
                            <MediaTile key={e} label={e} icon={Camera} tone={i % 2 ? 'orange' : 'violet'} />
                          ))}
                        </div>
                        {open && (
                          <div className="mt-5 space-y-3 rounded-2xl border-2 border-dashed border-line p-4">
                            <p className="flex items-center gap-2 text-sm font-semibold">
                              <Upload size={16} /> Nộp thêm bằng chứng
                            </p>
                            <label htmlFor={`${uid}-n`} className="block">
                              <span className="mb-1 block font-label text-xs text-ink-soft">Ghi chú (≥ 10 ký tự)</span>
                              <textarea id={`${uid}-n`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
                            </label>
                            <Btn
                              variant="primary"
                              disabled={note.trim().length < 10 || add.isPending}
                              onClick={() => add.mutate({ id: r.id, note: note.trim() }, { onSuccess: () => setNote('') })}
                            >
                              Xác nhận nộp thêm bằng chứng
                            </Btn>
                          </div>
                        )}
                      </Section>
                      <Section title="Hướng dẫn trả hàng / phương án giải quyết">
                        <p className="text-sm text-ink-soft">
                          Giữ nguyên hộp và sản phẩm cho tới khi có phán quyết. Nếu trọng tài yêu cầu trả hàng, mã vận đơn hoàn sẽ được gửi qua thông báo.
                        </p>
                      </Section>
                    </>
                  }
                  aside={
                    <>
                      {open && <Countdown deadline={r.deadline} label="Hạn bổ sung / thẩm định" />}
                      <Section title="Quyết toán tiền hoàn">
                        <MoneyRows rows={[{ label: 'Yêu cầu hoàn', value: formatVnd(r.amount) }]} total={{ label: 'Trần hoàn (100% đơn)', value: formatVnd(r.amount) }} />
                      </Section>
                      <AuditTimeline entries={r.audit} title="Nhật ký thẩm định & trọng tài" />
                      <Btn to="/help" icon={MessageSquare}>
                        Liên hệ trọng tài
                      </Btn>
                    </>
                  }
                />
              </>
            )
          })()}
      </QueryState>
    </>
  )
}
