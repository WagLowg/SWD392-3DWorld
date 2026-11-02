import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Truck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/lib/format'
import {
  Btn,
  CellTitle,
  DataTable,
  DetailLayout,
  FilterTabs,
  KeyValues,
  MoneyRows,
  Pill,
  SearchInput,
  Section,
  StatCard,
  StatGrid,
  Toolbar,
} from '../../../shared/ui/kit'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { formatAttributes } from '../../marketplace/lib/format'
import { StaffHorizontalShippingTracker } from '../../staff/components/StaffHorizontalShippingTracker'
import { StaffShipmentBadge } from '../../staff/components/StaffStatusBadge'
import { CodOperationsPanel } from '../../staff/components/CodOperationsPanel'
import type { ShipmentStatus, StaffShipment } from '../../staff/types/staff.types'
import { useAdminShipments } from '../services/admin-shipment.service'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'PREPARING', label: 'Chờ bàn giao' },
  { value: 'SHIPPED', label: 'Đã bàn giao' },
  { value: 'IN_TRANSIT', label: 'Đang vận chuyển' },
  { value: 'ARRIVED_AT_DESTINATION', label: 'Đến điểm giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'RECEIVED', label: 'Đã nhận' },
  { value: 'RETURNED', label: 'Hoàn trả' },
]

const matchesStatus = (shipment: StaffShipment, status: string) =>
  !status || shipment.status === status || (status === 'SHIPPED' && shipment.status === 'HANDED_TO_CARRIER')

const isMoving = (status: ShipmentStatus) =>
  ['SHIPPED', 'HANDED_TO_CARRIER', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION'].includes(status)

export function AdminShipmentsPage() {
  const { shipments, isLoading, isError, refetch } = useAdminShipments()
  const [status, setStatus] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [term, setTerm] = useState('')

  useEffect(() => {
    document.title = 'Đối soát vận chuyển & COD · Admin 3DWorld'
  }, [])

  const rows = useMemo(() => {
    const query = term.trim().toLowerCase()
    return shipments.filter((shipment) => {
      const searchable = [
        shipment.trackingNumber,
        shipment.orderCode,
        shipment.storefrontName,
        shipment.sellerName,
        shipment.recipientName,
        shipment.recipientPhone,
        shipment.carrierName,
      ]
        .join(' ')
        .toLowerCase()
      return (
        matchesStatus(shipment, status) &&
        (!paymentMethod || shipment.paymentMethod === paymentMethod) &&
        (!query || searchable.includes(query))
      )
    })
  }, [paymentMethod, shipments, status, term])

  const count = (target: string) => shipments.filter((shipment) => matchesStatus(shipment, target)).length
  const codShipments = shipments.filter((shipment) => shipment.paymentMethod === 'COD')
  const codInFlight = codShipments.filter(
    (shipment) => !['RECEIVED', 'RETURNED', 'CANCELLED'].includes(shipment.status),
  )
  const codInFlightAmount = codInFlight.reduce((sum, shipment) => sum + shipment.codAmount, 0)
  const filterOptions = STATUS_FILTERS.map((item) => ({
    ...item,
    count: item.value ? count(item.value) : shipments.length,
  }))

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-[.18em] text-violet">Admin · Vận hành</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Đối soát vận chuyển & COD</h1>
          <p className="mt-2 max-w-3xl text-sm text-ink-soft sm:text-base">
            Theo dõi toàn bộ vận đơn và đơn hàng của hệ thống, từ lúc người bán chuẩn bị kiện đến giao nhận và thu hộ.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 font-label text-sm font-semibold shadow-sm transition hover:border-violet disabled:opacity-60"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Làm mới dữ liệu
        </button>
      </header>

      <StatGrid>
        <StatCard label="Tổng vận đơn" value={shipments.length} hint="Toàn bộ hệ thống" icon={Truck} tone="violet" />
        <StatCard
          label="Đang vận chuyển"
          value={shipments.filter((item) => isMoving(item.status)).length}
          hint="Đang trên hành trình giao nhận"
          icon={Clock3}
          tone="teal"
        />
        <StatCard
          label="Đã hoàn tất"
          value={count('RECEIVED')}
          hint="Người mua đã xác nhận nhận hàng"
          icon={PackageCheck}
          tone="green"
        />
        <StatCard
          label="COD đang theo dõi"
          value={formatVnd(codInFlightAmount)}
          hint={`${codInFlight.length} vận đơn chưa kết thúc`}
          icon={CircleDollarSign}
          tone="orange"
        />
        <StatCard
          label="Giao thành công"
          value={count('DELIVERED') + count('RECEIVED')}
          hint="Đã giao hoặc đã xác nhận nhận"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Chuyển hoàn"
          value={count('RETURNED')}
          hint="Cần theo dõi chi phí hoàn"
          icon={RotateCcw}
          tone="danger"
        />
      </StatGrid>

      <Toolbar>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <SearchInput value={term} onChange={setTerm} placeholder="Tìm mã vận đơn, mã đơn, gian hàng, người nhận..." />
          <select
            aria-label="Lọc hình thức thanh toán"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-violet"
          >
            <option value="">Mọi thanh toán</option>
            <option value="COD">COD</option>
            <option value="ZALOPAY">Đã thanh toán trước</option>
          </select>
        </div>
        <FilterTabs value={status} onChange={setStatus} options={filterOptions} />
      </Toolbar>

      {isLoading ? (
        <div className="mt-6">
          <StatusBlock
            tone="empty"
            title="Đang tải dữ liệu vận chuyển"
            body="Đang đồng bộ toàn bộ vận đơn từ Backend."
          />
        </div>
      ) : isError ? (
        <div className="mt-6">
          <StatusBlock
            tone="error"
            title="Không tải được danh sách vận đơn"
            body="Kiểm tra Backend hoặc quyền ADMIN rồi thử lại."
            action={
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-full bg-ink px-5 py-2 text-xs font-semibold text-white"
              >
                Thử lại
              </button>
            }
          />
        </div>
      ) : (
        <DataTable
          rows={rows}
          rowKey={(item) => item.id}
          empty="Không có vận đơn phù hợp với bộ lọc hiện tại."
          columns={[
            {
              key: 'shipment',
              header: 'Vận đơn',
              render: (item) => (
                <CellTitle
                  title={item.trackingNumber}
                  sub={`${item.carrierName} · ${item.carrierCode}`}
                  to={`/admin/shipments/${item.id}`}
                />
              ),
            },
            {
              key: 'order',
              header: 'Đơn hàng',
              render: (item) => <CellTitle title={`#${item.orderCode}`} sub={`${item.items.length} sản phẩm`} />,
            },
            {
              key: 'storefront',
              header: 'Gian hàng',
              render: (item) => <CellTitle title={item.storefrontName} sub={item.sellerName} />,
            },
            {
              key: 'recipient',
              header: 'Người nhận',
              render: (item) => (
                <CellTitle title={item.recipientName} sub={`${item.recipientPhone} · ${item.recipientProvince}`} />
              ),
            },
            { key: 'status', header: 'Trạng thái', render: (item) => <StaffShipmentBadge status={item.status} /> },
            {
              key: 'cod',
              header: 'Thanh toán / COD',
              render: (item) => (
                <div>
                  <p className="font-semibold text-ink">
                    {item.paymentMethod === 'COD' ? formatVnd(item.codAmount) : 'Trả trước'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">{item.paymentMethod}</p>
                </div>
              ),
            },
            {
              key: 'updated',
              header: 'Cập nhật',
              render: (item) => (
                <span className="font-mono text-xs text-ink-soft">{formatDateTime(item.lastUpdatedAt)}</span>
              ),
            },
            {
              key: 'action',
              header: '',
              render: (item) => (
                <Btn to={`/admin/shipments/${item.id}`} size="sm" variant="primary">
                  Theo dõi
                </Btn>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}

export function AdminShipmentDetailPage() {
  const { shipmentId } = useParams<{ shipmentId: string }>()
  const { shipments, isLoading, isError, refetch } = useAdminShipments()
  const shipment = shipments.find((item) => item.id === Number(shipmentId))

  useEffect(() => {
    document.title = shipment
      ? `Vận đơn ${shipment.trackingNumber} · Admin 3DWorld`
      : 'Chi tiết vận đơn · Admin 3DWorld'
  }, [shipment])

  if (!shipment) {
    return (
      <div>
        <BackToShipments />
        <div className="mt-6">
          <StatusBlock
            tone={isError ? 'error' : 'empty'}
            title={isError ? 'Không tải được vận đơn' : isLoading ? 'Đang tải vận đơn' : 'Không tìm thấy vận đơn'}
            body={
              isError
                ? 'Kiểm tra kết nối Backend hoặc quyền ADMIN rồi thử lại.'
                : `Vận đơn #${shipmentId ?? '—'} không có trong dữ liệu toàn hệ thống.`
            }
            action={
              isError ? (
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="rounded-full bg-ink px-5 py-2 text-xs font-semibold text-white"
                >
                  Thử lại
                </button>
              ) : undefined
            }
          />
        </div>
      </div>
    )
  }

  const codCompleted = shipment.paymentMethod === 'COD' && ['DELIVERED', 'RECEIVED'].includes(shipment.status)

  return (
    <div>
      <BackToShipments />

      <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-[.18em] text-violet">
            Admin · Đơn hàng #{shipment.orderCode}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{shipment.trackingNumber}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {shipment.carrierName} ({shipment.carrierCode}) · Khởi tạo {formatDateTime(shipment.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <StaffShipmentBadge status={shipment.status} />
          <p className="mt-2 text-xs text-ink-soft">Cập nhật {formatDateTime(shipment.lastUpdatedAt)}</p>
        </div>
      </header>

      <div className="mt-7">
        <StaffHorizontalShippingTracker shipment={shipment} />
      </div>

      <DetailLayout
        main={
          <>
            <Section n={1} title="Thông tin giao nhận">
              <KeyValues
                cols={3}
                items={[
                  { label: 'Gian hàng', value: shipment.storefrontName },
                  { label: 'Người bán', value: shipment.sellerName },
                  { label: 'Điện thoại người bán', value: shipment.sellerPhone },
                  { label: 'Người nhận', value: shipment.recipientName },
                  { label: 'Điện thoại người nhận', value: shipment.recipientPhone },
                  { label: 'Địa chỉ', value: shipment.recipientAddress },
                ]}
              />
            </Section>

            <Section n={2} title={`Sản phẩm trong đơn (${shipment.items.length})`}>
              {shipment.items.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="border-b border-line text-xs uppercase text-ink-soft">
                      <tr>
                        <th className="px-3 py-3">Sản phẩm</th>
                        <th className="px-3 py-3">Biến thể / SKU</th>
                        <th className="px-3 py-3 text-center">Số lượng</th>
                        <th className="px-3 py-3 text-right">Đơn giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipment.items.map((item) => (
                        <tr key={item.id} className="border-b border-line/60 last:border-0">
                          <td className="px-3 py-3 font-semibold">{item.productTitle}</td>
                          <td className="px-3 py-3 text-ink-soft">
                            {formatAttributes(item.variantName) || 'Mặc định'}
                            <span className="block font-mono text-[10px]">{item.sku}</span>
                          </td>
                          <td className="px-3 py-3 text-center font-bold">{item.quantity}</td>
                          <td className="px-3 py-3 text-right font-mono">{formatVnd(item.unitPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-ink-soft">Backend chưa trả chi tiết sản phẩm của đơn này.</p>
              )}
            </Section>

            <Section n={3} title="Mốc vận chuyển">
              {shipment.events.length ? (
                <ol className="space-y-3">
                  {shipment.events.map((event) => (
                    <li key={event.id} className="border-b border-line/60 pb-3 text-sm last:border-0">
                      <p className="font-semibold">{event.title}</p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {formatDateTime(event.timestamp)} · {event.description}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink-soft">
                  Backend hiện trả trạng thái mới nhất của vận đơn; chưa có danh sách sự kiện chi tiết.
                </p>
              )}
            </Section>
          </>
        }
        aside={
          <>
            <CodOperationsPanel
              orderId={shipment.orderId}
              paymentMethod={shipment.paymentMethod}
              fulfillmentStatus={shipment.status}
            />
            <Section title="Đối soát thanh toán & COD">
              <MoneyRows
                rows={[
                  {
                    label: 'Tiền hàng',
                    value: formatVnd(Math.max(0, shipment.orderTotalAmount - shipment.shippingFee)),
                  },
                  { label: 'Phí vận chuyển', value: formatVnd(shipment.shippingFee) },
                  { label: 'Hình thức', value: shipment.paymentMethod === 'COD' ? 'Thu hộ COD' : 'Thanh toán trước' },
                ]}
                total={{
                  label: shipment.paymentMethod === 'COD' ? 'Số tiền COD' : 'Tổng đơn',
                  value: formatVnd(shipment.paymentMethod === 'COD' ? shipment.codAmount : shipment.orderTotalAmount),
                }}
              />
              <div className="mt-4">
                <Pill tone={shipment.paymentMethod !== 'COD' || codCompleted ? 'green' : 'orange'}>
                  {shipment.paymentMethod !== 'COD'
                    ? 'Đã thanh toán trước'
                    : codCompleted
                      ? 'Đủ điều kiện đối soát COD'
                      : 'Đang theo dõi thu hộ'}
                </Pill>
              </div>
            </Section>

            <Section title="Thông tin kiện hàng">
              <KeyValues
                items={[
                  { label: 'Khối lượng', value: shipment.totalWeightGrams ? `${shipment.totalWeightGrams} g` : '—' },
                  { label: 'Số lần giao', value: shipment.deliveryAttempts || '—' },
                  { label: 'Ghi chú', value: shipment.notes || '—' },
                ]}
              />
            </Section>
          </>
        }
      />
    </div>
  )
}

function BackToShipments() {
  return (
    <Link
      to="/admin/shipments"
      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:text-violet"
    >
      <ArrowLeft size={16} /> Về danh sách vận đơn
    </Link>
  )
}
