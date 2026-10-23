import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { Btn, CellTitle, DataTable, FilterTabs, Hero, MockNotice, RuleBox, StatusPill, Toolbar } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import type { PayoutStatus } from '../data/wallet.fixtures'
import { usePayouts } from '../hooks/useWallet'
import { PAYOUT_STATUS } from '../lib/labels'

/** MP-099 · Danh Sách Yêu Cầu Rút Tiền */
export function PayoutsPage() {
  const q = usePayouts()
  const [tab, setTab] = useState<PayoutStatus | ''>('')
  useEffect(() => {
    document.title = 'Yêu cầu rút tiền · 3DWorld'
  }, [])
  const all = q.data ?? []
  return (
    <>
      <MockNotice api="GET /api/payouts/mine" />
      <Hero
        code="MP-099"
        eyebrow="Payouts"
        title="Yêu Cầu Rút Tiền"
        accent="Theo Dõi & Quản Lý Chi Trả."
        actions={
          <Btn to="/wallet/payouts/new" variant="primary" icon={Plus}>
            Tạo yêu cầu rút
          </Btn>
        }
      />
      <Toolbar>
        <FilterTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: '', label: 'Tất cả', count: all.length },
            ...(Object.keys(PAYOUT_STATUS) as PayoutStatus[]).map((s) => ({ value: s, label: PAYOUT_STATUS[s].label, count: all.filter((p) => p.status === s).length })),
          ]}
        />
      </Toolbar>
      <QueryState isLoading={q.isLoading} error={q.error}>
        <DataTable
          rows={all.filter((p) => !tab || p.status === tab)}
          rowKey={(p) => p.id}
          columns={[
            { key: 'id', header: 'Mã giao dịch & thời gian', render: (p) => <CellTitle title={p.id} sub={formatDateTime(p.at)} to={`/wallet/payouts/${p.id}`} /> },
            { key: 'b', header: 'Tài khoản thụ hưởng', render: (p) => <CellTitle title={p.bank.name} sub={`${p.bank.masked} · ${p.bank.holder}`} /> },
            { key: 'a', header: 'Số tiền rút', render: (p) => <strong>{formatVnd(p.amount)}</strong> },
            { key: 'h', header: 'Tạm giữ / sổ cái', render: (p) => <code className="text-xs">{p.ledgerRef}</code> },
            { key: 's', header: 'Trạng thái', render: (p) => <StatusPill status={p.status} map={PAYOUT_STATUS} /> },
            { key: 'x', header: '', render: (p) => <Btn to={`/wallet/payouts/${p.id}`} size="sm">Chi tiết</Btn> },
          ]}
        />
      </QueryState>
      <RuleBox
        title="Khoá ký quỹ nguyên tử & an toàn giao dịch"
        rules={[
          'Khi tạo lệnh, số tiền chuyển ngay từ khả dụng sang tạm giữ — không thể dùng hai lần.',
          'Lệnh thất bại hoặc bị từ chối sẽ hoàn số tiền tạm giữ về khả dụng bằng bút toán bù trừ.',
          'Trạng thái UNKNOWN được tra soát với ngân hàng; tiền vẫn tạm giữ, không trừ hai lần.',
          'Chỉ rút về tài khoản ngân hàng đã được xác minh.',
        ]}
      />
    </>
  )
}
