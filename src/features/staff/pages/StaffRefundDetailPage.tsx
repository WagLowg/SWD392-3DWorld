import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  FileVideo,
  HelpCircle,
  Info,
  MapPin,
  Package,
  RotateCcw,
  Shield,
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
  DetailLayout,
  KeyValues,
  MediaTile,
  MoneyRows,
  Pill,
  Section,
} from '../../../shared/ui/kit'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { StaffHeader } from '../components/StaffHeader'
import { StaffRefundBadge } from '../components/StaffStatusBadge'
import { INITIAL_STAFF_REFUNDS } from '../mocks/staffMockData'
import type { RefundStatus, StaffRefundHistoryEntry, StaffRefundRequest } from '../types/staff.types'

export function StaffRefundDetailPage() {
  const { refundId } = useParams<{ refundId: string }>()
  const idNum = Number(refundId)

  const initial = INITIAL_STAFF_REFUNDS.find((r) => r.id === idNum)
  const [refund, setRefund] = useState<StaffRefundRequest | null>(initial ?? null)

  // Decision form state
  const [selectedDecision, setSelectedDecision] = useState<'APPROVED' | 'REJECTED' | 'NEEDS_INFO'>('APPROVED')
  const [decisionReason, setDecisionReason] = useState<string>('')
  const [checkedRules, setCheckedRules] = useState<Record<string, boolean>>({
    check72h: false,
    checkEvidence: false,
    checkGhtk: false,
  })
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null)

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
        <StaffHeader backTo="/portal/staff/refunds" backLabel="Về danh sách khiếu nại" />
        <StatusBlock
          tone="empty"
          title="Không tìm thấy hồ sơ khiếu nại"
          body={`Hồ sơ yêu cầu hoàn tiền #${refundId} không tồn tại trong danh sách tiếp nhận.`}
          action={
            <Link
              to="/portal/staff/refunds"
              className="rounded-full bg-ink px-6 py-2.5 font-label text-xs font-semibold text-white"
            >
              Xem tất cả hồ sơ
            </Link>
          }
        />
      </div>
    )
  }

  const isChecklistComplete =
    checkedRules.check72h && checkedRules.checkEvidence && checkedRules.checkGhtk
  const isWithinDeadline =
    new Date(refund.submittedAt).getTime() <= new Date(refund.refundDeadlineAt).getTime()
  const isReasonLongEnough = decisionReason.trim().length >= 30
  const canSubmit = isChecklistComplete && isReasonLongEnough

  const handleApplyDecision = () => {
    if (!canSubmit) return

    const nowIso = new Date().toISOString()
    const newStatus: RefundStatus = selectedDecision

    const historyEntry: StaffRefundHistoryEntry = {
      id: `hist-sim-${Date.now()}`,
      timestamp: nowIso,
      actor: 'Nhân viên vận hành (Phiên làm việc hiện tại)',
      action:
        newStatus === 'APPROVED'
          ? 'Chấp thuận hoàn tiền (Mô phỏng)'
          : newStatus === 'REJECTED'
            ? 'Bác bỏ khiếu nại (Mô phỏng)'
            : 'Yêu cầu bổ sung chứng cứ (Mô phỏng)',
      note: decisionReason.trim(),
      tone: newStatus === 'APPROVED' ? 'green' : newStatus === 'REJECTED' ? 'danger' : 'violet',
    }

    setRefund((prev) => {
      if (!prev) return null
      return {
        ...prev,
        status: newStatus,
        reviewedAt: nowIso,
        reviewedBy: 'Nhân viên Staff (Demo)',
        decisionReason: decisionReason.trim(),
        history: [historyEntry, ...prev.history],
        financialStatus: {
          sellerEarningsStatus:
            newStatus === 'APPROVED'
              ? 'REVERSED'
              : newStatus === 'REJECTED'
                ? 'RELEASED'
                : 'HELD',
          payoutProviderStatus:
            newStatus === 'APPROVED'
              ? 'QUEUED_FOR_GATEWAY'
              : newStatus === 'REJECTED'
                ? 'CANCELLED'
                : 'PENDING_STAFF_APPROVAL',
          note:
            newStatus === 'APPROVED'
              ? 'Hồ sơ đã duyệt. Lệnh hoàn tiền được chuyển tiếp sang cổng ZaloPay / Kế toán tài chính.'
              : newStatus === 'REJECTED'
                ? 'Hồ sơ bị từ chối. Doanh thu được mở khóa cho người bán.'
                : 'Đang tạm giữ doanh thu chờ bổ sung chứng cứ.',
        },
      }
    })

    setDecisionFeedback(
      `Đã ghi nhận phán quyết "${
        newStatus === 'APPROVED'
          ? 'Chấp thuận yêu cầu'
          : newStatus === 'REJECTED'
            ? 'Bác bỏ khiếu nại'
            : 'Yêu cầu bổ sung'
      }" (Dữ liệu mô phỏng local).`,
    )
  }

  return (
    <div className="space-y-6">
      <StaffHeader backTo="/portal/staff/refunds" backLabel="Quay lại danh sách yêu cầu hoàn tiền" />

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
            <StaffRefundBadge status={refund.status} />
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
              subtitle="Thao tác mô phỏng UI — Không tự ý chuyển khoản tiền"
              className="border-2 border-violet/30"
            >
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
                  Chấp thuận yêu cầu (APPROVED)
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
                  placeholder="Nêu rõ lý do đưa ra phán quyết (VD: Đã đối chiếu video khui kiện hàng thấy rõ vết nứt vỡ từ lúc mở tem niêm phong; chấp thuận bồi hoàn toàn phần...)"
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
                  disabled={!canSubmit}
                  onClick={handleApplyDecision}
                  className="rounded-full bg-ink px-6 py-3 font-label text-xs font-semibold text-white transition hover:bg-violet disabled:opacity-40"
                >
                  Ký duyệt & Cập nhật trạng thái mô phỏng
                </button>
              </div>
            </Section>
          </>
        }
        aside={
          <>
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
                    Staff chỉ thực hiện thẩm định và phán quyết yêu cầu hoàn tiền. Việc thực thi giao dịch tài chính được xử lý bởi hệ thống hoặc bộ phận có thẩm quyền.
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

