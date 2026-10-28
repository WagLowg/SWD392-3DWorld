import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileText,
  FileVideo,
  HelpCircle,
  Info,
  Lock,
  MapPin,
  Package,
  RotateCcw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Truck,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/format'
import {
  AuditTimeline,
  DetailLayout,
  KeyValues,
  MediaTile,
  MoneyRows,
  Pill,
  Section,
} from '../../../shared/ui/kit'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { StaffHeader } from '../components/StaffHeader'
import { StaffAdminExecutionBadge, StaffRefundBadge } from '../components/StaffStatusBadge'
import { useStaffRefunds } from '../mocks/staffMockData'
import type {
  AdminRefundExecutionStatus,
  RefundStatus,
  StaffAdminHandoffRecord,
  StaffRefundHistoryEntry,
  StaffRefundRequest,
} from '../types/staff.types'

export function StaffRefundDetailPage() {
  const { refundId } = useParams<{ refundId: string }>()
  const idNum = Number(refundId)

  const { refunds, updateStaffRefund } = useStaffRefunds()
  const refund = refunds.find((r) => r.id === idNum) ?? null

  // Decision form state
  const [selectedDecision, setSelectedDecision] = useState<'APPROVED' | 'REJECTED' | 'NEEDS_INFO'>('APPROVED')
  const [decisionReason, setDecisionReason] = useState<string>('')
  const [checkedRules, setCheckedRules] = useState<Record<string, boolean>>({
    check72h: false,
    checkEvidence: false,
    checkGhtk: false,
  })
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null)

  // Confirmation Modals state
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
  const [approveAcknowledged, setApproveAcknowledged] = useState(false)

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectAcknowledged, setRejectAcknowledged] = useState(false)

  // Media preview modal
  const [previewMedia, setPreviewMedia] = useState<{ url: string; caption: string; type: 'image' | 'video' } | null>(null)

  useEffect(() => {
    if (refund) {
      document.title = `Hồ sơ ${refund.code} · 3DWorld Staff`
    }
  }, [refund])

  if (!refund) {
    return (
      <div>
        <StaffHeader backTo="/staff/refunds" backLabel="Về danh sách khiếu nại" />
        <StatusBlock
          tone="empty"
          title="Không tìm thấy hồ sơ khiếu nại"
          body={`Hồ sơ yêu cầu hoàn tiền #${refundId} không tồn tại trong danh sách tiếp nhận.`}
          action={
            <Link
              to="/staff/refunds"
              className="rounded-full bg-ink px-6 py-2.5 font-label text-xs font-semibold text-white"
            >
              Xem tất cả hồ sơ
            </Link>
          }
        />
      </div>
    )
  }

  const isFinalized = refund.status === 'APPROVED' || refund.status === 'REJECTED'
  const isChecklistComplete =
    checkedRules.check72h && checkedRules.checkEvidence && checkedRules.checkGhtk
  const isWithinDeadline =
    new Date(refund.submittedAt).getTime() <= new Date(refund.refundDeadlineAt).getTime()
  const isReasonLongEnough = decisionReason.trim().length >= 30
  const canProceedToModal = isChecklistComplete && isReasonLongEnough

  const handleOpenDecisionModal = () => {
    if (!canProceedToModal) return
    if (selectedDecision === 'APPROVED') {
      setApproveAcknowledged(false)
      setIsApproveModalOpen(true)
    } else if (selectedDecision === 'REJECTED') {
      setRejectAcknowledged(false)
      setIsRejectModalOpen(true)
    } else if (selectedDecision === 'NEEDS_INFO') {
      handleApplyNeedsInfo()
    }
  }

  // Staff approves: sets status to APPROVED, moves case to PENDING_ADMIN, generates handoff record
  const handleConfirmApprove = () => {
    if (!approveAcknowledged) return

    const nowIso = new Date().toISOString()
    const handoffRecord: StaffAdminHandoffRecord = {
      refundRequestId: refund.id,
      refundCode: refund.code,
      sourceOrderId: refund.orderId,
      orderCode: refund.orderCode,
      staffDecision: 'APPROVED',
      staffDecisionReason: decisionReason.trim(),
      staffReviewedAt: nowIso,
      reviewedBy: 'Nhân viên Staff (Demo)',
      approvedRefundAmount: refund.requestedAmount,
      adminExecutionStatus: 'PENDING_ADMIN',
      customerName: refund.customerName,
      sellerName: refund.storefrontName,
      evidenceCount: refund.evidence.length,
    }

    const historyEntry: StaffRefundHistoryEntry = {
      id: `hist-appr-${Date.now()}`,
      timestamp: nowIso,
      actor: 'Nhân viên Staff (Demo)',
      action: 'Chấp thuận & Chuyển giao Admin',
      note: decisionReason.trim(),
      tone: 'green',
      caseId: refund.id,
      orderId: refund.orderId,
      previousStatus: refund.status,
      newStatus: 'APPROVED',
      reviewerRole: 'PRINT_STAFF',
      decisionReason: decisionReason.trim(),
      requestedAmountSnapshot: refund.requestedAmount,
    }

    updateStaffRefund(refund.id, (prev) => ({
      ...prev,
      status: 'APPROVED',
      adminExecutionStatus: 'PENDING_ADMIN',
      adminHandoff: handoffRecord,
      reviewedAt: nowIso,
      reviewedBy: 'Nhân viên Staff (Demo)',
      decisionReason: decisionReason.trim(),
      history: [historyEntry, ...prev.history],
      financialStatus: {
        sellerEarningsStatus: 'REVERSED',
        payoutProviderStatus: 'QUEUED_FOR_GATEWAY',
        note: 'Hồ sơ đã được Staff thẩm định chấp thuận và chuyển giao tới hàng chờ Admin (PENDING_ADMIN). Chờ Admin thực thi lệnh chi.',
      },
    }))

    setIsApproveModalOpen(false)
    setApproveAcknowledged(false)
    setDecisionFeedback('Đã mô phỏng phê duyệt hồ sơ và đưa vào hàng chờ Admin. Chưa gửi dữ liệu tới Backend.')
  }

  // Staff rejects: sets status to REJECTED, keeps adminExecutionStatus as NOT_REQUESTED, archives audit log
  const handleConfirmReject = () => {
    if (!rejectAcknowledged) return

    const nowIso = new Date().toISOString()
    const historyEntry: StaffRefundHistoryEntry = {
      id: `hist-rej-${Date.now()}`,
      timestamp: nowIso,
      actor: 'Nhân viên Staff (Demo)',
      action: 'Từ chối yêu cầu hoàn tiền',
      note: decisionReason.trim(),
      tone: 'danger',
      caseId: refund.id,
      orderId: refund.orderId,
      previousStatus: refund.status,
      newStatus: 'REJECTED',
      reviewerRole: 'PRINT_STAFF',
      decisionReason: decisionReason.trim(),
      requestedAmountSnapshot: refund.requestedAmount,
    }

    updateStaffRefund(refund.id, (prev) => ({
      ...prev,
      status: 'REJECTED',
      adminExecutionStatus: 'NOT_REQUESTED',
      adminHandoff: null,
      reviewedAt: nowIso,
      reviewedBy: 'Nhân viên Staff (Demo)',
      decisionReason: decisionReason.trim(),
      history: [historyEntry, ...prev.history],
      financialStatus: {
        sellerEarningsStatus: 'RELEASED',
        payoutProviderStatus: 'CANCELLED',
        note: 'Hồ sơ bị Staff từ chối. Không sinh lệnh hoàn tiền Admin. Doanh thu đơn hàng được mở khóa cho xưởng sản xuất.',
      },
    }))

    setIsRejectModalOpen(false)
    setRejectAcknowledged(false)
    setDecisionFeedback('Đã ghi nhận từ chối yêu cầu hoàn tiền và lưu trữ vào lịch sử tra cứu của Admin.')
  }

  // Staff requests more evidence: status to NEEDS_INFO, no Admin task generated
  const handleApplyNeedsInfo = () => {
    const nowIso = new Date().toISOString()
    const historyEntry: StaffRefundHistoryEntry = {
      id: `hist-info-${Date.now()}`,
      timestamp: nowIso,
      actor: 'Nhân viên Staff (Demo)',
      action: 'Yêu cầu bổ sung chứng cứ',
      note: decisionReason.trim(),
      tone: 'violet',
      caseId: refund.id,
      orderId: refund.orderId,
      previousStatus: refund.status,
      newStatus: 'NEEDS_INFO',
      reviewerRole: 'PRINT_STAFF',
      decisionReason: decisionReason.trim(),
      requestedAmountSnapshot: refund.requestedAmount,
    }

    updateStaffRefund(refund.id, (prev) => ({
      ...prev,
      status: 'NEEDS_INFO',
      adminExecutionStatus: 'NOT_REQUESTED',
      reviewedAt: nowIso,
      reviewedBy: 'Nhân viên Staff (Demo)',
      decisionReason: decisionReason.trim(),
      history: [historyEntry, ...prev.history],
      financialStatus: {
        sellerEarningsStatus: 'HELD',
        payoutProviderStatus: 'PENDING_STAFF_APPROVAL',
        note: 'Đang tạm giữ doanh thu chờ người mua bổ sung thêm hình ảnh / video minh chứng theo yêu cầu của Staff.',
      },
    }))

    setDecisionFeedback('Đã yêu cầu khách hàng bổ sung chứng cứ giám định (Dữ liệu mô phỏng local).')
  }

  return (
    <div className="space-y-6">
      <StaffHeader backTo="/staff/refunds" backLabel="Quay lại danh sách yêu cầu hoàn tiền" />

      {/* Top Banner Card */}
      <div className="rounded-[2rem] bg-white/95 p-6 shadow-soft sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-ink-soft">
                Mã hồ sơ: {refund.code}
              </span>
              <span className="text-line">•</span>
              <span className="text-xs text-ink-soft">
                Đơn hàng: #{refund.orderCode}
              </span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Thẩm Định Yêu Cầu Hoàn Tiền
            </h1>
            <p className="mt-1 font-label text-sm text-ink-soft">
              Khách hàng:{' '}
              <strong className="text-ink">{refund.customerName}</strong> ({refund.customerPhone}) · Xưởng:{' '}
              <strong className="text-ink">{refund.storefrontName}</strong>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <StaffRefundBadge status={refund.status} />
              <StaffAdminExecutionBadge status={refund.adminExecutionStatus ?? 'NOT_REQUESTED'} />
            </div>
            <span className="font-mono text-[11px] text-ink-soft">
              Nộp lúc: {formatDateTime(refund.submittedAt)}
            </span>
          </div>
        </div>

        {decisionFeedback && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-mint px-4 py-3 text-xs font-semibold text-[#0f5132]">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{decisionFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setDecisionFeedback(null)}
              className="text-xs underline hover:opacity-80"
            >
              Đóng
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Left Details & Evidence, Right Timeline & Financial Status */}
      <DetailLayout
        main={
          <>
            {/* Section 1: Căn cứ khiếu nại & Mô tả của khách hàng */}
            <Section n={1} title="Căn cứ khiếu nại & Giải trình của người mua">
              <KeyValues
                cols={3}
                items={[
                  {
                    label: 'Người gửi yêu cầu',
                    value: `${refund.customerName} (${refund.customerPhone})`,
                  },
                  {
                    label: 'Ngày nhận hàng thực tế',
                    value: formatDateTime(refund.receivedAt),
                  },
                  {
                    label: 'Hạn chót khiếu nại (72h)',
                    value: formatDateTime(refund.refundDeadlineAt),
                  },
                ]}
              />

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-surface-low p-4">
                  <span className="font-label text-xs font-bold uppercase tracking-wider text-orange-deep">
                    Lý do khiếu nại:
                  </span>
                  <p className="mt-1 font-display text-base font-bold text-ink">
                    {refund.reason}
                  </p>
                </div>

                <div className="rounded-2xl border border-line bg-white/70 p-4">
                  <span className="font-label text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Mô tả chi tiết từ khách hàng:
                  </span>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink">
                    "{refund.description}"
                  </p>
                </div>
              </div>
            </Section>

            {/* Section 2: Bằng chứng hình ảnh / video */}
            <Section
              n={2}
              title="Bằng chứng giám định từ người mua"
              subtitle={`${refund.evidence.length} tệp chứng cứ đính kèm`}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {refund.evidence.map((ev, index) => (
                  <div
                    key={ev.id}
                    onClick={() => setPreviewMedia({ url: ev.url, caption: ev.caption, type: ev.type })}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-line bg-surface-low transition hover:shadow-soft"
                  >
                    <div className="aspect-[4/3] w-full bg-surface-mid">
                      {ev.type === 'video' ? (
                        <div className="grid h-full w-full place-items-center bg-violet-soft/60 text-violet">
                          <FileVideo size={36} />
                        </div>
                      ) : (
                        <img
                          src={ev.url}
                          alt={ev.caption}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-ink">
                        <span>{ev.type === 'video' ? 'Video mở kiện' : `Ảnh chụp #${index + 1}`}</span>
                        <Eye size={13} className="text-ink-soft group-hover:text-violet" />
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10px] text-ink-soft">
                        {ev.caption}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Section 3: Sản phẩm yêu cầu hoàn tiền */}
            <Section n={3} title="Danh sách tác phẩm yêu cầu hoàn tiền">
              <div className="overflow-x-auto rounded-2xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-low font-label font-semibold uppercase tracking-wider text-ink-soft">
                    <tr>
                      <th className="px-4 py-3">Tác phẩm</th>
                      <th className="px-4 py-3">Phân loại</th>
                      <th className="px-4 py-3 text-center">Mua</th>
                      <th className="px-4 py-3 text-center">Hư hại</th>
                      <th className="px-4 py-3 text-right">Đơn giá</th>
                      <th className="px-4 py-3 text-right">Tiền hoàn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {refund.items.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-low/30">
                        <td className="px-4 py-3 font-semibold text-ink">
                          {item.productTitle}
                        </td>
                        <td className="px-4 py-3 text-ink-soft">
                          {item.variantName}
                        </td>
                        <td className="px-4 py-3 text-center text-ink-soft">
                          {item.quantityPurchased}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-danger">
                          {item.defectiveQuantity}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-ink-soft">
                          {formatVnd(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-danger">
                          {formatVnd(item.refundAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Section 4: Đối chiếu vận chuyển */}
            <Section n={4} title="Đối chiếu thông tin vận chuyển GHTK">
              <KeyValues
                cols={3}
                items={[
                  {
                    label: 'Mã vận đơn liên quan',
                    value: refund.shipmentSummary.trackingNumber,
                  },
                  {
                    label: 'Đơn vị giao nhận',
                    value: refund.shipmentSummary.carrierName,
                  },
                  {
                    label: 'Thời điểm giao hoàn tất',
                    value: formatDateTime(refund.shipmentSummary.deliveredAt),
                  },
                ]}
              />
              <p className="mt-2 text-[11px] text-ink-soft">
                Kiểm tra xem bao bì bên ngoài có bị rách vỡ trong lúc vận chuyển hay không để xác định trách nhiệm bảo hiểm vận chuyển hay lỗi do xưởng đóng gói.
              </p>
            </Section>

            {/* Section 5: Biểu mẫu phán quyết Staff (Demo Prototype) */}
            <Section
              n={5}
              title="Biểu mẫu phán quyết Staff (Demo Prototype)"
              subtitle={
                isFinalized
                  ? 'Hồ sơ đã được phán quyết hoàn tất — Đã khóa thao tác cập nhật'
                  : 'Thao tác thẩm định Staff — Không tự ý chuyển khoản tiền'
              }
              className={`border-2 ${
                isFinalized
                  ? refund.status === 'APPROVED'
                    ? 'border-mint/50 bg-mint/5'
                    : 'border-danger/30 bg-[#ffdad6]/10'
                  : 'border-violet/30'
              }`}
            >
              {isFinalized ? (
                /* LOCKED DECISION PANEL - PREVENTS DUPLICATE DECISIONS */
                <div className="space-y-4">
                  <div
                    className={`rounded-2xl p-5 ${
                      refund.status === 'APPROVED'
                        ? 'border border-mint bg-mint/20 text-[#0f5132]'
                        : 'border border-danger/20 bg-[#ffdad6]/30 text-danger'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {refund.status === 'APPROVED' ? (
                          <CheckCircle2 size={24} className="text-[#0f5132]" />
                        ) : (
                          <XCircle size={24} className="text-danger" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-display text-base font-bold">
                            {refund.status === 'APPROVED'
                              ? 'HỒ SƠ ĐÃ ĐƯỢC CHẤP THUẬN VÀ CHUYỂN GIAO ADMIN'
                              : 'HỒ SƠ ĐÃ BỊ TỪ CHỐI BỞI STAFF'}
                          </h4>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-0.5 font-mono text-[11px] font-semibold">
                            <Lock size={11} />
                            Đã khóa quyết định
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed opacity-90">
                          {refund.status === 'APPROVED'
                            ? 'Nhân viên Staff đã phê duyệt khiếu nại và chuyển giao vào hàng chờ xử lý tài chính của Admin. Lệnh hoàn tiền chưa hoàn tất cho đến khi Admin kích hoạt thực chi.'
                            : 'Nhân viên Staff đã từ chối yêu cầu hoàn tiền này. Quyết định và căn cứ từ chối đã được lưu trữ trong sổ nhật ký phục vụ tra cứu, kiểm toán của Admin.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Decision Audit Details Card */}
                  <div className="rounded-2xl border border-line bg-surface-low p-4 text-xs space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
                      <span className="font-semibold text-ink-soft">Trạng thái thẩm định:</span>
                      <StaffRefundBadge status={refund.status} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
                      <span className="font-semibold text-ink-soft">Tiến độ chi tiền Admin:</span>
                      <StaffAdminExecutionBadge status={refund.adminExecutionStatus ?? 'NOT_REQUESTED'} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
                      <span className="font-semibold text-ink-soft">Người thẩm định:</span>
                      <span className="font-medium text-ink">{refund.reviewedBy ?? 'Nhân viên Staff (Demo)'}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
                      <span className="font-semibold text-ink-soft">Thời điểm phán quyết:</span>
                      <span className="font-mono text-ink">{formatDateTime(refund.reviewedAt)}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-ink-soft">Căn cứ phán quyết đã ghi nhận:</span>
                      <p className="mt-1 rounded-xl bg-white p-3 font-mono text-xs text-ink border border-line">
                        "{refund.decisionReason || 'Không có ghi chú thêm.'}"
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-ink-soft italic">
                    * Quyết định đã có hiệu lực trên phiên làm việc mô phỏng. Hệ thống ngăn chặn việc gửi lại phán quyết trùng lặp đối với cùng một hồ sơ.
                  </p>
                </div>
              ) : (
                /* ACTIVE DECISION FORM */
                <>
                  {/* Decision Options */}
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedDecision('APPROVED')}
                      className={`rounded-full px-5 py-2.5 font-label text-xs font-bold transition ${
                        selectedDecision === 'APPROVED'
                          ? 'bg-mint text-[#0f5132] ring-2 ring-[#0f5132]'
                          : 'bg-surface-low text-ink-soft hover:bg-surface-high'
                      }`}
                    >
                      Chấp thuận & Chuyển Admin (APPROVED)
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDecision('NEEDS_INFO')}
                      className={`rounded-full px-5 py-2.5 font-label text-xs font-bold transition ${
                        selectedDecision === 'NEEDS_INFO'
                          ? 'bg-violet-soft text-violet ring-2 ring-violet'
                          : 'bg-surface-low text-ink-soft hover:bg-surface-high'
                      }`}
                    >
                      Yêu cầu bổ sung bằng chứng (NEEDS_INFO)
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDecision('REJECTED')}
                      className={`rounded-full px-5 py-2.5 font-label text-xs font-bold transition ${
                        selectedDecision === 'REJECTED'
                          ? 'bg-[#ffdad6] text-danger ring-2 ring-danger'
                          : 'bg-surface-low text-ink-soft hover:bg-surface-high'
                      }`}
                    >
                      Từ chối yêu cầu (REJECTED)
                    </button>
                  </div>

                  {/* Justification Textarea */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink-soft">
                      <label htmlFor="staff-decision-reason">
                        Căn cứ phán quyết (Bắt buộc tối thiểu 30 ký tự) *
                      </label>
                      <span
                        className={`font-mono ${
                          decisionReason.trim().length >= 30 ? 'text-teal' : 'text-danger'
                        }`}
                      >
                        {decisionReason.trim().length} / 30 ký tự
                      </span>
                    </div>
                    <textarea
                      id="staff-decision-reason"
                      rows={4}
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      placeholder="Nêu rõ lý do đưa ra phán quyết (VD: Đã đối chiếu video khui kiện hàng thấy rõ vết nứt vỡ từ lúc mở tem niêm phong; chấp thuận chuyển giao Admin hoàn tiền...)"
                      className="mt-1.5 w-full rounded-2xl bg-surface-low p-3.5 text-xs outline-none focus:ring-2 focus:ring-violet/40"
                    />
                  </div>

                  {/* Mandatory Checklist */}
                  <div className="mt-4 rounded-2xl bg-surface-low p-4">
                    <p className="font-label text-xs font-bold uppercase tracking-wider text-ink-soft">
                      Checklist kiểm tra bắt buộc trước khi phê duyệt:
                    </p>
                    <div className="mt-2.5 space-y-2 text-xs">
                      <label className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={checkedRules.check72h}
                          onChange={(e) =>
                            setCheckedRules((prev) => ({ ...prev, check72h: e.target.checked }))
                          }
                          className="h-4 w-4 rounded accent-violet"
                        />
                        <span>1. Đã kiểm tra thời hạn nộp yêu cầu trong cửa sổ 72h từ khi nhận hàng.</span>
                      </label>

                      <label className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={checkedRules.checkEvidence}
                          onChange={(e) =>
                            setCheckedRules((prev) => ({ ...prev, checkEvidence: e.target.checked }))
                          }
                          className="h-4 w-4 rounded accent-violet"
                        />
                        <span>2. Đã kiểm tra đối chiếu hình ảnh / video bằng chứng của khách hàng.</span>
                      </label>

                      <label className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={checkedRules.checkGhtk}
                          onChange={(e) =>
                            setCheckedRules((prev) => ({ ...prev, checkGhtk: e.target.checked }))
                          }
                          className="h-4 w-4 rounded accent-violet"
                        />
                        <span>3. Đã đối soát thông tin vận đơn với bên vận chuyển GHTK.</span>
                      </label>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-5 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={!canProceedToModal}
                      onClick={handleOpenDecisionModal}
                      className={`rounded-full px-6 py-3 font-label text-xs font-semibold text-white transition disabled:opacity-40 ${
                        selectedDecision === 'APPROVED'
                          ? 'bg-[#0f5132] hover:bg-[#146c43]'
                          : selectedDecision === 'REJECTED'
                            ? 'bg-danger hover:bg-danger/90'
                            : 'bg-ink hover:bg-violet'
                      }`}
                    >
                      {selectedDecision === 'APPROVED'
                        ? 'Xem xét chấp thuận & Chuyển Admin →'
                        : selectedDecision === 'REJECTED'
                          ? 'Xem xét từ chối khiếu nại →'
                          : 'Gửi yêu cầu bổ sung bằng chứng'}
                    </button>
                  </div>
                </>
              )}
            </Section>
          </>
        }
        aside={
          <>
            {/* Section: Tiến trình bàn giao tài chính Admin (Admin Handoff) */}
            <Section title="Tiến trình bàn giao tài chính Admin">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-soft">Trạng thái thẩm định:</span>
                  <StaffRefundBadge status={refund.status} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-soft">Hàng chờ tài chính Admin:</span>
                  <StaffAdminExecutionBadge status={refund.adminExecutionStatus ?? 'NOT_REQUESTED'} />
                </div>

                {refund.adminHandoff ? (
                  <div className="space-y-2 rounded-2xl bg-surface-low p-3.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Số tiền bàn giao hoàn:</span>
                      <span className="font-bold text-danger font-mono">
                        {formatVnd(refund.adminHandoff.approvedRefundAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Thời điểm chuyển giao:</span>
                      <span className="font-semibold text-ink">
                        {formatDateTime(refund.adminHandoff.staffReviewedAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Nhân viên duyệt:</span>
                      <span className="font-semibold text-ink">
                        {refund.adminHandoff.reviewedBy}
                      </span>
                    </div>
                    <div className="border-t border-line/60 pt-2">
                      <span className="text-ink-soft">Ghi chú chuyển giao:</span>
                      <p className="mt-1 text-[11px] text-ink">"{refund.adminHandoff.staffDecisionReason}"</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-surface-low p-3.5 text-xs text-ink-soft">
                    {refund.status === 'REJECTED' ? (
                      <p className="text-[11px]">
                        Hồ sơ bị từ chối: Không phát sinh lệnh hoàn tiền Admin. Dữ liệu được lưu trữ sẵn sàng để Admin tra cứu lịch sử xử lý.
                      </p>
                    ) : (
                      <p className="text-[11px]">
                        Chưa phát sinh bàn giao Admin. Hồ sơ đang trong giai đoạn Staff tiếp nhận và thẩm định.
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-line bg-surface-mid/40 p-3 text-[11px] leading-relaxed text-ink-soft">
                  <span className="font-semibold text-ink">Phân định trách nhiệm:</span>
                  <p className="mt-1">
                    Nhân viên Staff chỉ đóng vai trò thẩm định hồ sơ khiếu nại. Thao tác hoàn tiền thanh toán trực tiếp qua ngân hàng / cổng thanh toán hoàn toàn thuộc trách nhiệm Quản trị viên (Admin).
                  </p>
                </div>
              </div>
            </Section>

            {/* Customer Eligibility Window & Staff SLA Notice */}
            <Section title="Cửa sổ khiếu nại (Người mua)">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-soft">Tính hợp lệ yêu cầu:</span>
                  {isWithinDeadline ? (
                    <Pill tone="green">Nộp trong hạn 72h</Pill>
                  ) : (
                    <Pill tone="danger">Nộp sau hạn 72h — Cần xem xét</Pill>
                  )}
                </div>

                <div className="space-y-2 rounded-2xl bg-surface-low p-3.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink-soft">Thời điểm nhận hàng:</span>
                    <span className="font-semibold text-ink">{formatDateTime(refund.receivedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-soft">Hạn nộp khiếu nại (72h):</span>
                    <span className="font-semibold text-ink">{formatDateTime(refund.refundDeadlineAt)}</span>
                  </div>
                  <div className="flex justify-between border-t border-line/60 pt-2">
                    <span className="text-ink-soft">Thời điểm nộp đơn:</span>
                    <span className="font-semibold text-ink">{formatDateTime(refund.submittedAt)}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-violet/20 bg-violet-soft/30 p-3 text-[11px] leading-relaxed text-ink-soft">
                  <div className="flex items-center gap-1.5 font-semibold text-violet">
                    <Info size={13} />
                    <span>Quy định cửa sổ khiếu nại (BR-026):</span>
                  </div>
                  <p className="mt-1">
                    Khách hàng có tối đa 3 ngày (72 giờ) từ khi nhận hàng thành công để gửi yêu cầu khiếu nại / hoàn tiền sản phẩm vật lý.
                  </p>
                  <p className="mt-1.5 border-t border-violet/10 pt-1.5 text-ink-soft">
                    <strong className="text-ink">Thời hạn xử lý của Staff:</strong> Thời hạn xử lý hồ sơ của Staff hiện chưa được quy định cụ thể theo quyết định D-08 của FRD v1.2.
                  </p>
                </div>
              </div>
            </Section>

            {/* Financial Status Summary */}
            <Section title="Dòng tiền & Ký quỹ">
              <MoneyRows
                rows={[
                  {
                    label: 'Giá trị đơn gốc',
                    value: formatVnd(refund.originalOrderTotal),
                  },
                  {
                    label: 'Số tiền yêu cầu hoàn',
                    value: formatVnd(refund.requestedAmount),
                    tone: 'minus',
                  },
                ]}
                total={{
                  label: 'Trần hoàn tối đa',
                  value: formatVnd(refund.originalOrderTotal),
                }}
              />

              <div className="mt-4 space-y-2 border-t border-line pt-3 text-xs">
                <div>
                  <span className="font-semibold text-ink-soft">Trạng thái ký quỹ xưởng:</span>
                  <div className="mt-1">
                    <Pill tone={refund.financialStatus.sellerEarningsStatus === 'HELD' ? 'orange' : refund.financialStatus.sellerEarningsStatus === 'REVERSED' ? 'danger' : 'green'}>
                      {refund.financialStatus.sellerEarningsStatus === 'HELD'
                        ? 'Doanh thu đang tạm giữ (HELD)'
                        : refund.financialStatus.sellerEarningsStatus === 'REVERSED'
                          ? 'Đã trừ doanh thu (REVERSED)'
                          : 'Đã giải phóng (RELEASED)'}
                    </Pill>
                  </div>
                </div>

                <div className="rounded-xl bg-surface-low p-2.5 text-[11px] leading-relaxed text-ink-soft">
                  <p className="font-semibold text-ink">Ranh giới tài chính:</p>
                  <p className="mt-1">
                    Staff chỉ thực hiện thẩm định và phán quyết yêu cầu hoàn tiền. Việc thực thi giao dịch tài chính được xử lý bởi Admin hoặc cổng thanh toán.
                  </p>
                  {refund.financialStatus.note && (
                    <p className="mt-1 border-t border-line/60 pt-1 text-ink-soft">
                      {refund.financialStatus.note}
                    </p>
                  )}
                </div>
              </div>
            </Section>

            {/* Case History Timeline */}
            <AuditTimeline
              title="Nhật ký xử lý hồ sơ"
              entries={refund.history.map((h) => ({
                at: h.timestamp,
                actor: h.actor,
                action: h.action,
                note: h.note,
                tone: h.tone,
              }))}
            />
          </>
        }
      />

      {/* APPROVE CONFIRMATION MODAL ("Chấp thuận & Chuyển Admin") */}
      {isApproveModalOpen && (
        <div
          onClick={() => setIsApproveModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white p-6 shadow-lift sm:p-7 space-y-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-mint text-[#0f5132]">
                  <CheckCircle2 size={22} />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">
                    Xác nhận chấp thuận & Chuyển giao Admin
                  </h3>
                  <p className="text-xs text-ink-soft">
                    Đưa hồ sơ vào hàng chờ xử lý tài chính của Admin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="rounded-full p-1.5 text-ink-soft hover:bg-surface-low hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            {/* Separation of Concerns Callout */}
            <div className="rounded-2xl border border-mint/40 bg-mint/15 p-4 text-xs leading-relaxed text-[#0f5132]">
              <div className="flex items-center gap-2 font-bold">
                <ShieldCheck size={16} />
                <span>Ranh giới trách nhiệm & Phân quyền vận hành:</span>
              </div>
              <p className="mt-1 text-[11px]">
                Nhân viên Staff thẩm định hồ sơ khiếu nại và xác nhận tính hợp lệ. Thao tác này <strong>KHÔNG</strong> thực hiện chuyển khoản hoặc thanh toán. Hồ sơ sẽ được chuyển tiếp sang <strong>hàng chờ Admin (PENDING_ADMIN)</strong> để Quản trị viên đối soát tài chính và kích hoạt lệnh chi.
              </p>
            </div>

            {/* Case Summary */}
            <div className="rounded-2xl bg-surface-low p-4 text-xs space-y-2">
              <p className="font-label font-bold uppercase tracking-wider text-ink-soft text-[11px]">
                Tóm tắt hồ sơ chuyển giao:
              </p>
              <div className="flex justify-between">
                <span className="text-ink-soft">Mã hồ sơ / Đơn hàng:</span>
                <span className="font-mono font-semibold text-ink">
                  {refund.code} (#{refund.orderCode})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Người mua:</span>
                <span className="font-semibold text-ink">{refund.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Xưởng sản xuất:</span>
                <span className="font-semibold text-ink">{refund.storefrontName}</span>
              </div>
              <div className="flex justify-between border-t border-line/60 pt-2">
                <span className="font-semibold text-ink">Số tiền đề xuất hoàn:</span>
                <span className="font-mono text-sm font-bold text-danger">
                  {formatVnd(refund.requestedAmount)}
                </span>
              </div>
              <div className="border-t border-line/60 pt-2">
                <span className="text-ink-soft">Sản phẩm yêu cầu bồi hoàn:</span>
                <ul className="mt-1 list-disc list-inside text-[11px] text-ink space-y-0.5">
                  {refund.items.map((i) => (
                    <li key={i.id}>
                      {i.productTitle} ({i.variantName}) — Hư hại: {i.defectiveQuantity}/{i.quantityPurchased}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-line/60 pt-2">
                <span className="text-ink-soft">Căn cứ phán quyết của Staff:</span>
                <p className="mt-1 font-mono text-[11px] text-ink bg-white p-2 rounded-xl border border-line">
                  "{decisionReason}"
                </p>
              </div>
            </div>

            {/* Mandatory Acknowledgment Checkbox */}
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface-mid/30 p-3.5 text-xs">
              <input
                type="checkbox"
                checked={approveAcknowledged}
                onChange={(e) => setApproveAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-teal shrink-0"
              />
              <span className="font-medium text-ink leading-relaxed">
                Tôi hiểu và xác nhận: Phán quyết chấp thuận này sẽ đưa hồ sơ vào hàng chờ xử lý tài chính của Admin. Nhân viên Staff không tự ý thực chi hoàn tiền.
              </span>
            </label>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="rounded-full bg-surface-low px-5 py-2.5 font-label text-xs font-semibold text-ink-soft hover:bg-surface-high"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!approveAcknowledged}
                onClick={handleConfirmApprove}
                className="flex items-center gap-2 rounded-full bg-[#0f5132] px-6 py-2.5 font-label text-xs font-semibold text-white transition hover:bg-[#146c43] disabled:opacity-40"
              >
                <CheckCircle2 size={16} />
                <span>Chấp thuận & Chuyển Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT CONFIRMATION MODAL ("Xác nhận từ chối khiếu nại") */}
      {isRejectModalOpen && (
        <div
          onClick={() => setIsRejectModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white p-6 shadow-lift sm:p-7 space-y-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#ffdad6] text-danger">
                  <XCircle size={22} />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">
                    Xác nhận từ chối yêu cầu hoàn tiền
                  </h3>
                  <p className="text-xs text-ink-soft">
                    Bác bỏ yêu cầu và lưu trữ lịch sử phục vụ tra cứu của Admin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="rounded-full p-1.5 text-ink-soft hover:bg-surface-low hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            {/* Rejection Notice */}
            <div className="rounded-2xl border border-danger/30 bg-[#ffdad6]/20 p-4 text-xs leading-relaxed text-danger">
              <div className="flex items-center gap-2 font-bold">
                <ShieldAlert size={16} />
                <span>Lưu trữ tra cứu đối soát Admin:</span>
              </div>
              <p className="mt-1 text-[11px]">
                Hồ sơ bị từ chối sẽ được lưu trữ trong sổ nhật ký vận hành. Không có lệnh hoàn tiền nào được tạo gửi sang Admin. Quản trị viên (Admin) có thể tra cứu lịch sử và lý do từ chối này khi có khiếu nại phát sinh.
              </p>
            </div>

            {/* Case Summary */}
            <div className="rounded-2xl bg-surface-low p-4 text-xs space-y-2">
              <p className="font-label font-bold uppercase tracking-wider text-ink-soft text-[11px]">
                Tóm tắt hồ sơ bác bỏ:
              </p>
              <div className="flex justify-between">
                <span className="text-ink-soft">Mã hồ sơ / Đơn hàng:</span>
                <span className="font-mono font-semibold text-ink">
                  {refund.code} (#{refund.orderCode})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Người mua:</span>
                <span className="font-semibold text-ink">{refund.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Số tiền từ chối hoàn:</span>
                <span className="font-mono font-bold text-ink">
                  {formatVnd(refund.requestedAmount)}
                </span>
              </div>
              <div className="border-t border-line/60 pt-2">
                <span className="text-ink-soft">Lý do từ chối của Staff:</span>
                <p className="mt-1 font-mono text-[11px] text-danger bg-white p-2 rounded-xl border border-line">
                  "{decisionReason}"
                </p>
              </div>
            </div>

            {/* Mandatory Acknowledgment Checkbox */}
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface-mid/30 p-3.5 text-xs">
              <input
                type="checkbox"
                checked={rejectAcknowledged}
                onChange={(e) => setRejectAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-danger shrink-0"
              />
              <span className="font-medium text-ink leading-relaxed">
                Tôi xác nhận từ chối yêu cầu hoàn tiền này. Quyết định và lý do từ chối sẽ được lưu vào sổ nhật ký phục vụ tra cứu của Admin trong tương lai.
              </span>
            </label>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="rounded-full bg-surface-low px-5 py-2.5 font-label text-xs font-semibold text-ink-soft hover:bg-surface-high"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!rejectAcknowledged}
                onClick={handleConfirmReject}
                className="flex items-center gap-2 rounded-full bg-danger px-6 py-2.5 font-label text-xs font-semibold text-white transition hover:bg-danger/90 disabled:opacity-40"
              >
                <XCircle size={16} />
                <span>Xác nhận từ chối</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Preview Modal */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl overflow-hidden rounded-[2rem] bg-white p-4 shadow-lift"
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
              {previewMedia.type === 'video' ? (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  className="h-full w-full object-contain"
                />
              ) : (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.caption}
                  className="h-full w-full object-contain"
                />
              )}
            </div>
            <div className="mt-3 flex items-center justify-between px-2">
              <p className="text-xs font-semibold text-ink">{previewMedia.caption}</p>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="rounded-full bg-surface-low px-4 py-1.5 font-label text-xs font-semibold text-ink-soft hover:bg-surface-high"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
