import { Download, Lock, ShieldCheck, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatVnd } from '../../../shared/format'
import { Btn, CellTitle, DataTable, FilterTabs, Hero, MockNotice, RuleBox, StatCard, StatGrid, StatusPill, Toolbar } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import type { EarningStatus } from '../data/seller.fixtures'
import { useEarnings } from '../hooks/useSeller'
import { EARNING_STATUS } from '../lib/status'

/** MP 053 · Quản Lý Doanh Thu Người Bán */
export function RevenuePage() {
  const q = useEarnings()
  const [tab, setTab] = useState<EarningStatus | ''>('')
  useEffect(() => {
    document.title = 'Doanh thu xưởng · 3DWorld'
  }, [])
  const all = q.data?.earnings ?? []
  const w = q.data?.wallet

  return (
    <>
      <MockNotice api="/api/seller/earnings" />
      <Hero
        code="MP 053"
        eyebrow="Doanh thu & dòng tiền"
        title="Doanh Thu Xưởng Chế Tác"
        accent="Ký Quỹ 72h & Đối Soát Giải Ngân."
        actions={
          <>
            <Btn variant="white" icon={Download}>
              Xuất sao kê CSV
            </Btn>
            <Btn to="/wallet/payouts/new" variant="primary" icon={Wallet}>
              Rút tiền
            </Btn>
          </>
        }
      />
      <StatGrid>
        <StatCard label="Khả dụng" value={w ? formatVnd(w.available) : '—'} icon={Wallet} tone="green" hint="Có thể rút" />
        <StatCard label="Chờ mở khoá" value={w ? formatVnd(w.pending) : '—'} icon={ShieldCheck} tone="orange" hint="Cửa sổ 72h" />
        <StatCard label="Tạm giữ" value={w ? formatVnd(w.held) : '—'} icon={Lock} tone="danger" hint="Do tranh chấp" />
        <StatCard label="Phí sàn" value="5%" tone="violet" hint="Gói Maker Pro" />
      </StatGrid>
      <Toolbar>
        <FilterTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: '', label: 'Tất cả khoản thu', count: all.length },
            ...(Object.keys(EARNING_STATUS) as EarningStatus[]).map((s) => ({ value: s, label: EARNING_STATUS[s].label, count: all.filter((e) => e.status === s).length })),
          ]}
        />
      </Toolbar>
      <QueryState isLoading={q.isLoading} error={q.error}>
        <DataTable
          rows={all.filter((e) => !tab || e.status === tab)}
          rowKey={(e) => e.id}
          columns={[
            { key: 'id', header: 'Mã thu nhập / đơn', render: (e) => <CellTitle title={e.id} sub={`#ORD-${e.orderId}`} to={`/seller/revenue/${e.id}`} /> },
            { key: 'p', header: 'Mẫu & SKU', render: (e) => <CellTitle title={e.product} sub={e.sku} /> },
            { key: 'g', header: 'Doanh số gốc', render: (e) => formatVnd(e.gross) },
            { key: 'f', header: 'Phí sàn', render: (e) => <span className="text-danger">-{formatVnd(e.gross * e.feeRate)}</span> },
            { key: 'n', header: 'Thực nhận', render: (e) => <strong>{formatVnd(e.gross * (1 - e.feeRate))}</strong> },
            { key: 's', header: 'Trạng thái', render: (e) => <StatusPill status={e.status} map={EARNING_STATUS} /> },
            { key: 'b', header: 'Điều kiện mở khoá', render: (e) => <span className="block max-w-[15rem] text-xs text-ink-soft">{e.blocker ?? 'Đã giải ngân vào ví khả dụng.'}</span> },
            { key: 'x', header: '', render: (e) => <Btn to={`/seller/revenue/${e.id}`} size="sm">Sổ cái</Btn> },
          ]}
        />
      </QueryState>
      <RuleBox
        title="3 điểm chặn giải ngân ký quỹ (release blockers)"
        rules={[
          'Doanh thu chỉ chuyển từ “chờ” sang “khả dụng” sau 72h kể từ khi người mua nhận hàng (received_at).',
          'Đơn đang có khiếu nại / tranh chấp bị chuyển sang “tạm giữ” cho đến khi có phán quyết.',
          'Đơn COD chỉ ghi nhận doanh thu sau khi bưu cục quyết toán tiền thu hộ (cod_settled_at).',
        ]}
      />
    </>
  )
}
