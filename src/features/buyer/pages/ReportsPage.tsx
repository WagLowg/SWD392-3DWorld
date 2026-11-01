import { Flag, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatDateTime } from '../../../shared/lib/format'
import { Btn, FilterTabs, Hero, Pill, RuleBox, StatusPill, Toolbar } from '../../../shared/ui/kit'
import { ApiNote } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import type { ReportStatus } from '../data/buyer.fixtures'
import { useReports } from '../hooks/useBuyer'
import { REPORT_STATUS, TARGET_TYPE } from '../lib/status'

/** MP 034 · Danh Sách Báo Cáo Vi Phạm */
export function ReportsPage() {
  const q = useReports()
  const [params] = useSearchParams()
  const submitted = params.get('submitted')
  const [tab, setTab] = useState<ReportStatus | ''>('')
  useEffect(() => {
    document.title = 'Báo cáo vi phạm · 3DWorld'
  }, [])
  const all = q.data ?? []
  const rows = all.filter((r) => !tab || r.status === tab)
  return (
    <>
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
      {submitted && (
        <p className="mt-6 rounded-2xl bg-mint p-4 text-sm text-[#0f5132]">
          Đã gửi báo cáo #{submitted} thành công. Bộ phận kiểm duyệt đã tiếp nhận dữ liệu từ API.
        </p>
      )}
      <ApiNote className="mt-4">
        Backend hiện có POST /api/reports để gửi báo cáo nhưng chưa có GET /api/reports/mine hoặc GET /api/reports/&#123;id&#125; cho người gửi. Danh sách bên dưới không dùng dữ liệu mẫu và sẽ trống cho tới khi backend bổ sung API đọc.
      </ApiNote>
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
