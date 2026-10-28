import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PackageCheck,
  RotateCcw,
  Search,
  Timer,
  Truck,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../../../shared/lib/format'
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
import { StaffShipmentBadge } from '../components/StaffStatusBadge'
import { useStaffShipments } from '../mocks/staffMockData'
import type { ShipmentStatus, StaffShipment } from '../types/staff.types'

const TABS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ vận chuyển' },
  { value: 'SHIPPED', label: 'Đang vận chuyển' },
  { value: 'DELIVERED', label: 'Giao thành công' },
  { value: 'FAILED', label: 'Giao thất bại' },
  { value: 'RETURNED', label: 'Đã chuyển hoàn' },
]

export function StaffShippingListPage() {
  const { shipments } = useStaffShipments()
  const [activeTab, setActiveTab] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    document.title = 'Quản lý vận chuyển (Staff) · 3DWorld'
  }, [])

  const countByStatus = (status: ShipmentStatus) =>
    shipments.filter((s) => s.status === status).length

  const filteredShipments = useMemo(() => {
    return shipments.filter((item) => {
      const matchTab = !activeTab || item.status === activeTab
      const q = searchQuery.trim().toLowerCase()
      const matchSearch =
        !q ||
        item.trackingNumber.toLowerCase().includes(q) ||
        item.orderCode.toLowerCase().includes(q) ||
        item.storefrontName.toLowerCase().includes(q) ||
        item.recipientName.toLowerCase().includes(q) ||
        item.recipientPhone.includes(q) ||
        item.carrierName.toLowerCase().includes(q)
      return matchTab && matchSearch
    })
  }, [shipments, activeTab, searchQuery])

  const tabOptions = TABS.map((t) => ({
    ...t,
    count: t.value ? countByStatus(t.value as ShipmentStatus) : shipments.length,
  }))

  return (
    <div>
      <StaffHeader />

      <Hero
        code="STF-SHP-01"
        eyebrow="Phân hệ vận chuyển sàn"
        title="Quản Lý Vận Chuyển"
        accent="Theo Dõi Hành Trình Đơn Hàng & Vận Đơn GHTK."
        description="Giám sát tiến trình giao hàng sau khi người bán bàn giao gói hàng cho đơn vị vận chuyển, ghi nhận sự kiện phát hàng và xử lý các ca giao thất bại hoặc chuyển hoàn."
      />

      {/* KPI Cards */}
      <StatGrid>
        <StatCard
          label="Chờ vận chuyển"
          value={countByStatus('PENDING')}
          hint="Chờ bàn giao bưu tá"
          icon={Clock}
          tone="neutral"
        />
        <StatCard
          label="Đang vận chuyển"
          value={countByStatus('SHIPPED')}
          hint="Kiện hàng đang trung chuyển"
          icon={Truck}
          tone="teal"
        />
        <StatCard
          label="Giao thành công"
          value={countByStatus('DELIVERED')}
          hint="Đã ký nhận hợp lệ"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Giao thất bại"
          value={countByStatus('FAILED')}
          hint="Cần liên hệ hỗ trợ"
          icon={AlertTriangle}
          tone="orange"
        />
        <StatCard
          label="Đã chuyển hoàn"
          value={countByStatus('RETURNED')}
          hint="Hàng hoàn về xưởng"
          icon={RotateCcw}
          tone="danger"
        />
      </StatGrid>

      {/* Search & Filters */}
      <Toolbar>
        <div className="flex items-center gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tìm theo mã vận đơn, mã đơn, tên xưởng, người nhận hoặc số điện thoại..."
          />
        </div>
        <FilterTabs
          value={activeTab}
          onChange={setActiveTab}
          options={tabOptions}
        />
      </Toolbar>

      {/* Data Table */}
      {filteredShipments.length === 0 ? (
        <div className="mt-6">
          <StatusBlock
            tone="empty"
            title="Không tìm thấy vận đơn phù hợp"
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
          rows={filteredShipments}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'trackingNumber',
              header: 'Mã vận đơn & Đơn vị',
              render: (r) => (
                <CellTitle
                  title={r.trackingNumber}
                  sub={`${r.carrierName} · ${r.carrierCode}`}
                  to={`/staff/shipments/${r.id}`}
                />
              ),
            },
            {
              key: 'orderCode',
              header: 'Đơn hàng liên kết',
              render: (r) => (
                <div>
                  <span className="font-mono text-xs font-bold text-ink">
                    #{r.orderCode}
                  </span>
                  <p className="text-[11px] text-ink-soft">
                    {r.items.length} tác phẩm
                  </p>
                </div>
              ),
            },
            {
              key: 'storefrontName',
              header: 'Xưởng sản xuất',
              render: (r) => (
                <div className="max-w-[180px]">
                  <p className="truncate font-semibold text-ink">
                    {r.storefrontName}
                  </p>
                  <p className="text-[11px] text-ink-soft">
                    Người bán: {r.sellerName}
                  </p>
                </div>
              ),
            },
            {
              key: 'recipient',
              header: 'Người nhận & Điểm đến',
              render: (r) => (
                <div>
                  <p className="font-semibold text-ink">{r.recipientName}</p>
                  <p className="text-[11px] text-ink-soft">
                    {r.recipientPhone} · {r.recipientProvince}
                  </p>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Trạng thái',
              render: (r) => <StaffShipmentBadge status={r.status} />,
            },
            {
              key: 'lastUpdatedAt',
              header: 'Cập nhật cuối',
              render: (r) => (
                <span className="font-mono text-xs text-ink-soft">
                  {formatDateTime(r.lastUpdatedAt)}
                </span>
              ),
            },
            {
              key: 'action',
              header: 'Thao tác',
              render: (r) => (
                <Btn
                  to={`/staff/shipments/${r.id}`}
                  size="sm"
                  variant="white"
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
