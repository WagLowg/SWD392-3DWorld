import { Download, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDateTime, formatVnd } from '../../../shared/lib/format'
import { Btn, CellTitle, DataTable, FilterTabs, Hero, MockNotice, Pill, RuleBox, StatCard, StatGrid, StatusPill, Toolbar } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { BUCKET_LABEL } from '../../wallet/lib/labels'
import { useCommissions, usePlatformEarnings, usePlatformLedger, useReleaseEarning } from '../../../features/ops/hooks/useOps'
import { EARNING_STATUS, REVENUE_STATUS } from '../../../features/ops/lib/status'

/** MP 088 · Sổ Cái Ví Bất Biến Toàn Sàn */
export function PlatformLedgerPage() {
  const q = usePlatformLedger()
  const [bucket, setBucket] = useState<'' | 'available' | 'pending' | 'held'>('')
  useEffect(() => {
    document.title = 'Sổ cái ví toàn sàn · Ops 3DWorld'
  }, [])
  return (
    <>
      <MockNotice api="GET /api/admin/wallet-ledger" />
      <Hero
        code="MP 088"
        eyebrow="Sổ cái ví bất biến"
        title="Sổ Cái Ví Toàn Sàn"
        accent="Biến Động Số Dư, Bút Toán Bù Trừ & Đối Soát."
        actions={
          <Btn variant="white" icon={Download}>
            Xuất sổ kế toán
          </Btn>
        }
      />
      <Toolbar>
        <FilterTabs
          value={bucket}
          onChange={setBucket}
          options={[
            { value: '', label: 'Tất cả ngăn' },
            { value: 'available', label: 'Khả dụng' },
            { value: 'pending', label: 'Bảo lưu 72h' },
            { value: 'held', label: 'Tạm khoá rút' },
          ]}
        />
      </Toolbar>
      <QueryState isLoading={q.isLoading} error={q.error}>
        <DataTable
          rows={(q.data ?? []).filter((l) => !bucket || l.bucket === bucket)}
          rowKey={(l) => l.id}
          columns={[
            { key: 'id', header: 'Mã bút toán & ví', render: (l) => <CellTitle title={l.id} sub={`${l.wallet} · ${formatDateTime(l.at)}`} /> },
            { key: 'b', header: 'Ngăn số dư', render: (l) => <Pill tone="neutral">{BUCKET_LABEL[l.bucket]}</Pill> },
            { key: 't', header: 'Loại nghiệp vụ', render: (l) => l.type },
            { key: 'a', header: 'Số tiền', render: (l) => <strong className={l.amount < 0 ? 'text-danger' : 'text-teal'}>{l.amount > 0 ? '+' : ''}{formatVnd(l.amount)}</strong> },
            { key: 'af', header: 'Số dư sau', render: (l) => formatVnd(l.balanceAfter) },
            { key: 'i', header: 'Idempotency', render: (l) => <code className="text-xs">{l.idem}</code> },
            { key: 'h', header: 'Mã băm', render: (l) => <code className="text-xs text-ink-soft">{l.hash}</code> },
          ]}
        />
      </QueryState>
      <RuleBox
        title="Nguyên tắc sổ cái bất biến"
        rules={['Append-only: không sửa, không xoá bút toán.', 'Tam phân số dư: khả dụng, bảo lưu 72h, tạm khoá rút.', 'Khoá idempotency chặn ghi trùng.', 'Mỗi bút toán băm SHA-256 nối chuỗi với bút toán trước.']}
      />
    </>
  )
}

/** MP 089 · Quản Trị Thu Nhập Người Bán Toàn Sàn */
export function PlatformEarningsPage() {
  const q = usePlatformEarnings()
  const release = useReleaseEarning()
  const [tab, setTab] = useState('')
  useEffect(() => {
    document.title = 'Thu nhập người bán toàn sàn · Ops 3DWorld'
  }, [])
  const all = q.data ?? []
  return (
    <>
      <MockNotice api="GET /api/admin/seller-earnings" />
      <Hero code="MP 089" eyebrow="Thu nhập người bán" title="Quản Trị Thu Nhập Người Bán" accent="Khoá Ký Quỹ 72h & Kích Hoạt Giải Ngân." />
      <StatGrid>
        <StatCard label="Tổng GMV" value={formatVnd(all.reduce((s, e) => s + e.gross, 0))} tone="violet" />
        <StatCard label="Phí sàn 5%" value={formatVnd(all.reduce((s, e) => s + e.fee, 0))} tone="green" />
        <StatCard label="Đủ điều kiện giải phóng" value={all.filter((e) => e.status === 'ELIGIBLE').length} tone="teal" />
        <StatCard label="Đóng băng" value={all.filter((e) => e.status === 'FROZEN').length} tone="danger" />
      </StatGrid>
      <Toolbar>
        <FilterTabs
          value={tab}
          onChange={setTab}
          options={[{ value: '', label: 'Tất cả', count: all.length }, ...Object.keys(EARNING_STATUS).map((s) => ({ value: s, label: EARNING_STATUS[s].label, count: all.filter((e) => e.status === s).length }))]}
        />
      </Toolbar>
      <QueryState isLoading={q.isLoading} error={q.error}>
        <DataTable
          rows={all.filter((e) => !tab || e.status === tab)}
          rowKey={(e) => e.id}
          columns={[
            { key: 'id', header: 'Mã thu nhập & đơn', render: (e) => <CellTitle title={e.id} sub={e.order} /> },
            { key: 's', header: 'Xưởng', render: (e) => e.store },
            { key: 'g', header: 'Tổng đơn', render: (e) => formatVnd(e.gross) },
            { key: 'f', header: 'Phí sàn', render: (e) => <span className="text-danger">-{formatVnd(e.fee)}</span> },
            { key: 'n', header: 'Thực nhận', render: (e) => <strong>{formatVnd(e.net)}</strong> },
            { key: 'r', header: 'Mốc mở khoá', render: (e) => <span className="text-xs">{formatDateTime(e.releaseAt)}</span> },
            { key: 'st', header: 'Trạng thái', render: (e) => <StatusPill status={e.status} map={EARNING_STATUS} /> },
            {
              key: 'x',
              header: '',
              render: (e) =>
                e.status === 'ELIGIBLE' ? (
                  <Btn size="sm" variant="primary" icon={Lock} disabled={release.isPending} onClick={() => release.mutate(e.id)}>
                    Mở khoá vào ví
                  </Btn>
                ) : null,
            },
          ]}
        />
      </QueryState>
    </>
  )
}

/** MP 090 · Báo Cáo Doanh Thu Hoa Hồng Sàn */
export function CommissionReportPage() {
  const q = useCommissions()
  useEffect(() => {
    document.title = 'Doanh thu hoa hồng sàn · Ops 3DWorld'
  }, [])
  const rows = q.data ?? []
  const recognized = rows.filter((r) => r.status === 'RECOGNIZED')
  return (
    <>
      <MockNotice api="GET /api/admin/revenue-report" />
      <Hero
        code="MP 090"
        eyebrow="Báo cáo doanh thu"
        title="Doanh Thu Hoa Hồng Toàn Sàn"
        accent="Hoa Hồng POD & Phí Duy Trì Gian Hàng."
        actions={
          <Btn variant="white" icon={Download}>
            Xuất báo cáo thuế
          </Btn>
        }
      />
      <StatGrid>
        <StatCard label="GMV kỳ này" value={formatVnd(rows.reduce((s, r) => s + r.gmv, 0))} tone="violet" />
        <StatCard label="Hoa hồng POD" value={formatVnd(recognized.filter((r) => r.rate !== '—').reduce((s, r) => s + r.revenue, 0))} tone="green" />
        <StatCard label="Phí thuê bao" value={formatVnd(recognized.filter((r) => r.rate === '—').reduce((s, r) => s + r.revenue, 0))} tone="teal" />
        <StatCard label="Đã ghi nhận" value={formatVnd(recognized.reduce((s, r) => s + r.revenue, 0))} tone="orange" />
      </StatGrid>
      <QueryState isLoading={q.isLoading} error={q.error}>
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            { key: 'id', header: 'Mã giao dịch & nguồn', render: (r) => <CellTitle title={r.id} sub={r.source} /> },
            { key: 's', header: 'Xưởng đối tác', render: (r) => r.store },
            { key: 'g', header: 'GMV', render: (r) => formatVnd(r.gmv) },
            { key: 'rt', header: 'Tỷ lệ', render: (r) => r.rate },
            { key: 'v', header: 'Doanh thu sàn', render: (r) => <strong>{formatVnd(r.revenue)}</strong> },
            { key: 'st', header: 'Ghi nhận', render: (r) => <StatusPill status={r.status} map={REVENUE_STATUS} /> },
          ]}
        />
      </QueryState>
      <RuleBox
        title="Quy chuẩn ghi nhận doanh thu"
        rules={['Hoa hồng POD chỉ ghi nhận khi đơn hết cửa sổ khiếu nại.', 'Đơn hoàn tiền đảo bút toán hoa hồng tương ứng.', 'Phí thuê bao ghi nhận theo kỳ sử dụng.', 'Chốt kỳ kế toán khoá mọi điều chỉnh trong kỳ.']}
      />
    </>
  )
}
