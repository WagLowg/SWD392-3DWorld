import { useEffect, useState } from 'react'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { Btn, CellTitle, DataTable, FilterTabs, Hero, MockNotice, RuleBox, StatusPill, Toolbar } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import type { DisputeStatus } from '../data/seller.fixtures'
import { useDisputes } from '../hooks/useSeller'
import { DISPUTE_STATUS } from '../lib/status'

/** MP 051 · Danh Sách Tranh Chấp & Khiếu Nại Hoàn Tiền (người bán) */
export function DisputesPage() {
  const q = useDisputes()
  const [tab, setTab] = useState<DisputeStatus | ''>('')
  useEffect(() => {
    document.title = 'Tranh chấp & khiếu nại · 3DWorld'
  }, [])
  const all = q.data ?? []
  const rows = all.filter((d) => !tab || d.status === tab)

  return (
    <>
      <MockNotice api="/api/seller/disputes" />
      <Hero
        code="MP 051"
        eyebrow="Tranh chấp & khiếu nại"
        title="Tranh Chấp & Khiếu Nại Hoàn Tiền"
        accent="Phong Toả Ký Quỹ & Phản Hồi Minh Chứng."
        description="Khi người mua khiếu nại, doanh thu đơn bị phong toả. Phản hồi minh chứng trước hạn để tránh bị xử thua mặc định."
      />
      <Toolbar>
        <FilterTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: '', label: 'Tất cả', count: all.length },
            ...(Object.keys(DISPUTE_STATUS) as DisputeStatus[]).map((s) => ({ value: s, label: DISPUTE_STATUS[s].label, count: all.filter((d) => d.status === s).length })),
          ]}
        />
      </Toolbar>
      <QueryState isLoading={q.isLoading} error={q.error}>
        <DataTable
          rows={rows}
          rowKey={(d) => d.id}
          columns={[
            { key: 'id', header: 'Mã giao dịch & đơn', render: (d) => <CellTitle title={d.id} sub={`#ORD-${d.orderId}`} to={`/seller/disputes/${d.id}`} /> },
            { key: 'p', header: 'Sản phẩm', render: (d) => <CellTitle title={d.product} sub={d.sku} /> },
            { key: 'r', header: 'Lý do', render: (d) => d.reason },
            { key: 'a', header: 'Số tiền phong toả', render: (d) => <strong className="text-danger">{formatVnd(d.amount)}</strong> },
            { key: 's', header: 'Trạng thái', render: (d) => <StatusPill status={d.status} map={DISPUTE_STATUS} /> },
            { key: 't', header: 'Hạn phản hồi', render: (d) => <span className="text-xs">{formatDateTime(d.deadline)}</span> },
            {
              key: 'x',
              header: '',
              render: (d) => (
                <Btn to={`/seller/disputes/${d.id}`} size="sm" variant={d.status === 'NEEDS_RESPONSE' ? 'primary' : 'soft'}>
                  {d.status === 'NEEDS_RESPONSE' ? 'Phản hồi ngay' : 'Xem hồ sơ'}
                </Btn>
              ),
            },
          ]}
        />
      </QueryState>
      <RuleBox
        title="Ràng buộc nghiệp vụ & đối soát"
        rules={[
          'Doanh thu đơn bị khiếu nại chuyển sang ngăn tạm giữ (held) cho đến khi có phán quyết.',
          'Xưởng có 48h để phản hồi minh chứng; quá hạn hệ thống chuyển trọng tài với lợi thế cho người mua.',
          'Số tiền hoàn không vượt quá tổng đã thanh toán của đơn con.',
          'Đề xuất in bù phôi mới cần người mua đồng ý trước khi đóng tranh chấp.',
        ]}
      />
    </>
  )
}
