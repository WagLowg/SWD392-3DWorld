import { ArrowDownToLine, ArrowUpFromLine, Download, Lock, ShieldCheck, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDateTime, formatVnd } from '../../../shared/lib/format'
import { Btn, CellTitle, DataTable, FilterTabs, Hero, MockNotice, Pill, RuleBox, StatCard, StatGrid, StatusPill, Toolbar } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useWallet } from '../hooks/useWallet'
import { BUCKET_LABEL, LEDGER_TYPE } from '../lib/labels'

/** MP-096 · Ví Tài Khoản & Ba Nhóm Số Dư */
export function WalletPage() {
  const q = useWallet()
  const [tab, setTab] = useState<'' | 'plus' | 'minus' | 'release'>('')
  useEffect(() => {
    document.title = 'Ví tài khoản · 3DWorld'
  }, [])
  const b = q.data?.balances
  const rows = (q.data?.ledger ?? []).filter((l) => (tab === 'plus' ? l.amount > 0 && l.type !== 'HOLD' : tab === 'minus' ? l.amount < 0 : tab === 'release' ? l.type === 'RELEASE' : true))

  return (
    <>
      <MockNotice api="GET /api/wallets/me, GET /api/wallets/me/ledger" />
      <Hero
        code="MP-096"
        eyebrow="Ví tài khoản"
        title="Ví Tài Khoản"
        accent="Quản Lý Số Dư & Lịch Sử Sổ Cái."
        actions={
          <>
            <Btn to="/wallet/topup" variant="primary" icon={ArrowDownToLine}>
              Nạp tiền
            </Btn>
            <Btn to="/wallet/payouts/new" variant="white" icon={ArrowUpFromLine}>
              Rút về ngân hàng
            </Btn>
          </>
        }
      />
      <StatGrid>
        <StatCard label="Khả dụng" value={b ? formatVnd(b.available) : '—'} icon={Wallet} tone="green" hint="Dùng thanh toán hoặc rút" />
        <StatCard label="Chờ mở khoá" value={b ? formatVnd(b.pending) : '—'} icon={ShieldCheck} tone="orange" hint="Doanh thu trong cửa sổ 72h" />
        <StatCard label="Tạm giữ" value={b ? formatVnd(b.held) : '—'} icon={Lock} tone="danger" hint="Tranh chấp / lệnh rút đang xử lý" />
        <StatCard label="Tổng tài sản" value={b ? formatVnd(b.available + b.pending + b.held) : '—'} tone="violet" />
      </StatGrid>
      <Toolbar>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: '', label: 'Tất cả biến động' },
              { value: 'plus', label: 'Cộng (+)' },
              { value: 'minus', label: 'Trừ (−)' },
              { value: 'release', label: 'Giải ngân bảo chứng' },
            ]}
          />
          <Btn size="sm" variant="white" icon={Download}>
            Xuất sao kê CSV
          </Btn>
        </div>
      </Toolbar>
      <QueryState isLoading={q.isLoading} error={q.error}>
        <DataTable
          rows={rows}
          rowKey={(l) => l.id}
          columns={[
            { key: 'id', header: 'Mã bút toán & thời gian', render: (l) => <CellTitle title={l.id} sub={formatDateTime(l.at)} to={`/wallet/ledger/${l.id}`} /> },
            { key: 't', header: 'Loại giao dịch', render: (l) => <div className="space-y-1"><StatusPill status={l.type} map={LEDGER_TYPE} /><p className="text-xs text-ink-soft">{l.label}</p></div> },
            { key: 'b', header: 'Nhóm số dư', render: (l) => <Pill tone="neutral">{BUCKET_LABEL[l.bucket]}</Pill> },
            { key: 'a', header: 'Số tiền ghi sổ', render: (l) => <strong className={l.amount < 0 ? 'text-danger' : 'text-teal'}>{l.amount > 0 ? '+' : ''}{formatVnd(l.amount)}</strong> },
            { key: 'af', header: 'Số dư sau', render: (l) => formatVnd(l.balanceAfter) },
            { key: 'r', header: 'Căn cứ đối soát', render: (l) => <code className="text-xs">{l.ref}</code> },
            { key: 's', header: 'Trạng thái', render: (l) => <Pill tone={l.status === 'POSTED' ? 'green' : 'orange'}>{l.status}</Pill> },
          ]}
        />
      </QueryState>
      <RuleBox
        title="Cam kết minh bạch & tính bất biến"
        rules={[
          'Sổ cái chỉ ghi thêm (append-only); sai sót được xử lý bằng bút toán bù trừ, không sửa xoá.',
          'Mỗi bút toán có khoá idempotency — một nghiệp vụ không bao giờ được ghi hai lần.',
          'Ba nhóm số dư tách biệt: khả dụng, chờ mở khoá 72h, tạm giữ.',
          'Mỗi bút toán gắn mã băm SHA-256 để kiểm toán.',
        ]}
      />
    </>
  )
}
