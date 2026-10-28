import { AlertTriangle, BellRing, CheckCircle2, Download, FileBox, LifeBuoy, RefreshCw, Wrench } from 'lucide-react'
import { type ReactNode, useEffect, useId, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/lib/format'
import { inputClass } from '../../../shared/ui/form'
import { AuditTimeline, Btn, Countdown, DetailLayout, Hero, KeyValues, MockNotice, Pill, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useToast } from '../../../shared/ui/toast'
import { DesignTimeline, MessageThread, Preview3D, QuoteSummary } from '../components/DesignParts'
import type { DesignRequest } from '../data/design.fixtures'
import { useDesignRequest, useDesignStatus, useDesignTransition, useRequestRevision } from '../hooks/useDesign'
import { DESIGN_STATUS } from '../lib/status'

function WithRequest({ children, api }: { children: (r: DesignRequest) => ReactNode; api: string }) {
  const id = useParams().requestId ?? ''
  const q = useDesignRequest(id)
  useEffect(() => {
    if (q.data) document.title = `${q.data.title} · Dịch vụ thiết kế`
  }, [q.data])
  return (
    <>
      <MockNotice api={api} />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data && children(q.data)}
      </QueryState>
    </>
  )
}

/** DS-004 · Chi Tiết Yêu Cầu Thiết Kế */
export function DesignRequestDetailPage() {
  return (
    <WithRequest api="GET /api/design-requests/{id}">
      {(r) => (
        <>
          <Hero code="DS-004" eyebrow={`Chi tiết yêu cầu · ${r.id}`} title={r.title} accent={DESIGN_STATUS[r.status].label} />
          <div className="mt-6">
            <DesignTimeline r={r} />
          </div>
          <DetailLayout
            main={
              <>
                <Preview3D />
                <Section title="Brief yêu cầu">
                  <p className="text-sm text-ink-soft">{r.description}</p>
                  <div className="mt-4">
                    <KeyValues cols={3} items={[{ label: 'Kích thước', value: r.size }, { label: 'Định dạng', value: r.formats.join(', ') }, { label: 'Ngân sách', value: r.budget }]} />
                  </div>
                </Section>
                <MessageThread r={r} as="customer" />
              </>
            }
            aside={
              <>
                <Section title="Hành động">
                  <div className="grid gap-2">
                    {r.status === 'QUOTED' && <Btn to={`/design/requests/${r.id}/quote`} variant="primary">Xem báo giá</Btn>}
                    {r.status === 'REVIEW' && <Btn to={`/design/requests/${r.id}/delivery`} variant="primary">Nghiệm thu bản thảo</Btn>}
                    {r.status === 'REVIEW' && <Btn to={`/design/requests/${r.id}/revision`}>Yêu cầu chỉnh sửa</Btn>}
                    {['DELIVERED', 'COMPLETED'].includes(r.status) && <Btn to={`/design/requests/${r.id}/delivery`} variant="primary">Tệp bàn giao</Btn>}
                  </div>
                </Section>
                <Section title="Bảng báo giá cố định">
                  <QuoteSummary r={r} />
                </Section>
                <AuditTimeline entries={r.audit} title="Dòng thời gian tiến trình" />
              </>
            }
          />
        </>
      )}
    </WithRequest>
  )
}

/** DS-005 · Chi Tiết Báo Giá Thiết Kế */
export function DesignQuotePage() {
  const transition = useDesignTransition()
  const navigate = useNavigate()
  const uid = useId()
  const [discuss, setDiscuss] = useState('')
  const toast = useToast()
  return (
    <WithRequest api="POST /api/design-requests/{id}/quote/accept">
      {(r) => {
        const expired = r.quote ? Date.parse(r.quote.expiresAt) < Date.now() : false
        return (
          <>
            <Hero code="DS-005" eyebrow={`Báo giá ${r.quote?.version ?? ''}`} title={r.title} accent="Hồ Sơ Kỹ Thuật & Định Mức Tài Chính." />
            <DetailLayout
              main={
                <>
                  <Section title="Hồ sơ kỹ thuật & phạm vi chế tác">
                    <ul className="space-y-2 text-sm">
                      {(r.quote?.scope ?? []).map((s) => (
                        <li key={s} className="flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-teal" /> {s}
                        </li>
                      ))}
                    </ul>
                  </Section>
                  <Section title="Bàn giao đóng gói (deliverables)">
                    <div className="flex flex-wrap gap-2">
                      {r.formats.map((f) => (
                        <Pill key={f} tone="violet">
                          .{f.toLowerCase()}
                        </Pill>
                      ))}
                    </div>
                  </Section>
                  <Section title="Yêu cầu thảo luận / điều chỉnh báo giá">
                    <label htmlFor={`${uid}-d`} className="block">
                      <span className="mb-1 block font-label text-xs text-ink-soft">Nội dung phản hồi</span>
                      <textarea id={`${uid}-d`} rows={3} value={discuss} onChange={(e) => setDiscuss(e.target.value)} className={inputClass} />
                    </label>
                    <div className="mt-3">
                      <Btn disabled={discuss.trim().length < 10} onClick={() => { toast('Đã gửi phản hồi cho nhân viên báo giá.'); setDiscuss('') }}>
                        Gửi phản hồi
                      </Btn>
                    </div>
                  </Section>
                </>
              }
              aside={
                <>
                  {r.quote && <Countdown deadline={r.quote.expiresAt} label="Báo giá còn hiệu lực" />}
                  <Section title="Bảng định mức tài chính">
                    <QuoteSummary r={r} />
                    <div className="mt-4 grid gap-2">
                      <Btn
                        variant="primary"
                        disabled={r.status !== 'QUOTED' || expired || transition.isPending}
                        onClick={() => transition.mutate({ id: r.id, status: 'IN_PROGRESS', action: 'Chấp thuận báo giá & đặt cọc 50%' }, { onSuccess: () => navigate(`/design/requests/${r.id}`) })}
                      >
                        Chấp thuận & đặt cọc {r.quote ? formatVnd(r.quote.deposit) : ''}
                      </Btn>
                      <Btn
                        variant="danger"
                        disabled={r.status !== 'QUOTED' || transition.isPending}
                        onClick={() => transition.mutate({ id: r.id, status: 'CANCELLED', action: 'Từ chối báo giá' }, { onSuccess: () => navigate('/design/requests') })}
                      >
                        Từ chối báo giá
                      </Btn>
                    </div>
                    {expired && <p className="mt-2 text-xs text-danger">Báo giá đã hết hạn — yêu cầu báo giá mới.</p>}
                    <p className="mt-2 text-[11px] text-violet">Thanh toán cọc qua ZaloPay sẽ nối khi có API nguồn DESIGN_QUOTE.</p>
                  </Section>
                </>
              }
            />
          </>
        )
      }}
    </WithRequest>
  )
}

const ISSUES = ['Tăng độ dày thành in ≥ 1.5mm', 'Nới rãnh lắp khớp +0.2mm', 'Đục rỗng thân (hollow)', 'Sửa tỉ lệ / dáng', 'Thêm chi tiết bề mặt']

/** DS-006 · Gửi Yêu Cầu Chỉnh Sửa */
export function DesignRevisionPage() {
  const revise = useRequestRevision()
  const navigate = useNavigate()
  const uid = useId()
  const [issues, setIssues] = useState<string[]>([])
  const [text, setText] = useState('')
  return (
    <WithRequest api="POST /api/design-requests/{id}/revisions">
      {(r) => {
        const free = r.revisionsUsed < r.revisionsFree
        return (
          <>
            <Hero code="DS-006" eyebrow="Gửi yêu cầu chỉnh sửa" title={r.title} accent={`Vòng ${r.revisionsUsed + 1} · ${free ? 'Miễn phí' : 'Tính phí 350.000₫'}`} />
            <DetailLayout
              main={
                <>
                  <Preview3D label="Bản thảo giao đối soát" />
                  <Section title="Phân loại vấn đề cần chỉnh sửa">
                    <div className="flex flex-wrap gap-2">
                      {ISSUES.map((i) => {
                        const on = issues.includes(i)
                        return (
                          <button key={i} type="button" aria-pressed={on} onClick={() => setIssues(on ? issues.filter((x) => x !== i) : [...issues, i])} className={`rounded-full px-4 py-2 font-label text-xs font-semibold ${on ? 'bg-orange text-white' : 'bg-surface-low'}`}>
                            + {i}
                          </button>
                        )
                      })}
                    </div>
                    <label htmlFor={`${uid}-t`} className="mt-4 block">
                      <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Chi tiết nội dung góp ý (≥ 20 ký tự)</span>
                      <textarea id={`${uid}-t`} rows={5} value={text} onChange={(e) => setText(e.target.value)} className={inputClass} />
                    </label>
                  </Section>
                </>
              }
              aside={
                <Section title="Kiểm soát phạm vi hợp đồng">
                  <KeyValues items={[{ label: 'Đã dùng', value: `${r.revisionsUsed}/${r.revisionsFree} vòng miễn phí` }, { label: 'Phí vòng này', value: free ? '0₫' : formatVnd(350_000) }]} />
                  <p className="mt-3 text-xs text-ink-soft">Thay đổi vượt phạm vi báo giá (đổi nhân vật, thêm phần lớn) sẽ cần báo giá phụ lục.</p>
                  <div className="mt-4">
                    <Btn
                      variant="primary"
                      disabled={!issues.length || text.trim().length < 20 || revise.isPending || !['REVIEW', 'REVISION'].includes(r.status)}
                      onClick={() => revise.mutate({ id: r.id, issues, text: text.trim() }, { onSuccess: () => navigate(`/design/requests/${r.id}`) })}
                    >
                      Xác nhận & gửi sửa đổi vòng {r.revisionsUsed + 1}
                    </Btn>
                  </div>
                </Section>
              }
            />
          </>
        )
      }}
    </WithRequest>
  )
}

/** DS-007 · Nghiệm Thu Bàn Giao Cuối Cùng */
export function DesignDeliveryPage() {
  const transition = useDesignTransition()
  const toast = useToast()
  const [checks, setChecks] = useState([false, false, false])
  return (
    <WithRequest api="POST /api/design-requests/{id}/accept">
      {(r) => (
        <>
          <Hero code="DS-007" eyebrow="Nghiệm thu & bàn giao" title={r.title} accent="Gói Tệp Bàn Giao Chuẩn Studio." />
          <DetailLayout
            main={
              <>
                <Preview3D label="Khung trình chiếu 3D WebGL" />
                <Section title="Gói tệp bàn giao">
                  {r.deliverables.length ? (
                    <ul className="space-y-2">
                      {r.deliverables.map((d) => (
                        <li key={d.name} className="flex items-center gap-3 rounded-2xl bg-surface-low p-3">
                          <FileBox size={18} className="text-violet" />
                          <span className="flex-1 text-sm font-semibold">{d.name}</span>
                          <Pill tone="neutral">{d.size}</Pill>
                          <Btn size="sm" icon={Download} onClick={() => toast('Tải tệp sẽ dùng API Vault khi có.')}>
                            Tải
                          </Btn>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-soft">Kỹ sư chưa đẩy tệp bàn giao.</p>
                  )}
                </Section>
                <Section title="Danh mục nghiệm thu kỹ thuật">
                  {['Hình dáng đúng brief & tỉ lệ', 'Lưới kín (watertight), slicer không báo lỗi', 'Đủ định dạng bàn giao đã thoả thuận'].map((c, i) => (
                    <label key={c} className="flex items-center gap-3 py-1.5 text-sm">
                      <input type="checkbox" checked={checks[i]} onChange={(e) => setChecks(checks.map((v, j) => (j === i ? e.target.checked : v)))} className="h-4 w-4 accent-violet" /> {c}
                    </label>
                  ))}
                </Section>
              </>
            }
            aside={
              <Section title="Quyết định nghiệm thu" aside={<StatusPill status={r.status} map={DESIGN_STATUS} />}>
                {r.status === 'COMPLETED' ? (
                  <p className="rounded-2xl bg-mint p-3 text-sm text-[#0f5132]">Đã nghiệm thu và lưu vào Vault.</p>
                ) : (
                  <div className="grid gap-2">
                    <Btn
                      variant="primary"
                      disabled={!checks.every(Boolean) || transition.isPending || r.status !== 'REVIEW'}
                      onClick={() => transition.mutate({ id: r.id, status: 'COMPLETED', action: 'Nghiệm thu & đóng gói vào Vault' })}
                    >
                      Nghiệm thu & lưu vào Vault
                    </Btn>
                    <Btn to={`/design/requests/${r.id}/revision`} icon={Wrench}>
                      Yêu cầu chỉnh sửa
                    </Btn>
                    <Btn variant="danger" icon={AlertTriangle} onClick={() => transition.mutate({ id: r.id, status: 'REVISION', action: 'Khiếu nại kỹ thuật' })}>
                      Khiếu nại kỹ thuật
                    </Btn>
                  </div>
                )}
                <p className="mt-3 text-xs text-ink-soft">Cập nhật {formatDateTime(r.audit.at(-1)?.at)}</p>
              </Section>
            }
          />
        </>
      )}
    </WithRequest>
  )
}

/** DS-012 · Dịch Vụ Thiết Kế Tạm Gián Đoạn */
export function DesignUnavailablePage() {
  const status = useDesignStatus()
  const toast = useToast()
  const reason = status.data?.reason
  return (
    <>
      <MockNotice api="GET /api/design-service/status" />
      <Hero
        code="DS-012"
        eyebrow="Dịch vụ thiết kế"
        title="Dịch Vụ Tạm Gián Đoạn"
        accent="Tạm Ngừng Tiếp Nhận Yêu Cầu Mới."
        description={reason === 'MAINTENANCE' ? 'Hệ thống đang bảo trì định kỳ.' : reason === 'QUOTA' ? 'Đội kỹ sư đã kín hạn ngạch tuần này.' : 'Dịch vụ hiện vẫn mở — bạn có thể tạo yêu cầu mới.'}
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Section title="Thử kết nối lại">
          <Btn icon={RefreshCw} variant="primary" onClick={() => status.refetch()}>
            Thử lại ngay
          </Btn>
          {status.data?.accepting && (
            <div className="mt-3">
              <Btn to="/design/new">Tạo yêu cầu</Btn>
            </div>
          )}
        </Section>
        <Section title="Nhận thông báo khi có suất">
          <Btn icon={BellRing} onClick={() => toast('Sẽ báo bạn khi dịch vụ mở lại (mô phỏng).')}>
            Bật chuông báo
          </Btn>
        </Section>
        <Section title="Kênh hỗ trợ khẩn cấp">
          <Btn to="/help" icon={LifeBuoy}>
            Mở ticket hỗ trợ
          </Btn>
        </Section>
      </div>
    </>
  )
}
