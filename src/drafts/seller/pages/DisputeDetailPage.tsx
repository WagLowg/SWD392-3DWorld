import { Camera, FileVideo } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatVnd } from '../../../shared/lib/format'
import { inputClass } from '../../../shared/ui/form'
import { AuditTimeline, Btn, Countdown, DetailLayout, Hero, MediaTile, MockNotice, MoneyRows, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useDispute, useRespondDispute } from '../../../features/seller/hooks/useSeller'
import { DISPUTE_STATUS } from '../../../features/seller/lib/status'

/** MP 052 · Chi Tiết Tranh Chấp & Phản Hồi Bằng Chứng */
export function DisputeDetailPage() {
  const id = useParams().disputeId ?? ''
  const q = useDispute(id)
  const respond = useRespondDispute()
  const uid = useId()
  const [text, setText] = useState('')

  useEffect(() => {
    document.title = `Tranh chấp ${id} · 3DWorld`
  }, [id])

  return (
    <>
      <MockNotice api="POST /api/seller/disputes/{id}/response" />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data &&
          (() => {
            const d = q.data
            const open = d.status === 'NEEDS_RESPONSE'
            const send = (proposal: 'REPRINT' | 'REFUND' | 'CONTEST') => respond.mutate({ id: d.id, response: text.trim(), proposal })
            return (
              <>
                <Hero code="MP 052" eyebrow="Chi tiết tranh chấp" title={`Tranh Chấp #${d.id}`} accent={d.product} />
                <DetailLayout
                  main={
                    <>
                      <Section n={1} title="Khiếu nại từ người mua" aside={<StatusPill status={d.status} map={DISPUTE_STATUS} />}>
                        <p className="rounded-2xl bg-surface-low p-4 text-sm italic">“{d.buyerClaim}”</p>
                        <p className="mt-2 text-xs text-ink-soft">Lý do: {d.reason}</p>
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {d.evidence.map((e, i) => (
                            <MediaTile key={e} label={e} icon={i === 0 ? FileVideo : Camera} tone={i === 0 ? 'violet' : 'orange'} />
                          ))}
                        </div>
                      </Section>
                      <Section n={2} title="Phản hồi minh chứng của xưởng">
                        {d.sellerResponse ? (
                          <p className="rounded-2xl bg-violet-soft/40 p-4 text-sm">{d.sellerResponse}</p>
                        ) : open ? (
                          <>
                            <label htmlFor={`${uid}-t`} className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">
                              Nội dung phản hồi (≥ 30 ký tự) — kèm video test khớp / ảnh đóng gói nếu có
                            </label>
                            <textarea id={`${uid}-t`} rows={5} value={text} onChange={(e) => setText(e.target.value)} className={inputClass} />
                            <div className="mt-4 flex flex-wrap justify-end gap-2">
                              <Btn disabled={text.trim().length < 30 || respond.isPending} onClick={() => send('CONTEST')}>
                                Gửi minh chứng phản bác
                              </Btn>
                              <Btn variant="violet" disabled={text.trim().length < 30 || respond.isPending} onClick={() => send('REPRINT')}>
                                Đề xuất in bù phôi mới
                              </Btn>
                              <Btn variant="danger" disabled={text.trim().length < 30 || respond.isPending} onClick={() => send('REFUND')}>
                                Chấp nhận hoàn tiền
                              </Btn>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-ink-soft">Hồ sơ đã đóng phần phản hồi.</p>
                        )}
                      </Section>
                      <Section n={3} title="Hướng dẫn thu hồi hàng">
                        <p className="text-sm text-ink-soft">
                          Nếu trọng tài yêu cầu trả hàng, người mua gửi lại kiện theo mã vận đơn hoàn do sàn cấp; xưởng kiểm tra trong 48h kể từ khi nhận.
                        </p>
                      </Section>
                    </>
                  }
                  aside={
                    <>
                      {open && <Countdown deadline={d.deadline} label="Thời gian còn lại để phản hồi" />}
                      <Section title="Tác động tài chính">
                        <MoneyRows rows={[{ label: 'Tạm giữ khỏi doanh thu', value: formatVnd(d.amount), tone: 'minus' }]} total={{ label: 'Số tiền tranh chấp', value: formatVnd(d.amount) }} />
                        <div className="mt-3">
                          <Btn to={`/seller/orders/${d.orderId}`} size="sm">
                            Đơn gốc #ORD-{d.orderId}
                          </Btn>
                        </div>
                      </Section>
                      <AuditTimeline entries={d.audit} />
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
