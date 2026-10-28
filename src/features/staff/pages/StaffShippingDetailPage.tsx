import {
  AlertTriangle,
  ArrowLeft,
  Box,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Package,
  Phone,
  ShieldAlert,
  Truck,
  User,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/format'
import {
  AuditTimeline,
  Btn,
  DetailLayout,
  KeyValues,
  MoneyRows,
  Pill,
  Section,
} from '../../../shared/ui/kit'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { StaffHeader } from '../components/StaffHeader'
import { StaffShipmentBadge } from '../components/StaffStatusBadge'
import { INITIAL_STAFF_SHIPMENTS } from '../mocks/staffMockData'
import type { ShipmentStatus, StaffShipment, StaffShipmentEvent } from '../types/staff.types'

export function StaffShippingDetailPage() {
  const { shipmentId } = useParams<{ shipmentId: string }>()
  const idNum = Number(shipmentId)

  const initial = INITIAL_STAFF_SHIPMENTS.find((s) => s.id === idNum)
  const [shipment, setShipment] = useState<StaffShipment | null>(initial ?? null)

  // Prototype action modal state
  const [activeModal, setActiveModal] = useState<ShipmentStatus | null>(null)
  const [actionReason, setActionReason] = useState<string>('')
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (shipment) {
      document.title = `Vận đơn ${shipment.trackingNumber} · 3DWorld Staff`
    }
  }, [shipment])

  if (!shipment) {
    return (
      <div>
        <StaffHeader backTo="/portal/staff/shipments" backLabel="Về danh sách vận đơn" />
        <StatusBlock
          tone="empty"
          title="Không tìm thấy vận đơn"
          body={`Vận đơn có mã số #${shipmentId} không tồn tại trong danh mục theo dõi.`}
          action={
            <Link
              to="/portal/staff/shipments"
              className="rounded-full bg-ink px-6 py-2.5 font-label text-xs font-semibold text-white"
            >
              Xem tất cả vận đơn
            </Link>
          }
        />
      </div>
    )
  }

  // Handle local simulated action
  const handleApplySimulatedEvent = (status: ShipmentStatus) => {
    const reasonText = actionReason.trim() || 'Cập nhật từ bảng điều khiển Staff (Mô phỏng UI)'
    const nowIso = new Date().toISOString()

    const newEvent: StaffShipmentEvent = {
      id: `ev-sim-${Date.now()}`,
      timestamp: nowIso,
      status: status,
      title:
        status === 'DELIVERED'
          ? 'Xác nhận giao hàng thành công (Mô phỏng)'
          : status === 'FAILED'
            ? 'Báo giao hàng thất bại (Mô phỏng)'
            : 'Xác nhận chuyển hoàn về xưởng (Mô phỏng)',
      description: reasonText,
      location: 'Hệ thống Staff 3DWorld (Demo)',
      actor: 'Nhân viên vận hành (Phiên làm việc hiện tại)',
    }

    setShipment((prev) => {
      if (!prev) return null
      return {
        ...prev,
        status: status,
        deliveredAt: status === 'DELIVERED' ? nowIso : prev.deliveredAt,
        lastUpdatedAt: nowIso,
        deliveryAttempts: status === 'FAILED' ? prev.deliveryAttempts + 1 : prev.deliveryAttempts,
        failureReason: status === 'FAILED' ? reasonText : prev.failureReason,
        events: [newEvent, ...prev.events],
      }
    })

    setActionFeedback(
      `Đã cập nhật trạng thái vận đơn sang "${
        status === 'DELIVERED' ? 'Giao thành công' : status === 'FAILED' ? 'Giao thất bại' : 'Chuyển hoàn'
      }" (Dữ liệu mô phỏng local).`,
    )
    setActiveModal(null)
    setActionReason('')
  }

  return (
    <div className="space-y-6">
      <StaffHeader backTo="/portal/staff/shipments" backLabel="Quay lại danh sách vận chuyển" />

      {/* Top Banner Card */}
      <div className="rounded-[2rem] bg-white/95 p-6 shadow-soft sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-ink-soft">
                Đơn hàng: #{shipment.orderCode}
              </span>
              <span className="text-line">•</span>
              <span className="text-xs text-ink-soft">
                Khởi tạo: {formatDateTime(shipment.shippedAt)}
              </span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {shipment.trackingNumber}
            </h1>
            <p className="mt-1 font-label text-sm text-ink-soft">
              Đơn vị vận chuyển:{' '}
              <strong className="text-ink">{shipment.carrierName}</strong>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <StaffShipmentBadge status={shipment.status} />
            <span className="font-mono text-[11px] text-ink-soft">
              Cập nhật: {formatDateTime(shipment.lastUpdatedAt)}
            </span>
          </div>
        </div>

        {actionFeedback && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-mint px-4 py-3 text-xs font-semibold text-[#0f5132]">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{actionFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-xs underline hover:opacity-80"
            >
              Đóng
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Left Details, Right Operations */}
      <DetailLayout
        main={
          <>
            {/* Section 1: Thông tin lấy và giao hàng */}
            <Section n={1} title="Thông tin giao nhận & địa chỉ">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Sender */}
                <div className="rounded-2xl bg-surface-low p-4">
                  <div className="flex items-center gap-2 font-label text-xs font-bold uppercase tracking-wider text-ink-soft">
                    <Building2 size={15} className="text-orange" />
                    <span>Xưởng lấy hàng (Người bán)</span>
                  </div>
                  <p className="mt-2 font-display font-bold text-ink">
                    {shipment.storefrontName}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Đại diện: {shipment.sellerName} · {shipment.sellerPhone}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-ink">
                    {shipment.sellerAddress}
                  </p>
                </div>

                {/* Recipient */}
                <div className="rounded-2xl bg-surface-low p-4">
                  <div className="flex items-center gap-2 font-label text-xs font-bold uppercase tracking-wider text-ink-soft">
                    <MapPin size={15} className="text-teal" />
                    <span>Người nhận (Khách hàng)</span>
                  </div>
                  <p className="mt-2 font-display font-bold text-ink">
                    {shipment.recipientName}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Liên hệ: {shipment.recipientPhone}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-ink">
                    {shipment.recipientAddress}, {shipment.recipientWard},{' '}
                    {shipment.recipientDistrict}, {shipment.recipientProvince}
                  </p>
                </div>
              </div>

              {shipment.notes && (
                <div className="mt-4 rounded-2xl border border-line bg-white/70 p-3.5 text-xs text-ink-soft">
                  <strong className="text-ink">Ghi chú giao nhận:</strong> {shipment.notes}
                </div>
              )}
            </Section>

            {/* Section 2: Kiện hàng & Tác phẩm 3D */}
            <Section n={2} title="Quy cách kiện hàng & Tác phẩm">
              <KeyValues
                cols={3}
                items={[
                  {
                    label: 'Tổng khối lượng cước',
                    value: `${shipment.totalWeightGrams} grams`,
                  },
                  {
                    label: 'Kích thước kiện (D x R x C)',
                    value: `${shipment.packageDimensionsCm.length} x ${shipment.packageDimensionsCm.width} x ${shipment.packageDimensionsCm.height} cm`,
                  },
                  {
                    label: 'Số lần phát hàng',
                    value: `${shipment.deliveryAttempts} lần`,
                  },
                ]}
              />

              <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-low font-label font-semibold uppercase tracking-wider text-ink-soft">
                    <tr>
                      <th className="px-4 py-3">Sản phẩm 3D</th>
                      <th className="px-4 py-3">Phân loại / SKU</th>
                      <th className="px-4 py-3 text-center">Số lượng</th>
                      <th className="px-4 py-3 text-right">Khối lượng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {shipment.items.map((it) => (
                      <tr key={it.id} className="hover:bg-surface-low/30">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{it.productTitle}</p>
                        </td>
                        <td className="px-4 py-3 text-ink-soft">
                          <span>{it.variantName}</span>
                          <span className="block font-mono text-[10px] opacity-70">
                            {it.sku}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-ink">
                          x{it.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-ink-soft">
                          {it.weightGrams}g
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Section 3: Lộ trình vận chuyển (Timeline) */}
            <Section n={3} title="Hành trình kiện hàng GHTK">
              <ol className="relative space-y-6 border-l-2 border-line/80 pl-6 text-sm">
                {shipment.events.map((ev, idx) => (
                  <li key={ev.id} className="relative">
                    <span
                      className={`absolute -left-[31px] top-0 grid h-5 w-5 place-items-center rounded-full ring-4 ring-white ${
                        idx === 0
                          ? 'bg-teal text-white'
                          : 'bg-line text-ink-soft'
                      }`}
                    >
                      <Clock size={11} />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-ink-soft">
                          {formatDateTime(ev.timestamp)}
                        </span>
                        <span className="font-display font-bold text-ink">
                          {ev.title}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                        {ev.description}
                      </p>
                      {ev.location && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-ink-soft">
                          <MapPin size={11} className="text-orange" /> {ev.location}
                          {ev.actor && <span>· Phụ trách: {ev.actor}</span>}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          </>
        }
        aside={
          <>
            {/* Staff Action Prototype Section */}
            <Section
              title="Thao tác vận hành Staff"
              subtitle="Chế độ mô phỏng giao diện (Demo Prototype)"
            >
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setActiveModal('DELIVERED')}
                  className="w-full rounded-2xl bg-mint px-4 py-3 font-label text-xs font-bold text-[#0f5132] transition hover:brightness-95"
                >
                  Xác nhận giao thành công
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('FAILED')}
                  className="w-full rounded-2xl bg-peach px-4 py-3 font-label text-xs font-bold text-orange-deep transition hover:brightness-95"
                >
                  Báo giao thất bại
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('RETURNED')}
                  className="w-full rounded-2xl bg-[#ffdad6] px-4 py-3 font-label text-xs font-bold text-danger transition hover:brightness-95"
                >
                  Xác nhận chuyển hoàn
                </button>
              </div>

              <div className="mt-4 rounded-xl bg-surface-low p-3 text-[11px] leading-relaxed text-ink-soft">
                <span className="font-semibold text-ink">Lưu ý nghiệp vụ:</span> Thao tác cập nhật sự kiện vận chuyển mô phỏng thay đổi trạng thái kiện hàng và ghi nhận mốc giao trên trình duyệt của Staff.
              </div>
            </Section>

            {/* Financial Summary */}
            <Section title="Dòng tiền & Thu hộ">
              <MoneyRows
                rows={[
                  {
                    label: 'Tiền hàng',
                    value: formatVnd(shipment.orderTotalAmount - shipment.shippingFee),
                  },
                  {
                    label: 'Cước vận chuyển',
                    value: formatVnd(shipment.shippingFee),
                  },
                  {
                    label: 'Hình thức',
                    value: shipment.paymentMethod === 'ZALOPAY' ? 'Thanh toán ZaloPay' : 'COD (Thu hộ)',
                  },
                ]}
                total={{
                  label: shipment.paymentMethod === 'COD' ? 'Cần thu COD' : 'Tổng giá trị',
                  value: formatVnd(shipment.orderTotalAmount),
                }}
              />
              <div className="mt-3">
                <Pill tone={shipment.paymentStatus === 'PAID' ? 'green' : 'orange'}>
                  {shipment.paymentStatus === 'PAID' ? 'Đã thanh toán trước' : 'Chờ thu tiền khi giao'}
                </Pill>
              </div>
            </Section>

            {/* Support Hotline */}
            <div className="rounded-2xl bg-white/95 p-4 shadow-soft text-xs">
              <p className="font-label font-bold text-ink">Hotline hỗ trợ GHTK</p>
              <p className="mt-1 text-ink-soft">
                Tổng đài bưu tá: 1900 6092 (Nhánh 1)
              </p>
              <p className="mt-0.5 text-ink-soft">
                Mã tra cứu đối tác: 3DWORLD-LOGISTICS-V1
              </p>
            </div>
          </>
        }
      />

      {/* Modal Dialog for Prototype Event Action */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-lift animate-fade-up">
            <h3 className="font-display text-lg font-bold text-ink">
              {activeModal === 'DELIVERED'
                ? 'Xác nhận: Giao hàng thành công'
                : activeModal === 'FAILED'
                  ? 'Báo cáo: Giao hàng không thành công'
                  : 'Xác nhận: Chuyển hoàn về xưởng'}
            </h3>
            <p className="mt-1 text-xs text-ink-soft">
              Vận đơn: <strong className="text-ink">{shipment.trackingNumber}</strong>
            </p>

            <div className="mt-4">
              <label
                htmlFor="action-reason"
                className="block font-label text-xs font-semibold text-ink-soft"
              >
                Ghi chú đối soát / Lý do cập nhật
              </label>
              <textarea
                id="action-reason"
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={
                  activeModal === 'DELIVERED'
                    ? 'VD: Khách hàng đã ký nhận đúng người, kiện hàng nguyên vẹn...'
                    : activeModal === 'FAILED'
                      ? 'VD: Thuê bao bận, shipper gọi 3 cuộc không nghe máy...'
                      : 'VD: Khách từ chối nhận, hoàn lại xưởng Triều Khúc...'
                }
                className="mt-1.5 w-full rounded-2xl bg-surface-low p-3 text-xs outline-none focus:ring-2 focus:ring-violet/40"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null)
                  setActionReason('')
                }}
                className="rounded-full bg-surface-low px-5 py-2 font-label text-xs font-semibold text-ink-soft hover:bg-surface-high"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={() => handleApplySimulatedEvent(activeModal)}
                className={`rounded-full px-5 py-2 font-label text-xs font-semibold text-white transition ${
                  activeModal === 'DELIVERED'
                    ? 'bg-ink hover:bg-violet'
                    : activeModal === 'FAILED'
                      ? 'bg-orange hover:bg-orange-deep'
                      : 'bg-danger hover:opacity-90'
                }`}
              >
                Áp dụng thay đổi (Mô phỏng)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

