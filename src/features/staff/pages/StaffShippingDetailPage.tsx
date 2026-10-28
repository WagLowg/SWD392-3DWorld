import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Lock,
  MapPin,
  RotateCcw,
  Truck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiClientError } from '../../../shared/api'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { DetailLayout, KeyValues, MoneyRows, Pill, Section } from '../../../shared/ui/kit'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { formatAttributes } from '../../marketplace/lib/format'
import { StaffHeader } from '../components/StaffHeader'
import { StaffHorizontalShippingTracker } from '../components/StaffHorizontalShippingTracker'
import { StaffShipmentBadge } from '../components/StaffStatusBadge'
import { CodOperationsPanel } from '../components/CodOperationsPanel'
import {
  isValidShipmentTransition,
  SHIPMENT_STATUS_LABELS,
  VALID_SHIPMENT_TRANSITIONS,
} from '../lib/shippingTransitions'
import { useStaffShipments } from '../services/staff.service'
import type { ShipmentStatus } from '../types/staff.types'

export function StaffShippingDetailPage() {
  const { shipmentId } = useParams<{ shipmentId: string }>()
  const idNum = Number(shipmentId)

  const { shipments = [], isLoading, isError, refetch, transitionShipment } = useStaffShipments()
  const shipment = shipments.find((s) => s.id === idNum) || null

  // Trạng thái modal xác nhận chuyển trạng thái thủ công
  const [targetStatus, setTargetStatus] = useState<ShipmentStatus | null>(null)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (shipment) {
      document.title = `Vận đơn ${shipment.trackingNumber} · 3DWorld Staff`
    }
  }, [shipment])

  if (!shipment) {
    return (
      <div>
        <StaffHeader backTo="/staff/shipments" backLabel="Về danh sách vận đơn" />
        <StatusBlock
          tone={isError ? 'error' : 'empty'}
          title={isError ? 'Không tải được vận đơn' : isLoading ? 'Đang tải vận đơn' : 'Không tìm thấy vận đơn'}
          body={
            isError
              ? 'Kiểm tra kết nối Backend hoặc quyền PRINT_STAFF rồi thử lại.'
              : `Vận đơn có mã số #${shipmentId} không tồn tại trong danh mục theo dõi.`
          }
          action={
            isError ? (
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-full bg-ink px-6 py-2.5 font-label text-xs font-semibold text-white"
              >
                Thử lại
              </button>
            ) : (
              <Link
                to="/staff/shipments"
                className="rounded-full bg-ink px-6 py-2.5 font-label text-xs font-semibold text-white"
              >
                Xem tất cả vận đơn
              </Link>
            )
          }
        />
      </div>
    )
  }

  const allowedTransitions = VALID_SHIPMENT_TRANSITIONS[shipment.status] || []
  const awaitingSellerHandoff = ['PREPARING', 'PENDING', 'PENDING_PICKUP'].includes(shipment.status)
  const isTerminalState = allowedTransitions.length === 0

  // Mở modal xác nhận cập nhật trạng thái
  const handleOpenModal = (target: ShipmentStatus) => {
    setTargetStatus(target)
    setFormError(null)
  }

  // Đóng modal
  const handleCloseModal = () => {
    setTargetStatus(null)
    setFormError(null)
  }

  // Xác nhận cập nhật trạng thái thủ công (Staff Manual Status Update)
  const handleConfirmTransition = async () => {
    if (!targetStatus) return

    // Kiểm tra tính hợp lệ của luồng chuyển đổi trạng thái
    if (!isValidShipmentTransition(shipment.status, targetStatus)) {
      setFormError(
        `Chuyển đổi từ ${SHIPMENT_STATUS_LABELS[shipment.status]} sang ${SHIPMENT_STATUS_LABELS[targetStatus]} không hợp lệ theo quy trình vận hành.`,
      )
      return
    }

    try {
      await transitionShipment.mutateAsync({ shipmentId: shipment.id, event: targetStatus })
      setActionFeedback(`Đã chuyển trạng thái vận đơn sang "${SHIPMENT_STATUS_LABELS[targetStatus]}" thành công.`)
      handleCloseModal()
    } catch (error) {
      setFormError(
        error instanceof ApiClientError ? error.message : 'Không thể cập nhật trạng thái vận đơn. Vui lòng thử lại.',
      )
    }
  }

  // Danh sách lịch sử cập nhật trạng thái thủ công (Manual Audit History)
  const auditEntries = shipment.auditHistory || []

  return (
    <div className="space-y-6">
      <StaffHeader backTo="/staff/shipments" backLabel="Quay lại danh sách vận chuyển" />

      {/* Top Banner Card: Thông tin cơ bản và mã vận đơn */}
      <div className="rounded-[2rem] bg-white/95 p-6 shadow-soft sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-ink-soft">Đơn hàng: #{shipment.orderCode}</span>
              <span className="text-line">•</span>
              <span className="text-xs text-ink-soft">
                Khởi tạo: {formatDateTime(shipment.createdAt ?? shipment.shippedAt)}
              </span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {shipment.trackingNumber}
            </h1>
            <p className="mt-1 font-label text-sm text-ink-soft">
              Đơn vị vận chuyển: <strong className="text-ink">{shipment.carrierName}</strong>
              <span className="ml-2 font-mono text-xs opacity-75">({shipment.carrierCode})</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <StaffShipmentBadge status={shipment.status} />
            <span className="font-mono text-[11px] text-ink-soft">
              Cập nhật lần cuối: {formatDateTime(shipment.lastUpdatedAt)}
            </span>
          </div>
        </div>

        {/* Feedback Alert Banner */}
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

      {/* HORIZONTAL SHIPPING STATUS TRACKER */}
      <StaffHorizontalShippingTracker shipment={shipment} />

      {/* Main Grid: Left Details & Audit Log, Right Operations & Financial */}
      <DetailLayout
        main={
          <>
            {/* Primary Section: Lịch sử cập nhật trạng thái (Manual Audit Log) */}
            <Section
              n={1}
              title="Lịch sử cập nhật trạng thái (Manual Audit Log)"
              subtitle="Ghi nhận thao tác cập nhật thủ công của Staff và mốc chuyển trạng thái của vận đơn"
            >
              {auditEntries.length === 0 ? (
                <div className="rounded-2xl border border-line bg-surface-low/50 p-6 text-center text-xs text-ink-soft">
                  Chưa có lượt cập nhật trạng thái thủ công nào được ghi nhận cho vận đơn này.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditEntries.map((audit) => (
                    <div
                      key={audit.id}
                      className="rounded-2xl border border-line bg-white/90 p-4 transition hover:bg-surface-low/30"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
                        <div className="flex items-center gap-2">
                          <StaffShipmentBadge status={audit.previousStatus} />
                          <ArrowRight size={14} className="text-ink-soft" />
                          <StaffShipmentBadge status={audit.newStatus} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Pill tone={audit.source === 'STAFF_MANUAL' ? 'violet' : 'neutral'} code={audit.source}>
                            {audit.source === 'STAFF_MANUAL' ? 'Staff Manual Update' : 'Khởi tạo hệ thống'}
                          </Pill>
                          <span className="font-mono text-[11px] text-ink-soft">{formatDateTime(audit.timestamp)}</span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                        <div>
                          <span className="font-medium text-ink-soft">Người thực hiện: </span>
                          <strong className="text-ink">{audit.updatedBy}</strong>
                        </div>
                      </div>

                      {audit.reason && (
                        <div className="mt-2 rounded-xl bg-surface-low p-2.5 text-xs text-ink">
                          <span className="font-semibold text-ink-soft">Lý do / Ghi chú: </span>
                          {audit.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Secondary Section: Thông tin giao nhận & địa chỉ */}
            <Section n={2} title="Thông tin giao nhận & địa chỉ">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Sender */}
                <div className="rounded-2xl bg-surface-low p-4">
                  <div className="flex items-center gap-2 font-label text-xs font-bold uppercase tracking-wider text-ink-soft">
                    <Building2 size={15} className="text-orange" />
                    <span>Xưởng lấy hàng (Người bán)</span>
                  </div>
                  <p className="mt-2 font-display font-bold text-ink">{shipment.storefrontName}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Đại diện: {shipment.sellerName} · {shipment.sellerPhone}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-ink">{shipment.sellerAddress}</p>
                </div>

                {/* Recipient */}
                <div className="rounded-2xl bg-surface-low p-4">
                  <div className="flex items-center gap-2 font-label text-xs font-bold uppercase tracking-wider text-ink-soft">
                    <MapPin size={15} className="text-teal" />
                    <span>Người nhận (Khách hàng)</span>
                  </div>
                  <p className="mt-2 font-display font-bold text-ink">{shipment.recipientName}</p>
                  <p className="mt-1 text-xs text-ink-soft">Liên hệ: {shipment.recipientPhone}</p>
                  <p className="mt-2 text-xs leading-relaxed text-ink">
                    {shipment.recipientAddress}, {shipment.recipientWard}, {shipment.recipientDistrict},{' '}
                    {shipment.recipientProvince}
                  </p>
                </div>
              </div>

              {shipment.notes && (
                <div className="mt-4 rounded-2xl border border-line bg-white/70 p-3.5 text-xs text-ink-soft">
                  <strong className="text-ink">Ghi chú giao nhận:</strong> {shipment.notes}
                </div>
              )}
            </Section>

            {/* Section 3: Kiện hàng & Tác phẩm 3D */}
            <Section n={3} title="Quy cách kiện hàng & Tác phẩm 3D">
              <KeyValues
                cols={3}
                items={[
                  {
                    label: 'Tổng khối lượng cước',
                    value: shipment.totalWeightGrams > 0 ? `${shipment.totalWeightGrams} g` : 'Chưa cập nhật',
                  },
                  {
                    label: 'Kích thước kiện (D x R x C)',
                    value:
                      shipment.packageDimensionsCm.length > 0 &&
                      shipment.packageDimensionsCm.width > 0 &&
                      shipment.packageDimensionsCm.height > 0
                        ? `${shipment.packageDimensionsCm.length} x ${shipment.packageDimensionsCm.width} x ${shipment.packageDimensionsCm.height} cm`
                        : 'Chưa cập nhật',
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
                          <span>{formatAttributes(it.variantName) || 'Mặc định'}</span>
                          <span className="block font-mono text-[10px] opacity-70">{it.sku}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-ink">x{it.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono text-ink-soft">
                          {it.weightGrams > 0 ? `${it.weightGrams} g` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section n={4} title="Hành trình giao vận" subtitle="Các mốc vận chuyển đã được hệ thống ghi nhận">
              {shipment.events.length ? (
                <ol className="relative space-y-6 border-l-2 border-line/80 pl-6 text-sm">
                  {shipment.events.map((ev, idx) => (
                  <li key={ev.id} className="relative">
                    <span
                      className={`absolute -left-[31px] top-0 grid h-5 w-5 place-items-center rounded-full ring-4 ring-white ${
                        idx === 0 ? 'bg-teal text-white' : 'bg-line text-ink-soft'
                      }`}
                    >
                      <Clock size={11} />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-ink-soft">{formatDateTime(ev.timestamp)}</span>
                        <span className="font-display font-bold text-ink">{ev.title}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{ev.description}</p>
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
              ) : (
                <p className="rounded-2xl bg-surface-low px-4 py-3 text-sm text-ink-soft">
                  Chưa có sự kiện hành trình chi tiết từ đơn vị vận chuyển.
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
            {/* Staff Action Panel: Manual Status Management */}
            <Section title="Thao tác vận hành Staff" subtitle="Cập nhật trạng thái thủ công (Manual Status Management)">
              {awaitingSellerHandoff ? (
                <div className="rounded-2xl border border-line bg-surface-low p-4 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-peach text-orange-deep">
                    <Clock size={18} />
                  </div>
                  <h4 className="mt-2.5 font-display text-xs font-bold text-ink">Chờ Seller bàn giao</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                    Staff chưa được cập nhật vận đơn ở trạng thái PREPARING. Seller phải gọi shipment event SHIPPED
                    trước.
                  </p>
                </div>
              ) : isTerminalState ? (
                <div className="rounded-2xl border border-line bg-surface-low p-4 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    <Lock size={18} />
                  </div>
                  <h4 className="mt-2.5 font-display text-xs font-bold text-ink">
                    Trạng thái kết thúc (Terminal State)
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                    Vận đơn đã đạt trạng thái{' '}
                    <strong className="text-ink">{SHIPMENT_STATUS_LABELS[shipment.status]}</strong>. Không còn thao tác
                    chuyển tiếp nào khả dụng.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-xs text-ink-soft">
                    Trạng thái hiện tại: <strong className="text-ink">{SHIPMENT_STATUS_LABELS[shipment.status]}</strong>
                    . Chọn trạng thái chuyển tiếp hợp lệ:
                  </p>

                  {/* Transition: PENDING -> SHIPPED */}
                  {allowedTransitions.includes('SHIPPED') && (
                    <button
                      type="button"
                      onClick={() => handleOpenModal('SHIPPED')}
                      className="flex w-full items-center justify-between rounded-2xl bg-sky-500/10 px-4 py-3 font-label text-xs font-bold text-sky-700 transition hover:bg-sky-500/20 dark:text-sky-300"
                    >
                      <div className="flex items-center gap-2">
                        <Truck size={16} />
                        <span>Bàn giao vận chuyển</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase">SHIPPED</span>
                    </button>
                  )}

                  {allowedTransitions.includes('IN_TRANSIT') && (
                    <button
                      type="button"
                      onClick={() => handleOpenModal('IN_TRANSIT')}
                      className="flex w-full items-center justify-between rounded-2xl bg-sky-500/10 px-4 py-3 font-label text-xs font-bold text-sky-700 transition hover:bg-sky-500/20 dark:text-sky-300"
                    >
                      <div className="flex items-center gap-2">
                        <Truck size={16} />
                        <span>Xác nhận đang vận chuyển</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase">IN_TRANSIT</span>
                    </button>
                  )}

                  {allowedTransitions.includes('ARRIVED_AT_DESTINATION') && (
                    <button
                      type="button"
                      onClick={() => handleOpenModal('ARRIVED_AT_DESTINATION')}
                      className="flex w-full items-center justify-between rounded-2xl bg-violet-soft px-4 py-3 font-label text-xs font-bold text-violet transition hover:brightness-95"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        <span>Xác nhận đã đến điểm giao</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase">ARRIVED</span>
                    </button>
                  )}

                  {/* Transition: SHIPPED -> DELIVERED */}
                  {allowedTransitions.includes('DELIVERED') && (
                    <button
                      type="button"
                      onClick={() => handleOpenModal('DELIVERED')}
                      className="flex w-full items-center justify-between rounded-2xl bg-mint px-4 py-3 font-label text-xs font-bold text-[#0f5132] transition hover:brightness-95"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        <span>Xác nhận giao thành công</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase">DELIVERED</span>
                    </button>
                  )}

                  {/* Transition: SHIPPED -> FAILED */}
                  {allowedTransitions.includes('FAILED') && (
                    <button
                      type="button"
                      onClick={() => handleOpenModal('FAILED')}
                      className="flex w-full items-center justify-between rounded-2xl bg-peach px-4 py-3 font-label text-xs font-bold text-orange-deep transition hover:brightness-95"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} />
                        <span>Báo giao hàng thất bại</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase">FAILED</span>
                    </button>
                  )}

                  {/* Transition: SHIPPED -> RETURNED or FAILED -> RETURNED */}
                  {allowedTransitions.includes('RETURNED') && (
                    <button
                      type="button"
                      onClick={() => handleOpenModal('RETURNED')}
                      className="flex w-full items-center justify-between rounded-2xl bg-[#ffdad6] px-4 py-3 font-label text-xs font-bold text-danger transition hover:brightness-95"
                    >
                      <div className="flex items-center gap-2">
                        <RotateCcw size={16} />
                        <span>Xác nhận chuyển hoàn</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase">RETURNED</span>
                    </button>
                  )}
                </div>
              )}

              <div className="mt-4 rounded-xl bg-surface-low p-3 text-[11px] leading-relaxed text-ink-soft">
                <span className="font-semibold text-ink">Lưu ý vận hành:</span> Do hệ thống chưa có tích hợp live
                webhook từ GHTK, Staff chịu trách nhiệm xác minh và cập nhật thủ công trạng thái vận đơn khi nhận được
                thông báo từ shipper hoặc khách hàng.
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
                    value: shipment.paymentMethod === 'ZALOPAY' ? 'Thanh toán ZaloPay' : 'COD (Thu hộ khi giao)',
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
              <p className="mt-1 text-ink-soft">Tổng đài bưu tá: 1900 6092 (Nhánh 1)</p>
              <p className="mt-0.5 text-ink-soft">Mã tra cứu đối tác: 3DWORLD-LOGISTICS-V1</p>
            </div>
          </>
        }
      />

      {/* Confirmation Dialog Modal for Manual Status Update */}
      {targetStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-lift animate-fade-up">
            <h3 className="font-display text-lg font-bold text-ink">Xác nhận cập nhật trạng thái vận đơn</h3>
            <p className="mt-1 text-xs text-ink-soft">
              Thao tác cập nhật thủ công bởi Staff trên hệ thống vận hành 3DWorld
            </p>

            {/* Shipment Summary Info */}
            <div className="mt-4 rounded-xl bg-surface-low p-3.5 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-ink-soft">Mã vận đơn:</span>
                <span className="font-mono font-semibold text-ink">{shipment.trackingNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Mã đơn hàng:</span>
                <span className="font-mono font-semibold text-ink">#{shipment.orderCode}</span>
              </div>
              <div className="flex items-center justify-between border-t border-line/60 pt-2">
                <span className="text-ink-soft">Trạng thái hiện tại:</span>
                <StaffShipmentBadge status={shipment.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">Trạng thái mới:</span>
                <StaffShipmentBadge status={targetStatus} />
              </div>
            </div>

            {formError && (
              <div className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs font-medium text-danger">{formError}</div>
            )}

            <div className="mt-4 rounded-xl bg-amber-50/60 p-2.5 text-[11px] text-amber-800">
              <strong>Lưu ý nghiệp vụ:</strong> Backend hiện chỉ nhận mã sự kiện. Trạng thái đơn hàng liên quan sẽ được
              Backend đồng bộ tự động.
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-full bg-surface-low px-5 py-2 font-label text-xs font-semibold text-ink-soft hover:bg-surface-high"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmTransition}
                disabled={transitionShipment.isPending}
                className={`rounded-full px-5 py-2 font-label text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  targetStatus === 'DELIVERED'
                    ? 'bg-ink hover:bg-violet'
                    : targetStatus === 'FAILED'
                      ? 'bg-orange hover:bg-orange-deep'
                      : targetStatus === 'RETURNED'
                        ? 'bg-danger hover:opacity-90'
                        : 'bg-sky-600 hover:bg-sky-700'
                }`}
              >
                {transitionShipment.isPending ? 'Đang cập nhật…' : 'Xác nhận cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
