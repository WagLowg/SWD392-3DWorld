import { Flag, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../../../shared/format'
import { Btn, FilterTabs, Hero, MockNotice, Pill, RuleBox, StatusPill, Toolbar } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import type { ReportStatus } from '../data/buyer.fixtures'
import { useReports } from '../hooks/useBuyer'
import { REPORT_STATUS, TARGET_TYPE } from '../lib/status'

/** MP 034 · Danh Sách Báo Cáo Vi Phạm */
export function ReportsPage() {
  const q = useReports()
  const [tab, setTab] = useState<ReportStatus | ''>('')
  useEffect(() => {
    document.title = 'Báo cáo vi phạm · 3DWorld'
  }, [])
  const all = q.data ?? []
  const rows = all.filter((r) => !tab || r.status === tab)
  return (
    <>
      <MockNotice api="GET /api/reports/mine" />
      <Hero
        code="MP 034"
        eyebrow="Báo cáo vi phạm"
        title="Báo Cáo Vi Phạm"
        accent="Theo Dõi Phản Ánh & Bảo Vệ Bản Quyền."
        actions={
          <Btn to="/reports/new" variant="primary" icon={Plus}>
            Báo cáo mới
          </Btn>
        }
      />
      <Toolbar>
        <FilterTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: '', label: 'Tất cả', count: all.length },
            ...(Object.keys(REPORT_STATUS) as ReportStatus[]).map((s) => ({ value: s, label: REPORT_STATUS[s].label, count: all.filter((r) => r.status === s).length })),
          ]}
        />
      </Toolbar>
      <div className="mt-6 space-y-4">
        <QueryState isLoading={q.isLoading} error={q.error}>
          {!rows.length ? (
            <StatusBlock tone="empty" title="Không có báo cáo" body="Chưa có báo cáo nào ở trạng thái này." />
          ) : (
            rows.map((r) => (
              <Link key={r.id} to={`/reports/${r.id}`} className="flex flex-wrap items-center gap-4 rounded-[2rem] bg-white/95 p-5 shadow-soft hover:shadow-lift">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#ffdad6] text-danger">
                  <Flag size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold">{r.target}</p>
                  <p className="text-sm text-ink-soft">
                    {TARGET_TYPE[r.targetType]} · {r.reason}
                    {r.targetOwner !== '—' && ` · Xưởng: ${r.targetOwner}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusPill status={r.status} map={REPORT_STATUS} />
                  <span className="font-mono text-[11px] text-ink-soft">
                    {r.id} · {formatDateTime(r.createdAt)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </QueryState>
      </div>
      <RuleBox
        title="Cam kết bảo vệ người tố giác & bản quyền"
        rules={[
          'Danh tính người báo cáo không được tiết lộ cho bên bị báo cáo.',
          'Báo cáo bản quyền được đối soát mã băm lưới 3D với tệp gốc.',
          'Sản phẩm có thể bị tạm khoá niêm yết trong khi thẩm định nếu rủi ro cao.',
          'Báo cáo sai sự thật nhiều lần có thể dẫn đến hạn chế tài khoản.',
        ]}
      />
      <div className="mt-4 text-right">
        <Pill tone="neutral">Tổng {all.length} báo cáo</Pill>
      </div>
    </>
  )
}
