import { Clock, Gauge, Hammer, Inbox, Plus, Power, Trash2, Upload, Users } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/lib/format'
import { inputClass } from '../../../shared/ui/form'
import {
  AuditTimeline,
  Btn,
  CellTitle,
  type Column,
  Countdown,
  DataTable,
  DetailLayout,
  FilterTabs,
  Hero,
  KeyValues,
  MockNotice,
  Pill,
  RuleBox,
  SearchInput,
  Section,
  StatCard,
  StatGrid,
  StatusPill,
  Toolbar,
} from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useToast } from '../../../shared/ui/toast'
import { DesignTimeline, MessageThread, Preview3D, QuoteSummary } from '../components/DesignParts'
import type { DesignRequest, QuoteLine } from '../data/design.fixtures'
import {
  useAssignEngineer,
  useDesignRequest,
  useDesignRequests,
  useDesignStatus,
  useDesignTransition,
  useEngineers,
  usePricing,
  useSavePricing,
  useSendQuote,
  useSetService,
} from '../hooks/useDesign'
import { DESIGN_STATUS } from '../lib/status'

const hoursLeft = (iso: string) => Math.round((Date.parse(iso) - Date.now()) / 3_600_000)

function SlaPill({ at }: { at: string }) {
  const h = hoursLeft(at)
  return <Pill tone={h < 0 ? 'danger' : h < 24 ? 'orange' : 'teal'}>{h < 0 ? `Quá SLA ${-h}h` : `Còn ${h}h`}</Pill>
}

/** DS-008 · Hàng Đợi Yêu Cầu Thiết Kế (Staff) */
export function StaffDesignQueuePage() {
  const q = useDesignRequests()
  const [tab, setTab] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    document.title = 'Hàng đợi thiết kế · Ops'
  }, [])
  const all = q.data ?? []
  const s = search.trim().toLowerCase()
  const rows = all.filter((r) => (!tab || r.status === tab) && (!s || `${r.id} ${r.title} ${r.customer}`.toLowerCase().includes(s)))

  const columns: Column<DesignRequest>[] = [
    { key: 'id', header: 'Yêu cầu', render: (r) => <CellTitle title={r.title} sub={`${r.id} · ${r.customer}`} to={`/ops/design/${r.id}`} /> },
    { key: 'st', header: 'Trạng thái', render: (r) => <StatusPill status={r.status} map={DESIGN_STATUS} /> },
    { key: 'eng', header: 'Kỹ sư', render: (r) => r.engineer ?? <span className="text-ink-soft">Chưa phân công</span> },
    { key: 'sla', header: 'SLA', render: (r) => (['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(r.status) ? '—' : <SlaPill at={r.slaAt} />) },
    { key: 'b', header: 'Ngân sách', render: (r) => r.budget },
    {
      key: 'act',
      header: '',
      className: 'text-right',
      render: (r) => (
        <Btn size="sm" to={`/ops/design/${r.id}`}>
          Xử lý
        </Btn>
      ),
    },
  ]

  return (
    <>
      <MockNotice api="GET /api/admin/design-requests" />
      <Hero code="DS-008" eyebrow="Ops · Dịch vụ thiết kế" title="Hàng Đợi Yêu Cầu Thiết Kế" accent="Thẩm định – báo giá – phân công." />
      <StatGrid>
        <StatCard label="Chờ báo giá" value={all.filter((r) => r.status === 'SUBMITTED').length} icon={Inbox} tone="orange" />
        <StatCard label="Đang chế tác" value={all.filter((r) => ['IN_PROGRESS', 'REVISION'].includes(r.status)).length} icon={Hammer} tone="teal" />
        <StatCard label="Chờ nghiệm thu" value={all.filter((r) => r.status === 'REVIEW').length} icon={Clock} tone="violet" />
        <StatCard label="Quá SLA" value={all.filter((r) => hoursLeft(r.slaAt) < 0 && !['COMPLETED', 'CANCELLED'].includes(r.status)).length} icon={Gauge} tone="danger" />
      </StatGrid>
      <Toolbar>
        <FilterTabs value={tab} onChange={setTab} options={[{ value: '', label: 'Tất cả', count: all.length }, ...['SUBMITTED', 'QUOTED', 'IN_PROGRESS', 'REVIEW', 'REVISION', 'COMPLETED'].map((v) => ({ value: v, label: DESIGN_STATUS[v].label, count: all.filter((r) => r.status === v).length }))]} />
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm mã, tên, khách hàng…" />
      </Toolbar>
      <QueryState isLoading={q.isLoading} error={q.error}>
        <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} empty="Không có yêu cầu phù hợp." />
      </QueryState>
    </>
  )
}

function QuoteBuilder({ r }: { r: DesignRequest }) {
  const uid = useId()
  const send = useSendQuote()
  const [lines, setLines] = useState<QuoteLine[]>(r.quote?.lines ?? [{ label: 'Điêu khắc nhân vật (base sculpt)', amount: 1_200_000 }])
  const total = lines.reduce((s, l) => s + (Number.isFinite(l.amount) ? l.amount : 0), 0)
  const valid = lines.length > 0 && lines.every((l) => l.label.trim() && l.amount > 0)
  const set = (i: number, patch: Partial<QuoteLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  return (
    <Section title="Lập báo giá cố định" aside={<Pill tone="violet">Tổng {formatVnd(total)}</Pill>}>
      <ul className="space-y-2">
        {lines.map((l, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: dòng báo giá chưa có id ổn định khi đang soạn
          <li key={i} className="flex gap-2">
            <label htmlFor={`${uid}-l${i}`} className="sr-only">
              Hạng mục {i + 1}
            </label>
            <input id={`${uid}-l${i}`} value={l.label} onChange={(e) => set(i, { label: e.target.value })} className={inputClass} />
            <label htmlFor={`${uid}-a${i}`} className="sr-only">
              Đơn giá {i + 1}
            </label>
            <input id={`${uid}-a${i}`} type="number" min={0} step={50_000} value={l.amount} onChange={(e) => set(i, { amount: Number(e.target.value) })} className={`${inputClass} max-w-40`} />
            <button type="button" aria-label="Xoá dòng" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="grid w-10 shrink-0 place-items-center rounded-full text-danger hover:bg-danger/10">
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn size="sm" icon={Plus} onClick={() => setLines([...lines, { label: '', amount: 0 }])}>
          Thêm hạng mục
        </Btn>
        <Btn size="sm" variant="primary" disabled={!valid || send.isPending || !['SUBMITTED', 'QUOTED'].includes(r.status)} onClick={() => send.mutate({ id: r.id, lines })}>
          Gửi báo giá cho khách
        </Btn>
      </div>
    </Section>
  )
}

/** DS-009 · Chi Tiết Yêu Cầu (Staff) */
export function StaffDesignDetailPage() {
  const id = useParams().requestId ?? ''
  const q = useDesignRequest(id)
  const engineers = useEngineers()
  const assign = useAssignEngineer()
  const transition = useDesignTransition()
  const uid = useId()
  const [eng, setEng] = useState('')
  const r = q.data
  useEffect(() => {
    if (r) document.title = `${r.id} · Ops thiết kế`
  }, [r])

  return (
    <>
      <MockNotice api="GET/PATCH /api/admin/design-requests/{id}" />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {r && (
          <>
            <Hero code="DS-009" eyebrow={`Ops · ${r.id} · ${r.customer}`} title={r.title} accent={DESIGN_STATUS[r.status].label} />
            <div className="mt-6">
              <DesignTimeline r={r} />
            </div>
            <DetailLayout
              main={
                <>
                  <Section title="Brief của khách hàng">
                    <p className="text-sm text-ink-soft">{r.description}</p>
                    <div className="mt-4">
                      <KeyValues cols={3} items={[{ label: 'Mục đích', value: r.purpose }, { label: 'Kích thước', value: r.size }, { label: 'Định dạng', value: r.formats.join(', ') }, { label: 'Ngân sách', value: r.budget }, { label: 'Hạn khách', value: formatDateTime(r.deadline) }, { label: 'Tạo lúc', value: formatDateTime(r.createdAt) }]} />
                    </div>
                  </Section>
                  {['SUBMITTED', 'QUOTED'].includes(r.status) ? (
                    <QuoteBuilder r={r} />
                  ) : (
                    <Section title="Báo giá đã chốt">
                      <QuoteSummary r={r} />
                    </Section>
                  )}
                  <MessageThread r={r} as="staff" />
                </>
              }
              aside={
                <>
                  <Countdown deadline={r.slaAt} label="SLA phản hồi" />
                  <Section title="Phân công kỹ sư">
                    <label htmlFor={`${uid}-e`} className="block">
                      <span className="mb-1 block font-label text-xs text-ink-soft">Kỹ sư phụ trách (hiện: {r.engineer ?? 'chưa có'})</span>
                      <select id={`${uid}-e`} value={eng} onChange={(e) => setEng(e.target.value)} className={inputClass}>
                        <option value="">Chọn kỹ sư</option>
                        {(engineers.data ?? []).map((e) => (
                          <option key={e.id} value={e.id} disabled={e.load >= e.capacity}>
                            {e.name} · {e.load}/{e.capacity} việc · {e.specialty}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-3">
                      <Btn size="sm" variant="primary" icon={Users} disabled={!eng || assign.isPending} onClick={() => assign.mutate({ id: r.id, engineer: eng })}>
                        Phân công
                      </Btn>
                    </div>
                  </Section>
                  <Section title="Thao tác điều phối">
                    <div className="grid gap-2">
                      <Btn to={`/ops/design/${r.id}/workbench`} icon={Hammer}>
                        Mở bàn làm việc kỹ sư
                      </Btn>
                      <Btn variant="danger" disabled={['COMPLETED', 'CANCELLED'].includes(r.status) || transition.isPending} onClick={() => transition.mutate({ id: r.id, status: 'CANCELLED', action: 'Staff huỷ yêu cầu', actor: 'Staff' })}>
                        Huỷ yêu cầu
                      </Btn>
                    </div>
                  </Section>
                  <AuditTimeline entries={r.audit} />
                </>
              }
            />
          </>
        )}
      </QueryState>
    </>
  )
}

/** DS-010 · Bàn Làm Việc Kỹ Sư Thiết Kế */
export function DesignerWorkbenchPage() {
  const id = useParams().requestId ?? ''
  const q = useDesignRequest(id)
  const transition = useDesignTransition()
  const toast = useToast()
  const [checks, setChecks] = useState([false, false, false, false])
  const r = q.data
  const CHECKS = ['Lưới kín (watertight), không non-manifold', 'Độ dày thành ≥ 1.2mm', 'Dung sai khớp nối 0.2mm', 'Xuất đủ định dạng đã báo giá']

  return (
    <>
      <MockNotice api="POST /api/admin/design-requests/{id}/drafts" />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {r && (
          <>
            <Hero code="DS-010" eyebrow={`Bàn làm việc · ${r.engineer ?? 'chưa phân công'}`} title={r.title} accent={`Vòng sửa ${r.revisionsUsed}/${r.revisionsFree}`} />
            <DetailLayout
              main={
                <>
                  <Preview3D label="Bản thảo hiện tại" />
                  <Section title="Tải lên bản thảo / tệp bàn giao">
                    <button type="button" onClick={() => toast('Tải tệp sẽ dùng API lưu trữ khi có.')} className="grid w-full place-items-center rounded-2xl border-2 border-dashed border-line p-6 text-sm text-ink-soft hover:border-violet">
                      <Upload size={20} />
                      <span className="mt-1">Kéo thả STL / GLB / STEP (tối đa 200MB)</span>
                    </button>
                    <ul className="mt-3 space-y-1 text-sm">
                      {r.deliverables.map((d) => (
                        <li key={d.name} className="flex justify-between rounded-xl bg-surface-low px-3 py-2">
                          <span>{d.name}</span>
                          <span className="text-ink-soft">{d.size}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                  <MessageThread r={r} as="engineer" />
                </>
              }
              aside={
                <>
                  <Countdown deadline={r.slaAt} label="Hạn nộp bản thảo" />
                  <Section title="Kiểm tra kỹ thuật trước khi gửi">
                    {CHECKS.map((c, i) => (
                      <label key={c} className="flex items-center gap-3 py-1.5 text-sm">
                        <input type="checkbox" checked={checks[i]} onChange={(e) => setChecks(checks.map((v, j) => (j === i ? e.target.checked : v)))} className="h-4 w-4 accent-violet" /> {c}
                      </label>
                    ))}
                    <div className="mt-3 grid gap-2">
                      <Btn
                        variant="primary"
                        disabled={!checks.every(Boolean) || !['IN_PROGRESS', 'REVISION'].includes(r.status) || transition.isPending}
                        onClick={() => transition.mutate({ id: r.id, status: 'REVIEW', action: 'Gửi bản thảo chờ nghiệm thu', actor: r.engineer ?? 'Kỹ sư' })}
                      >
                        Gửi bản thảo cho khách
                      </Btn>
                      <Btn to={`/ops/design/${r.id}`}>Về chi tiết yêu cầu</Btn>
                    </div>
                  </Section>
                  <AuditTimeline entries={r.audit} title="Lịch sử" />
                </>
              }
            />
          </>
        )}
      </QueryState>
    </>
  )
}

/** DS-011 · Quản Trị Vận Hành Dịch Vụ Thiết Kế */
export function DesignAdminOpsPage() {
  const status = useDesignStatus()
  const pricing = usePricing()
  const engineers = useEngineers()
  const requests = useDesignRequests()
  const savePricing = useSavePricing()
  const setService = useSetService()
  const uid = useId()
  const [form, setForm] = useState<{ baseSculpt: number; remesh: number; rushPercent: number } | null>(null)
  const [reason, setReason] = useState<'' | 'QUOTA' | 'MAINTENANCE'>('QUOTA')
  const p = form ?? pricing.data
  const all = requests.data ?? []
  const revenue = all.filter((r) => ['COMPLETED', 'DELIVERED'].includes(r.status)).reduce((s, r) => s + (r.quote?.lines.reduce((a, l) => a + l.amount, 0) ?? 0), 0)

  return (
    <>
      <MockNotice api="/api/admin/design-service/*" />
      <Hero code="DS-011" eyebrow="Ops · Quản trị dịch vụ thiết kế" title="Quản Trị Vận Hành" accent="Đơn giá – năng lực – trạng thái dịch vụ." />
      <StatGrid>
        <StatCard label="Yêu cầu đang mở" value={all.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status)).length} icon={Inbox} />
        <StatCard label="Doanh thu hoàn tất" value={formatVnd(revenue)} icon={Gauge} tone="teal" />
        <StatCard label="Kỹ sư" value={engineers.data?.length ?? 0} icon={Users} tone="orange" />
        <StatCard label="Trạng thái" value={status.data?.accepting ? 'Mở' : 'Tạm dừng'} icon={Power} tone={status.data?.accepting ? 'green' : 'danger'} />
      </StatGrid>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Bảng đơn giá chuẩn">
          {p && (
            <div className="grid gap-3">
              {(
                [
                  ['baseSculpt', 'Điêu khắc cơ bản (₫)'],
                  ['remesh', 'Remesh / kiểm tra in (₫)'],
                  ['rushPercent', 'Phụ phí gấp (%)'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} htmlFor={`${uid}-${k}`} className="block">
                  <span className="mb-1 block font-label text-xs text-ink-soft">{label}</span>
                  <input id={`${uid}-${k}`} type="number" min={0} value={p[k]} onChange={(e) => setForm({ ...p, [k]: Number(e.target.value) })} className={inputClass} />
                </label>
              ))}
              <Btn variant="primary" disabled={!form || savePricing.isPending} onClick={() => form && savePricing.mutate(form, { onSuccess: () => setForm(null) })}>
                Lưu đơn giá
              </Btn>
            </div>
          )}
        </Section>
        <Section title="Trạng thái tiếp nhận yêu cầu" aside={<Pill tone={status.data?.accepting ? 'green' : 'danger'}>{status.data?.accepting ? 'Đang mở' : 'Tạm dừng'}</Pill>}>
          {status.data?.accepting ? (
            <>
              <label htmlFor={`${uid}-r`} className="block">
                <span className="mb-1 block font-label text-xs text-ink-soft">Lý do tạm dừng</span>
                <select id={`${uid}-r`} value={reason} onChange={(e) => setReason(e.target.value as 'QUOTA' | 'MAINTENANCE')} className={inputClass}>
                  <option value="QUOTA">Kín hạn ngạch kỹ sư</option>
                  <option value="MAINTENANCE">Bảo trì hệ thống</option>
                </select>
              </label>
              <div className="mt-3">
                <Btn variant="danger" icon={Power} disabled={setService.isPending} onClick={() => setService.mutate({ accepting: false, reason })}>
                  Tạm dừng tiếp nhận
                </Btn>
              </div>
            </>
          ) : (
            <Btn variant="primary" icon={Power} disabled={setService.isPending} onClick={() => setService.mutate({ accepting: true, reason: '' })}>
              Mở lại tiếp nhận
            </Btn>
          )}
          <p className="mt-3 text-xs text-ink-soft">Khi tạm dừng, khách được chuyển tới trang DS-012.</p>
        </Section>
      </div>
      <Section title="Năng lực đội kỹ sư" className="mt-6">
        <ul className="grid gap-3 md:grid-cols-3">
          {(engineers.data ?? []).map((e) => (
            <li key={e.id} className="rounded-2xl bg-surface-low p-4">
              <p className="font-display font-bold">{e.name}</p>
              <p className="text-xs text-ink-soft">{e.specialty}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div className={`h-full ${e.load >= e.capacity ? 'bg-danger' : 'bg-teal'}`} style={{ width: `${(e.load / e.capacity) * 100}%` }} />
              </div>
              <p className="mt-1 text-xs">
                {e.load}/{e.capacity} việc
              </p>
            </li>
          ))}
        </ul>
      </Section>
      <RuleBox title="Chính sách vận hành" rules={['SLA báo giá 24h làm việc kể từ khi nhận brief.', 'Mỗi kỹ sư tối đa 4 dự án song song.', 'Thay đổi đơn giá chỉ áp dụng cho báo giá mới.']} />
    </>
  )
}
