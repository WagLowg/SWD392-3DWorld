import {
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  History,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { formatDateTime, formatVnd } from '../../../shared/format'
import {
  Btn,
  CellTitle,
  DataTable,
  FilterTabs,
  Hero,
  SearchInput,
  StatCard,
  StatGrid,
  Toolbar,
} from '../../../shared/ui/kit'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { StaffHeader } from '../components/StaffHeader'
import { StaffAdminExecutionBadge, StaffRefundBadge } from '../components/StaffStatusBadge'
import { useStaffRefunds } from '../mocks/staffMockData'
import type { RefundStatus, StaffRefundRequest } from '../types/staff.types'

const REFUND_TABS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả yêu cầu' },
  { value: 'SUBMITTED', label: 'Chờ thẩm định' },
  { value: 'UNDER_REVIEW', label: 'Đang thẩm định' },
  { value: 'NEEDS_INFO', label: 'Cần bổ sung' },
  { value: 'APPROVED', label: 'Đã duyệt — Chờ Admin hoàn tiền' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: 'HISTORY', label: 'Lịch sử xử lý' },
]

export function StaffRefundListPage() {
  const { refunds } = useStaffRefunds()
  const [activeTab, setActiveTab] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    document.title = 'Quản lý hoàn tiền (Staff) · 3DWorld'
  }, [])

  const countByTab = (tabVal: string) => {
    if (!tabVal) return refunds.length
    if (tabVal === 'HISTORY') {
      return refunds.filter(
        (r) => r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'COMPLETED',
      ).length
    }
    return refunds.filter((r) => r.status === tabVal).length
  }

  const filteredRefunds = useMemo(() => {
    return refunds.filter((item) => {
      let matchTab = true
      if (activeTab === 'HISTORY') {
        matchTab =
          item.status === 'APPROVED' ||
          item.status === 'REJECTED' ||
          item.status === 'COMPLETED'
      } else if (activeTab) {
        matchTab = item.status === activeTab
      }

      const q = searchQuery.trim().toLowerCase()
      const matchSearch =
        !q ||
        item.code.toLowerCase().includes(q) ||
        item.orderCode.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.customerPhone.includes(q) ||
        item.storefrontName.toLowerCase().includes(q) ||
        item.sellerName.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q)

      return matchTab && matchSearch
    })
  }, [refunds, activeTab, searchQuery])

  const tabOptions = REFUND_TABS.map((t) => ({
    ...t,
    count: countByTab(t.value),
  }))

  return (
    <div>
      <StaffHeader />

      <Hero
        code="STF-CAS-01"
        eyebrow="Phân hệ khiếu nại & hoàn tiền"
        title="Quản Lý Yêu Cầu Hoàn Tiền"
        accent="Thẩm Định Bằng Chứng & Phán Quyết Trọng Tài."
        description="Tiếp nhận và xem xét các hồ sơ khiếu nại hoàn tiền do người mua gửi trong cửa sổ 72 giờ kể từ khi nhận hàng. Phán quyết Chấp thuận sẽ đưa hồ sơ vào hàng chờ chuyển tiếp cho Admin chi trả tài chính."
      />

      {/* KPI Cards */}
      <StatGrid>
        <StatCard
          label="Chờ thẩm định"
          value={countByTab('SUBMITTED')}
          hint="Hồ sơ mới gửi"
          icon={Clock}
          tone="orange"
        />
        <StatCard
          label="Đang thẩm định"
          value={countByTab('UNDER_REVIEW')}
          hint="Đang đối chiếu chứng cứ"
          icon={AlertCircle}
          tone="violet"
        />
        <StatCard
          label="Đã duyệt — Chờ Admin"
          value={countByTab('APPROVED')}
          hint="Hàng chờ Admin chi trả"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Đã từ chối"
          value={countByTab('REJECTED')}
          hint="Lưu trữ lịch sử thẩm định"
          icon={XCircle}
          tone="danger"
        />
      </StatGrid>

      {/* Search & Filters */}
      <Toolbar>
        <div className="flex items-center gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tìm theo mã yêu cầu, mã đơn, tên khách hàng, tên xưởng hoặc lý do..."
          />
        </div>
        <FilterTabs
          value={activeTab}
          onChange={setActiveTab}
          options={tabOptions}
        />
      </Toolbar>

      {/* Table */}
      {filteredRefunds.length === 0 ? (
        <div className="mt-6">
          <StatusBlock
            tone="empty"
            title="Không tìm thấy hồ sơ khiếu nại"
            body="Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác."
            action={
              <button
                type="button"
                onClick={() => {
                  setActiveTab('')
                  setSearchQuery('')
                }}
                className="rounded-full bg-ink px-5 py-2 font-label text-xs font-semibold text-white transition hover:bg-violet"
              >
                Xóa bộ lọc
              </button>
            }
          />
        </div>
      ) : (
        <DataTable
          rows={filteredRefunds}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'code',
              header: 'Mã yêu cầu & Ngày nộp',
              render: (r) => (
                <CellTitle
                  title={r.code}
                  sub={formatDateTime(r.submittedAt)}
                  to={`/staff/refunds/${r.id}`}
                />
              ),
            },
            {
              key: 'orderCode',
              header: 'Đơn hàng liên quan',
              render: (r) => (
                <div>
                  <span className="font-mono text-xs font-bold text-ink">
                    #{r.orderCode}
                  </span>
                  <p className="text-[11px] text-ink-soft">
                    {r.shipmentSummary.carrierName} · {r.shipmentSummary.trackingNumber}
                  </p>
                </div>
              ),
            },
            {
              key: 'customer',
              header: 'Khách hàng',
              render: (r) => (
                <div>
                  <p className="font-semibold text-ink">{r.customerName}</p>
                  <p className="text-[11px] text-ink-soft">{r.customerPhone}</p>
                </div>
              ),
            },
            {
              key: 'seller',
              header: 'Xưởng in / Người bán',
              render: (r) => (
                <div className="max-w-[180px]">
                  <p className="truncate font-semibold text-ink">
                    {r.storefrontName}
                  </p>
                  <p className="text-[11px] text-ink-soft">
                    {r.sellerName}
                  </p>
                </div>
              ),
            },
            {
              key: 'reason',
              header: 'Căn cứ khiếu nại',
              render: (r) => (
                <div className="max-w-[220px]">
                  <p className="line-clamp-2 text-xs font-medium text-ink">
                    {r.reason}
                  </p>
                  <span className="mt-0.5 inline-block text-[10px] text-ink-soft">
                    {r.evidence.length} tệp chứng cứ
                  </span>
                </div>
              ),
            },
            {
              key: 'amount',
              header: 'Số tiền yêu cầu',
              render: (r) => (
                <div>
                  <p className="font-display font-bold text-danger">
                    {formatVnd(r.requestedAmount)}
                  </p>
                  <p className="text-[10px] text-ink-soft">
                    Đơn gốc: {formatVnd(r.originalOrderTotal)}
                  </p>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Thẩm định Staff',
              render: (r) => (
                <StaffRefundBadge status={r.status} executionStatus={r.adminExecutionStatus} />
              ),
            },
            {
              key: 'adminExecution',
              header: 'Tiến độ hoàn tiền Admin',
              render: (r) => (
                <StaffAdminExecutionBadge status={r.adminExecutionStatus ?? 'NOT_REQUESTED'} />
              ),
            },
            {
              key: 'action',
              header: 'Thao tác',
              render: (r) => (
                <Btn
                  to={`/staff/refunds/${r.id}`}
                  size="sm"
                  variant="primary"
                >
                  Xem chi tiết
                </Btn>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
