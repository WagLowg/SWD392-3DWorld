import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { Btn, FilterTabs, Hero, MockNotice, RuleBox, StatusPill, Toolbar } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import type { RefundStatus } from '../data/buyer.fixtures'
import { useRefundCases } from '../hooks/useBuyer'
import { REFUND_STATUS } from '../lib/status'

/** MP 030 · Danh Sách Yêu Cầu Hoàn Tiền */
export function RefundCasesPage() {
  const q = useRefundCases()
  const [tab, setTab] = useState<RefundStatus | ''>('')
  useEffect(() => {
    document.title = 'Yêu cầu hoàn tiền · 3DWorld'
  }, [])
  const all = q.data ?? []
  const rows = all.filter((r) => !tab || r.status === tab)

  return (
    <>
      <MockNotice api="GET /api/refunds/mine" />
      <Hero
        code="MP 030"
        eyebrow="Khiếu nại & ký quỹ"
        title="Yêu Cầu Hoàn Tiền"
        accent="Danh Sách Khiếu Nại Của Bạn."
        actions={
          <Btn to="/refunds/new" variant="primary" icon={Plus}>
            Tạo yêu cầu mới
          </Btn>
        }
      />
      <Toolbar>
        <FilterTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: '', label: 'Tất cả', count: all.length },
            ...(Object.keys(REFUND_STATUS) as RefundStatus[]).map((s) => ({ value: s, label: REFUND_STATUS[s].label, count: all.filter((r) => r.status === s).length })),
          ]}
        />
      </Toolbar>
      <div className="mt-6 space-y-4">
        <QueryState isLoading={q.isLoading} error={q.error}>
          {!rows.length ? (
            <StatusBlock tone="empty" title="Không có yêu cầu" body="Chưa có yêu cầu hoàn tiền nào ở trạng thái này." />
          ) : (
            rows.map((r) => (
              <Link key={r.id} to={`/refunds/${r.id}`} className="block rounded-[2rem] bg-white/95 p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold">{r.product}</p>
                    <p className="font-mono text-[11px] text-ink-soft">
                      {r.id} · #ORD-{r.orderId} · {r.storefront}
                    </p>
                  </div>
                  <StatusPill status={r.status} map={REFUND_STATUS} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                  <span className="text-ink-soft">{r.reason}</span>
                  <span className="font-semibold">{formatVnd(r.amount)}</span>
                  <span className="text-xs text-ink-soft">Gửi {formatDateTime(r.createdAt)}</span>
                </div>
              </Link>
            ))
          )}
        </QueryState>
      </div>
      <RuleBox
        title="Quy tắc tài chính & bảo chứng 72h"
        rules={[
          'Yêu cầu hoàn tiền phải gửi trong 72 giờ kể từ khi nhận hàng.',
          'Khoản tiền của đơn bị khiếu nại được giữ ký quỹ, xưởng chưa nhận được cho đến khi có phán quyết.',
          'Số tiền hoàn không vượt quá tổng đã thanh toán của đơn con.',
          'Trọng tài có thể yêu cầu video mở hộp — nộp đúng hạn để tránh bị bác.',
        ]}
      />
    </>
  )
}
