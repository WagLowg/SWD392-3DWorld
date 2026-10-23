import { useEffect, useState } from 'react'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { Btn, CellTitle, DataTable, FilterTabs, Hero, MockNotice, RuleBox, StatusPill, Toolbar } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useTransactions } from '../../buyer/hooks/useBuyer'
import { TXN_STATUS } from '../../buyer/lib/status'

/** MP-102 · Lịch Sử Thanh Toán */
export function PaymentsHistoryPage() {
  const q = useTransactions()
  const [tab, setTab] = useState<'' | 'order' | 'topup' | 'sub' | 'unknown'>('')
  useEffect(() => {
    document.title = 'Lịch sử thanh toán · 3DWorld'
  }, [])
  const all = q.data ?? []
  const match = (p: string) => (tab === 'order' ? /đơn/i.test(p) : tab === 'topup' ? /nạp/i.test(p) : tab === 'sub' ? /thuê bao/i.test(p) : true)
  const rows = all.filter((t) => (tab === 'unknown' ? t.status === 'UNKNOWN' : match(t.purpose)))

  return (
    <>
      <MockNotice api="GET /api/payments/mine" />
      <Hero code="MP-102" eyebrow="Thanh toán" title="Lịch Sử Thanh Toán" accent="Mọi Giao Dịch & Lần Thử Cổng Thanh Toán." />
      <Toolbar>
        <FilterTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: '', label: 'Tất cả', count: all.length },
            { value: 'order', label: 'Đơn hàng vật lý' },
            { value: 'topup', label: 'Nạp ví' },
            { value: 'sub', label: 'Thuê bao gian hàng' },
            { value: 'unknown', label: 'Cảnh báo UNKNOWN', count: all.filter((t) => t.status === 'UNKNOWN').length },
          ]}
        />
      </Toolbar>
      <QueryState isLoading={q.isLoading} error={q.error}>
        <DataTable
          rows={rows}
          rowKey={(t) => t.id}
          columns={[
            { key: 'id', header: 'Mã giao dịch & thời gian', render: (t) => <CellTitle title={t.id} sub={formatDateTime(t.createdAt)} to={`/payments/${t.id}`} /> },
            { key: 'e', header: 'Tham chiếu', render: (t) => <span className="text-sm">{t.purpose}{t.orderIds.length ? ` · ${t.orderIds.map((o) => `#${o}`).join(', ')}` : ''}</span> },
            { key: 'a', header: 'Nỗ lực & cổng', render: (t) => `${t.attempts.length} lần · ${t.attempts.at(-1)?.method}` },
            { key: 'm', header: 'Số tiền', render: (t) => <strong>{formatVnd(t.amount)}</strong> },
            { key: 's', header: 'Trạng thái', render: (t) => <StatusPill status={t.status} map={TXN_STATUS} /> },
            { key: 'x', header: '', render: (t) => <Btn to={`/payments/${t.id}`} size="sm">Chi tiết</Btn> },
          ]}
        />
      </QueryState>
      <RuleBox
        title="Cơ chế chống thu phí trùng lặp"
        rules={[
          'Mỗi giao dịch có khoá idempotency — thử lại không tạo khoản trừ mới.',
          'UNKNOWN: cổng chưa trả kết quả; hệ thống tự đối soát, không thanh toán lại.',
          'Chỉ callback có chữ ký MAC hợp lệ mới cập nhật trạng thái.',
          'Hoàn tiền trả về đúng phương thức đã thanh toán.',
        ]}
      />
    </>
  )
}
