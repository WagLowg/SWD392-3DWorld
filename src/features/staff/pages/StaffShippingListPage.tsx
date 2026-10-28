import { CheckCircle2, Clock, PackageCheck, RotateCcw, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { formatDateTime } from '../../../shared/format'
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
import { useStaffShipments } from '../services/staff.service'
import type { ShipmentStatus } from '../types/staff.types'

const TABS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'PREPARING', label: 'Chờ seller bàn giao' },
  { value: 'SHIPPED', label: 'Đã bàn giao' },
  { value: 'IN_TRANSIT', label: 'Đang vận chuyển' },
  { value: 'ARRIVED_AT_DESTINATION', label: 'Đã đến điểm giao' },
  { value: 'DELIVERED', label: 'Giao thành công' },
  { value: 'RECEIVED', label: 'Đã nhận hàng' },
  { value: 'RETURNED', label: 'Hoàn trả' },
]

export function StaffShippingListPage() {
  const { shipments = [], isLoading, isError, refetch } = useStaffShipments()
  const [activeTab, setActiveTab] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    document.title = 'Quản lý vận chuyển (Staff) · 3DWorld'
  }, [])

  const countByStatus = (status: ShipmentStatus) =>
    shipments.filter((shipment) =>
      status === 'SHIPPED'
        ? shipment.status === 'SHIPPED' || shipment.status === 'HANDED_TO_CARRIER'
        : shipment.status === status,
    ).length

  const filteredShipments = useMemo(() => {
    return shipments.filter((item) => {
      const matchTab =
        !activeTab || item.status === activeTab || (activeTab === 'SHIPPED' && item.status === 'HANDED_TO_CARRIER')
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
          label="Chờ seller bàn giao"
          value={countByStatus('PREPARING')}
          hint="Đơn chưa được seller chuyển cho vận chuyển"
          icon={Clock}
          tone="neutral"
        />
        <StatCard
          label="Đã bàn giao"
          value={countByStatus('SHIPPED')}
          hint="Seller đã giao kiện cho đơn vị vận chuyển"
          icon={Truck}
          tone="violet"
        />
        <StatCard
          label="Đang vận chuyển"
          value={countByStatus('IN_TRANSIT')}
          hint="Staff đã cập nhật đang vận chuyển"
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
          label="Đã nhận hàng"
          value={countByStatus('RECEIVED')}
          hint="Người mua xác nhận đã nhận"
          icon={PackageCheck}
          tone="green"
        />
        <StatCard
          label="Hoàn trả"
          value={countByStatus('RETURNED')}
          hint="Kiện hàng trả về xưởng"
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
        <FilterTabs value={activeTab} onChange={setActiveTab} options={tabOptions} />
      </Toolbar>

      {/* Data Table */}
      {isLoading ? (
        <div className="mt-6">
          <StatusBlock
            tone="empty"
            title="Đang tải danh sách vận đơn"
            body="Đang đồng bộ dữ liệu vận chuyển từ Backend."
          />
        </div>
      ) : isError ? (
        <div className="mt-6">
          <StatusBlock
            tone="error"
            title="Không tải được danh sách vận đơn"
            body="Kiểm tra Backend hoặc quyền PRINT_STAFF rồi thử lại."
            action={
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-full bg-ink px-5 py-2 font-label text-xs font-semibold text-white"
              >
                Thử lại
              </button>
            }
          />
        </div>
      ) : filteredShipments.length === 0 ? (
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
                  <span className="font-mono text-xs font-bold text-ink">#{r.orderCode}</span>
                  <p className="text-[11px] text-ink-soft">{r.items.length} tác phẩm</p>
                </div>
              ),
            },
            {
              key: 'storefrontName',
              header: 'Xưởng sản xuất',
              render: (r) => (
                <div className="max-w-[180px]">
                  <p className="truncate font-semibold text-ink">{r.storefrontName}</p>
                  <p className="text-[11px] text-ink-soft">Người bán: {r.sellerName}</p>
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
              render: (r) => <span className="font-mono text-xs text-ink-soft">{formatDateTime(r.lastUpdatedAt)}</span>,
            },
            {
              key: 'action',
              header: 'Thao tác',
              render: (r) => (
                <Btn to={`/staff/shipments/${r.id}`} size="sm" variant="white">
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
