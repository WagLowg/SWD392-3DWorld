import { AlertTriangle, BadgeCheck, Gavel, Package, RefreshCw, Scale, ShieldAlert, Store, Truck, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { Btn, CellTitle, DataTable, FilterTabs, Hero, MockNotice, Pill, RuleBox, Section, StatCard, StatGrid, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import type { OpsCase, OpsDomain } from '../data/ops.fixtures'
import { useCommissions, useOpsAll } from '../hooks/useOps'
import { OPS_STATUS } from '../lib/status'

const ROUTE: Partial<Record<OpsDomain, string>> = {
  storefront: '/ops/storefronts',
  product: '/ops/products',
  report: '/ops/reports',
  order: '/ops/orders',
  shipment: '/ops/shipments',
  cod: '/ops/cod',
  refund: '/ops/refunds',
  finance: '/ops/finance',
  escalation: '/ops/escalations',
  payout: '/ops/payouts',
}

const DOMAIN_LABEL: Partial<Record<OpsDomain, string>> = {
  storefront: 'Xác thực xưởng',
  product: 'Kiểm duyệt sản phẩm',
  report: 'Báo cáo vi phạm',
  order: 'Đơn hàng',
  shipment: 'Vận chuyển',
  cod: 'Đối soát COD',
  refund: 'Trọng tài hoàn tiền',
  finance: 'Đối soát tài chính',
  escalation: 'Kiểm duyệt cấp cao',
  payout: 'Chi trả xưởng',
}

const OPEN = new Set(['PENDING', 'NEEDS_INFO', 'NEEDS_EVIDENCE', 'CANCEL_REQUESTED', 'DISPUTE', 'FAILED_DELIVERY', 'MISMATCH', 'NEEDS_VIDEO', 'UNKNOWN', 'ESCALATED', 'PENDING_APPROVAL', 'NEEDS_REVIEW', 'OPEN', 'LOCKED'])

/** MP 055 · Tổng Quan Hàng Chờ Quản Trị */
export function OpsQueueOverviewPage() {
  const q = useOpsAll()
  const [scope, setScope] = useState<'' | 'mine' | 'sla'>('')
  useEffect(() => {
    document.title = 'Tổng quan hàng chờ · Ops 3DWorld'
  }, [])
  const open = (q.data ?? []).filter((c) => OPEN.has(c.status) && ROUTE[c.domain])
  const rows = open.filter((c) => (scope === 'mine' ? c.assignee === 'KDV_NguyenSWD' : scope === 'sla' ? c.deadline && Date.parse(c.deadline) - Date.now() < 12 * 3600_000 : true))
  const by = (d: OpsDomain) => open.filter((c) => c.domain === d).length

  return (
    <>
      <MockNotice api="GET /api/admin/queues/summary" />
      <Hero
        code="MP 055"
        eyebrow="Staff operations console"
        title="Tổng Quan Hàng Chờ Thẩm Định"
        accent="Điều Phối Tác Vụ, Rủi Ro & Sổ Cái."
        actions={
          <Btn variant="white" icon={RefreshCw} onClick={() => q.refetch()}>
            Làm mới hàng chờ
          </Btn>
        }
      />
      <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(['storefront', 'product', 'report', 'cod', 'refund', 'finance'] as OpsDomain[]).map((d) => (
          <Link key={d} to={ROUTE[d] ?? '/ops'} className="rounded-[1.75rem] bg-white/95 p-4 shadow-soft hover:-translate-y-0.5 hover:shadow-lift">
            <p className="font-label text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{DOMAIN_LABEL[d]}</p>
            <p className="mt-1 font-display text-3xl font-bold">{String(by(d)).padStart(2, '0')}</p>
            <p className="text-xs text-violet">Dẫn sang hàng chờ →</p>
          </Link>
        ))}
      </div>
      <Section
        title="Hàng chờ ưu tiên cần xử lý ngay"
        className="mt-6"
        aside={
          <FilterTabs
            value={scope}
            onChange={setScope}
            dark
            options={[
              { value: '', label: 'Tất cả', count: open.length },
              { value: 'mine', label: 'Của tôi' },
              { value: 'sla', label: 'SLA < 12h' },
            ]}
          />
        }
      >
        <QueryState isLoading={q.isLoading} error={q.error}>
          <DataTable
            rows={rows}
            rowKey={(c) => `${c.domain}-${c.id}`}
            columns={[
              { key: 'id', header: 'Mã tác vụ', render: (c) => <CellTitle title={c.id} sub={c.subtitle} to={`${ROUTE[c.domain]}/${c.id}`} /> },
              { key: 'd', header: 'Phân loại', render: (c) => <Pill tone="violet">{DOMAIN_LABEL[c.domain]}</Pill> },
              { key: 't', header: 'Đối tượng', render: (c) => c.title },
              { key: 'w', header: 'Chờ từ', render: (c) => <span className="text-xs">{formatDateTime(c.createdAt)}</span> },
              { key: 'a', header: 'Chuyên viên', render: (c) => c.assignee ?? <span className="text-ink-soft">Chưa phân công</span> },
              { key: 's', header: 'Trạng thái', render: (c) => <StatusPill status={c.status} map={OPS_STATUS[c.domain]} /> },
              { key: 'x', header: '', render: (c) => <Btn to={`${ROUTE[c.domain]}/${c.id}`} size="sm" variant="primary">Xử lý</Btn> },
            ]}
          />
        </QueryState>
      </Section>
      <RuleBox
        title="Ràng buộc nghiệp vụ & bất biến sổ cái"
        rules={['Mọi thao tác phê duyệt / phong toả ghi bất biến vào audit_logs.', 'Người mua tự động xác nhận nhận hàng sau 24h kể từ delivered_at.', 'Cửa sổ khiếu nại 72h tính từ received_at.', 'Doanh thu COD chỉ vào pending_balance sau khi bưu cục quyết toán.']}
      />
    </>
  )
}

/** MP 073 · Tổng Quan Quản Trị (điều hành toàn sàn) */
export function OpsDashboardPage() {
  const q = useOpsAll()
  const revenue = useCommissions()
  useEffect(() => {
    document.title = 'Tổng quan điều hành · Ops 3DWorld'
  }, [])
  const all = q.data ?? []
  const open = all.filter((c) => OPEN.has(c.status))
  const money = (d: OpsDomain) => all.filter((c) => c.domain === d).reduce((s, c) => s + (c.amount ?? 0), 0)
  const recent: OpsCase[] = [...all].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 6)

  return (
    <>
      <MockNotice api="GET /api/admin/dashboard" />
      <Hero code="MP 073" eyebrow="Tổng quan điều hành" title="Tổng Quan Điều Hành Toàn Sàn" accent="Hiệu Suất, Tài Chính & Rủi Ro Dòng Tiền." />
      <StatGrid>
        <StatCard label="Hồ sơ đang mở" value={open.length} icon={AlertTriangle} tone="orange" to="/ops/queue" />
        <StatCard label="GMV đơn vận hành" value={formatVnd(money('order'))} icon={Package} tone="violet" to="/ops/orders" />
        <StatCard label="Ký quỹ đang tranh chấp" value={formatVnd(money('refund'))} icon={Scale} tone="danger" to="/ops/refunds" />
        <StatCard label="Doanh thu sàn kỳ này" value={formatVnd((revenue.data ?? []).filter((r) => r.status === 'RECOGNIZED').reduce((s, r) => s + r.revenue, 0))} icon={Wallet} tone="green" to="/ops/revenue" />
      </StatGrid>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Section title="Hàng chờ cần hành động khẩn cấp">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { to: '/ops/storefronts', label: 'Mở duyệt xưởng', icon: Store, d: 'storefront' as const },
              { to: '/ops/products', label: 'Kiểm định sản phẩm', icon: BadgeCheck, d: 'product' as const },
              { to: '/ops/escalations', label: 'Chế tài cấp cao', icon: Gavel, d: 'escalation' as const },
              { to: '/ops/cod', label: 'Đối soát COD', icon: Truck, d: 'cod' as const },
              { to: '/ops/refunds', label: 'Phân xử hoàn tiền', icon: Scale, d: 'refund' as const },
              { to: '/ops/reports', label: 'Truy vết vi phạm', icon: ShieldAlert, d: 'report' as const },
            ].map(({ to, label, icon: Icon, d }) => (
              <Link key={to} to={to} className="flex items-center gap-3 rounded-2xl bg-surface-low p-4 hover:bg-surface-high">
                <Icon size={18} className="text-violet" />
                <span className="flex-1 font-semibold">{label}</span>
                <Pill tone="orange">{open.filter((c) => c.domain === d).length}</Pill>
              </Link>
            ))}
          </div>
        </Section>
        <Section title="Toàn vẹn sổ cái & hệ thống">
          <ul className="space-y-2 text-sm">
            {[
              ['Đối soát ZaloPay', 'Ổn định', 'green'],
              ['Webhook bưu cục GHN', 'Độ trễ 120ms', 'green'],
              ['Giao dịch UNKNOWN', `${all.filter((c) => c.status === 'UNKNOWN').length} cần tra soát`, 'orange'],
              ['Chuỗi băm audit log', 'Khớp', 'green'],
            ].map(([k, v, t]) => (
              <li key={k} className="flex items-center justify-between rounded-2xl bg-surface-low px-4 py-3">
                <span>{k}</span>
                <Pill tone={t as 'green' | 'orange'}>{v}</Pill>
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <Section title="Nhật ký giao dịch & hồ sơ gần nhất" className="mt-6">
        <DataTable
          rows={recent}
          rowKey={(c) => `${c.domain}-${c.id}`}
          columns={[
            { key: 'id', header: 'Mã', render: (c) => <CellTitle title={c.id} sub={DOMAIN_LABEL[c.domain] ?? c.domain} to={ROUTE[c.domain] ? `${ROUTE[c.domain]}/${c.id}` : undefined} /> },
            { key: 't', header: 'Đối tượng', render: (c) => c.title },
            { key: 'a', header: 'Giá trị', render: (c) => (c.amount ? formatVnd(c.amount) : '—') },
            { key: 's', header: 'Trạng thái', render: (c) => <StatusPill status={c.status} map={OPS_STATUS[c.domain]} /> },
            { key: 'd', header: 'Thời điểm', render: (c) => <span className="text-xs">{formatDateTime(c.createdAt)}</span> },
          ]}
        />
      </Section>
    </>
  )
}
