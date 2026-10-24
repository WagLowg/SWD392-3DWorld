import { Boxes, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDate, formatVnd } from '../../../shared/format'
import { Btn, FilterTabs, Hero, MockNotice, Pill, RuleBox, StatusPill, Toolbar } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import type { DesignRequest } from '../data/design.fixtures'
import { useDesignRequests } from '../hooks/useDesign'
import { DESIGN_STATUS } from '../lib/status'

function nextAction(r: DesignRequest) {
  switch (r.status) {
    case 'QUOTED':
      return { label: 'Xem báo giá & chấp thuận', to: `/design/requests/${r.id}/quote` }
    case 'REVIEW':
      return { label: 'Nghiệm thu / yêu cầu sửa', to: `/design/requests/${r.id}/delivery` }
    case 'DELIVERED':
    case 'COMPLETED':
      return { label: 'Tải tệp bàn giao', to: `/design/requests/${r.id}/delivery` }
    default:
      return { label: 'Xem tiến trình', to: `/design/requests/${r.id}` }
  }
}

/** DS-003 · Danh Sách Yêu Cầu Thiết Kế */
export function MyDesignRequestsPage() {
  const q = useDesignRequests()
  const [tab, setTab] = useState('')
  useEffect(() => {
    document.title = 'Yêu cầu thiết kế của tôi · 3DWorld'
  }, [])
  const all = q.data ?? []
  const rows = all.filter((r) => !tab || r.status === tab)

  return (
    <>
      <MockNotice api="GET /api/design-requests/mine" />
      <Hero
        code="DS-003"
        eyebrow="Dịch vụ thiết kế"
        title="Yêu Cầu Thiết Kế Của Tôi"
        actions={
          <Btn to="/design/new" variant="primary" icon={Plus}>
            Yêu cầu mới
          </Btn>
        }
      />
      <Toolbar>
        <FilterTabs value={tab} onChange={setTab} options={[{ value: '', label: 'Tất cả', count: all.length }, ...Object.keys(DESIGN_STATUS).map((s) => ({ value: s, label: DESIGN_STATUS[s].label, count: all.filter((r) => r.status === s).length })).filter((o) => o.count)]} />
      </Toolbar>
      <div className="mt-6 space-y-4">
        <QueryState isLoading={q.isLoading} error={q.error}>
          {!rows.length ? (
            <StatusBlock tone="empty" title="Chưa có yêu cầu" body="Tạo yêu cầu thiết kế đầu tiên của bạn." />
          ) : (
            rows.map((r) => {
              const act = nextAction(r)
              const total = r.quote?.lines.reduce((s, l) => s + l.amount, 0)
              return (
                <article key={r.id} className="flex flex-wrap items-center gap-4 rounded-[2rem] bg-white/95 p-5 shadow-soft">
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-soft to-peach text-violet">
                    <Boxes size={26} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link to={`/design/requests/${r.id}`} className="font-display text-lg font-bold hover:text-violet">
                      {r.title}
                    </Link>
                    <p className="text-xs text-ink-soft">
                      {r.id} · {r.purpose} · hạn {formatDate(r.deadline)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusPill status={r.status} map={DESIGN_STATUS} />
                      {total && <Pill tone="neutral">{formatVnd(total)}</Pill>}
                      {r.engineer && <Pill tone="violet">{r.engineer}</Pill>}
                    </div>
                  </div>
                  <Btn to={act.to} variant={['QUOTED', 'REVIEW'].includes(r.status) ? 'primary' : 'soft'}>
                    {act.label}
                  </Btn>
                </article>
              )
            })
          )}
        </QueryState>
      </div>
      <RuleBox title="Cam kết nghiệp vụ & bản quyền" rules={['Báo giá cố định, không phát sinh nếu không đổi phạm vi.', '2 vòng chỉnh sửa miễn phí, từ vòng 3 tính phí 350.000₫/vòng.', 'Tệp bàn giao và quyền sở hữu thuộc về bạn sau nghiệm thu.', 'Huỷ trước khi chế tác được hoàn cọc 100%.']} />
    </>
  )
}
