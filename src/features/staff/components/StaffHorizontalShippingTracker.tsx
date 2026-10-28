import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CornerDownRight,
  RotateCcw,
  Truck,
} from 'lucide-react'
import { formatDateTime } from '../../../shared/format'
import type { ShipmentStatus, StaffShipment } from '../types/staff.types'

interface StaffHorizontalShippingTrackerProps {
  shipment: StaffShipment
}

export function StaffHorizontalShippingTracker({ shipment }: StaffHorizontalShippingTrackerProps) {
  const currentStatus = shipment.status

  // Xác định các mốc thời gian từ auditHistory hoặc các trường có sẵn
  const pendingTimestamp =
    shipment.auditHistory?.find((a) => a.newStatus === 'PENDING')?.timestamp ||
    shipment.events?.find((e) => e.status === 'PENDING')?.timestamp ||
    shipment.shippedAt
  const shippedTimestamp =
    shipment.auditHistory?.find((a) => a.newStatus === 'SHIPPED')?.timestamp ||
    shipment.events?.find((e) => e.status === 'PICKED_UP' || e.status === 'SHIPPED')?.timestamp ||
    (currentStatus !== 'PENDING' ? shipment.shippedAt : undefined)
  const deliveredTimestamp =
    shipment.deliveredAt ||
    shipment.auditHistory?.find((a) => a.newStatus === 'DELIVERED')?.timestamp ||
    shipment.events?.find((e) => e.status === 'DELIVERED')?.timestamp
  const failedTimestamp =
    shipment.auditHistory?.find((a) => a.newStatus === 'FAILED')?.timestamp ||
    shipment.events?.find((e) => e.status === 'FAILED')?.timestamp
  const returnedTimestamp =
    shipment.auditHistory?.find((a) => a.newStatus === 'RETURNED')?.timestamp ||
    shipment.events?.find((e) => e.status === 'RETURNED')?.timestamp

  // Xác định trạng thái của từng bước trên trục chính (PENDING -> SHIPPED -> DELIVERED)
  const isPendingDone = currentStatus !== 'PENDING'
  const isPendingCurrent = currentStatus === 'PENDING'

  const isShippedDone = currentStatus === 'DELIVERED' || currentStatus === 'RETURNED'
  const isShippedCurrent = currentStatus === 'SHIPPED'

  const isDeliveredDone = currentStatus === 'DELIVERED'
  const isDeliveredBypassed = currentStatus === 'FAILED' || currentStatus === 'RETURNED'

  // Xác định trạng thái của nhánh ngoại lệ (FAILED / RETURNED)
  const isFailedCurrent = currentStatus === 'FAILED'
  const isFailedDone =
    currentStatus === 'RETURNED' &&
    shipment.auditHistory?.some((a) => a.previousStatus === 'FAILED' || a.newStatus === 'FAILED')

  const isReturnedCurrent = currentStatus === 'RETURNED'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Tiến trình vận đơn (Horizontal Shipping Tracker)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Trục tiến trình chính: Chờ vận chuyển → Đang vận chuyển → Giao thành công (Ngoại lệ xử
            lý qua nhánh Chuyển hoàn)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Mã vận đơn:</span>
          <span className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
            {shipment.trackingNumber}
          </span>
        </div>
      </div>

      {/* TRỤC CHÍNH (HAPPY PATH): PENDING -> SHIPPED -> DELIVERED */}
      <div className="relative mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* STEP 1: PENDING */}
          <div
            className={`relative flex flex-col rounded-lg border p-4 transition-all ${
              isPendingCurrent
                ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/30 dark:border-amber-600 dark:bg-amber-950/20'
                : isPendingDone
                  ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/60 dark:bg-emerald-950/10'
                  : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                  isPendingDone
                    ? 'bg-emerald-600 text-white'
                    : isPendingCurrent
                      ? 'bg-amber-500 text-white ring-4 ring-amber-200 dark:ring-amber-900'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                {isPendingDone ? <Check className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                  isPendingCurrent
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                    : isPendingDone
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {isPendingCurrent ? 'Hiện tại' : isPendingDone ? 'Hoàn tất' : 'Bước 1'}
              </span>
            </div>
            <div className="mt-3">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                1. Chờ vận chuyển
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">PENDING</div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Đã tạo vận đơn, chờ bàn giao cho đơn vị vận chuyển
              </p>
            </div>
            {pendingTimestamp && (
              <div className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                {formatDateTime(pendingTimestamp)}
              </div>
            )}
          </div>

          {/* STEP 2: SHIPPED */}
          <div
            className={`relative flex flex-col rounded-lg border p-4 transition-all ${
              isShippedCurrent
                ? 'border-sky-400 bg-sky-50/60 ring-2 ring-sky-400/30 dark:border-sky-600 dark:bg-sky-950/20'
                : isShippedDone
                  ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/60 dark:bg-emerald-950/10'
                  : currentStatus === 'FAILED'
                    ? 'border-slate-300 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/40'
                    : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                  isShippedDone
                    ? 'bg-emerald-600 text-white'
                    : isShippedCurrent
                      ? 'bg-sky-500 text-white ring-4 ring-sky-200 dark:ring-sky-900'
                      : currentStatus === 'FAILED'
                        ? 'bg-slate-400 text-white'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                {isShippedDone ? <Check className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                  isShippedCurrent
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200'
                    : isShippedDone
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                      : currentStatus === 'FAILED'
                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {isShippedCurrent
                  ? 'Đang phát'
                  : isShippedDone
                    ? 'Đã vận chuyển'
                    : currentStatus === 'FAILED'
                      ? 'Từng vận chuyển'
                      : 'Bước 2'}
              </span>
            </div>
            <div className="mt-3">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                2. Đang vận chuyển
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">SHIPPED</div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Kiện hàng đang luân chuyển trên mạng lưới bưu cục
              </p>
            </div>
            {shippedTimestamp && (
              <div className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                {formatDateTime(shippedTimestamp)}
              </div>
            )}
          </div>

          {/* STEP 3: DELIVERED (HAPPY TERMINAL) */}
          <div
            className={`relative flex flex-col rounded-lg border p-4 transition-all ${
              isDeliveredDone
                ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400/30 dark:border-emerald-600 dark:bg-emerald-950/20'
                : isDeliveredBypassed
                  ? 'border-dashed border-slate-300 bg-slate-50/40 opacity-50 dark:border-slate-800 dark:bg-slate-900/40'
                  : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                  isDeliveredDone
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-200 dark:ring-emerald-900'
                    : isDeliveredBypassed
                      ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                  isDeliveredDone
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                    : isDeliveredBypassed
                      ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {isDeliveredDone
                  ? 'Đích thành công'
                  : isDeliveredBypassed
                    ? 'Không đạt'
                    : 'Bước 3 (Đích)'}
              </span>
            </div>
            <div className="mt-3">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                3. Giao thành công
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">DELIVERED</div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {isDeliveredBypassed
                  ? 'Kiện hàng không giao thành công hoặc đã chuyển hoàn'
                  : 'Người nhận đã ký nhận kiện hàng nguyên vẹn'}
              </p>
            </div>
            {deliveredTimestamp && (
              <div className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                {formatDateTime(deliveredTimestamp)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NHÁNH NGOẠI LỆ / XỬ LÝ SỰ CỐ (ALTERNATIVE OUTCOMES) */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <CornerDownRight className="h-4 w-4 text-slate-400" />
          <span>Nhánh xử lý ngoại lệ phát sinh từ trạng thái [Đang vận chuyển]</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* EXCEPTION 1: FAILED */}
          <div
            className={`flex flex-col rounded-lg border p-3.5 transition-all ${
              isFailedCurrent
                ? 'border-orange-400 bg-orange-50/70 ring-2 ring-orange-400/30 dark:border-orange-600 dark:bg-orange-950/20'
                : isFailedDone
                  ? 'border-orange-200 bg-orange-50/30 dark:border-orange-900/40 dark:bg-orange-950/10'
                  : 'border-dashed border-slate-200 bg-white/60 opacity-60 dark:border-slate-800 dark:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    isFailedCurrent
                      ? 'bg-orange-500 text-white ring-2 ring-orange-200 dark:ring-orange-900'
                      : isFailedDone
                        ? 'bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Giao thất bại (FAILED)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Khách từ chối / Không liên lạc được
                  </div>
                </div>
              </div>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                  isFailedCurrent
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200'
                    : isFailedDone
                      ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                }`}
              >
                {isFailedCurrent ? 'Đang gặp sự cố' : isFailedDone ? 'Đã ghi nhận' : 'Dự phòng'}
              </span>
            </div>
            {shipment.failureReason && (
              <div className="mt-2 text-xs italic text-orange-700 dark:text-orange-300">
                Lý do: {shipment.failureReason}
              </div>
            )}
            {failedTimestamp && (
              <div className="mt-2 text-[11px] text-slate-400">
                {formatDateTime(failedTimestamp)}
              </div>
            )}
          </div>

          {/* EXCEPTION 2: RETURNED (TERMINAL) */}
          <div
            className={`flex flex-col rounded-lg border p-3.5 transition-all ${
              isReturnedCurrent
                ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-400/30 dark:border-rose-600 dark:bg-rose-950/20'
                : 'border-dashed border-slate-200 bg-white/60 opacity-60 dark:border-slate-800 dark:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    isReturnedCurrent
                      ? 'bg-rose-600 text-white ring-2 ring-rose-200 dark:ring-rose-900'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }`}
                >
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Đã chuyển hoàn (RETURNED)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Kiện hàng hoàn trả về kho xưởng gốc
                  </div>
                </div>
              </div>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                  isReturnedCurrent
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                }`}
              >
                {isReturnedCurrent ? 'Hoàn tất trả xưởng' : 'Đích hoàn trả'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              {isReturnedCurrent
                ? 'Đã hoàn tất chuyển hoàn về xưởng. Trạng thái kết thúc không thể chuyển tiếp.'
                : 'Đích kết thúc khi giao thất bại hoặc có quyết định hoàn hàng.'}
            </p>
            {returnedTimestamp && (
              <div className="mt-2 text-[11px] text-slate-400">
                {formatDateTime(returnedTimestamp)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

