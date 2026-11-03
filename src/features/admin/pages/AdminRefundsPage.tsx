import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  FileText,
  Landmark,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  XCircle,
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
  Pill,
  SearchInput,
  Section,
  StatCard,
  StatGrid,
  Toolbar,
} from '../../../shared/ui/kit'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { useToast } from '../../../shared/ui/toast'
import {
  type AdminTransferDetails,
  type ManualRefundDetail,
  type ManualRefundRow,
  refundApi,
} from '../../refund/services/refund.api'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'APPROVED', label: 'Chờ chuyển khoản (Staff đã duyệt)' },
  { value: 'PENDING', label: 'Chờ Staff thẩm định' },
  { value: 'PAID', label: 'Đã hoàn tiền' },
  { value: 'REJECTED', label: 'Đã từ chối' },
]

function statusTone(status: string): 'orange' | 'green' | 'danger' | 'violet' {
  switch (status?.toUpperCase()) {
    case 'APPROVED':
    case 'PROCESSING':
      return 'orange'
    case 'PAID':
    case 'SUCCESS':
    case 'COMPLETED':
      return 'green'
    case 'REJECTED':
    case 'FAILED':
      return 'danger'
    default:
      return 'violet'
  }
}

function statusLabel(status: string): string {
  switch (status?.toUpperCase()) {
    case 'APPROVED':
      return 'Chờ Admin chi tiền'
    case 'PROCESSING':
      return 'Chờ Admin chi tiền'
    case 'PAID':
    case 'SUCCESS':
    case 'COMPLETED':
      return 'Đã hoàn tiền'
    case 'REJECTED':
    case 'FAILED':
      return 'Đã từ chối'
    default:
      return 'Chờ Staff duyệt'
  }
}

/** MP 060 · Danh Sách Quản Lý Hoàn Tiền Thủ Công (Admin). */
export function AdminRefundsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    document.title = 'Quản lý hoàn tiền thủ công · Admin 3DWorld'
  }, [])

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'refunds'] })
    }
    window.addEventListener('3dworld:refunds:updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('3dworld:refunds:updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [queryClient])

  const query = useQuery({
    queryKey: ['admin', 'refunds'],
    queryFn: () => refundApi.listAdminRefunds(),
    staleTime: 30_000,
  })

  const refunds = query.data ?? []

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return refunds.filter((r) => {
      const matchTab = !tab || r.status === tab || (tab === 'APPROVED' && (r.status as string) === 'PROCESSING')
      const matchSearch =
        !q ||
        String(r.id).includes(q) ||
        String(r.physical_order_id).includes(q) ||
        r.reason?.toLowerCase().includes(q)
      return matchTab && matchSearch
    })
  }, [refunds, search, tab])

  const pendingStaffCount = refunds.filter((r) => r.status === 'PENDING').length
  const approvedCount = refunds.filter((r) => r.status === 'APPROVED' || (r.status as string) === 'PROCESSING').length
  const paidCount = refunds.filter((r) => r.status === 'PAID').length
  const rejectedCount = refunds.filter((r) => r.status === 'REJECTED').length

  const filterOptions = STATUS_FILTERS.map((item) => ({
    ...item,
    count:
      item.value === ''
        ? refunds.length
        : item.value === 'APPROVED'
          ? approvedCount
          : item.value === 'PENDING'
            ? pendingStaffCount
            : item.value === 'PAID'
              ? paidCount
              : rejectedCount,
  }))

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-[.18em] text-violet">Admin · Quản trị tài chính</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Quản Lý Hoàn Tiền Thủ Công
          </h1>
          <p className="mt-1 font-label text-sm text-ink-soft">
            Tiếp nhận hồ sơ Staff đã thẩm định, kiểm tra thông tin tài khoản ngân hàng của khách và xác nhận thực thi chuyển khoản.
          </p>
        </div>
        <Btn
          variant="soft"
          size="sm"
          icon={RefreshCw}
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'refunds'] })}
          disabled={query.isFetching}
        >
          {query.isFetching ? 'Đang tải...' : 'Làm mới'}
        </Btn>
      </header>

      <StatGrid>
        <StatCard
          label="Chờ Admin chi tiền"
          value={approvedCount}
          hint="Staff đã chấp thuận"
          icon={Banknote}
          tone="orange"
        />
        <StatCard
          label="Chờ Staff thẩm định"
          value={pendingStaffCount}
          hint="Đang kiểm tra chứng cứ"
          icon={Clock3}
          tone="violet"
        />
        <StatCard
          label="Đã hoàn tất chi tiền"
          value={paidCount}
          hint="Đã xác nhận chuyển khoản"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Đã từ chối"
          value={rejectedCount}
          hint="Không đủ điều kiện"
          icon={XCircle}
          tone="danger"
        />
      </StatGrid>

      <Toolbar>
        <FilterTabs options={filterOptions} value={tab} onChange={setTab} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm mã khiếu nại #REF, đơn hàng #ORD, lý do…"
        />
      </Toolbar>

      {query.isLoading ? (
        <div className="grid place-items-center rounded-3xl bg-white p-12 shadow-soft">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-violet-soft border-t-violet" />
        </div>
      ) : rows.length === 0 ? (
        <StatusBlock
          tone="empty"
          title="Không tìm thấy yêu cầu hoàn tiền nào"
          body={search ? 'Không có hồ sơ nào khớp với bộ lọc tìm kiếm.' : 'Hiện chưa có yêu cầu hoàn tiền nào trong danh sách.'}
        />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'id',
              header: 'Mã khiếu nại & Đơn',
              render: (r: ManualRefundRow) => (
                <CellTitle
                  title={`#REF-${r.id}`}
                  sub={`Đơn hàng #ORD-${String(r.physical_order_id).padStart(5, '0')}`}
                  to={`/admin/refunds/${r.id}`}
                />
              ),
            },
            {
              key: 'amount',
              header: 'Số tiền hoàn',
              render: (r: ManualRefundRow) => (
                <span className="font-mono text-sm font-bold text-orange-deep">{formatVnd(r.amount)}</span>
              ),
            },
            {
              key: 'reason',
              header: 'Lý do khiếu nại',
              render: (r: ManualRefundRow) => (
                <span className="max-w-xs truncate text-xs text-ink-soft block" title={r.reason}>
                  {r.reason || '—'}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Trạng thái',
              render: (r: ManualRefundRow) => (
                <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill>
              ),
            },
            {
              key: 'createdAt',
              header: 'Thời điểm tạo',
              render: (r: ManualRefundRow) => (
                <span className="text-xs text-ink-soft">{formatDateTime(r.created_at)}</span>
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (r: ManualRefundRow) => (
                <Btn
                  to={`/admin/refunds/${r.id}`}
                  size="sm"
                  variant={r.status === 'APPROVED' ? 'primary' : 'soft'}
                >
                  {r.status === 'APPROVED' ? 'Chi tiền' : 'Chi tiết'}
                </Btn>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}

function generateRandomTransferRef() {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Math.floor(100000 + Math.random() * 900000)
  return `FT${dateStr}${rand}`
}

/** MP 061 · Chi Tiết & Xác Nhận Chuyển Khoản Hoàn Tiền (Admin). */
export function AdminRefundDetailPage() {
  const { refundId } = useParams<{ refundId: string }>()
  const idNum = Number(refundId)
  const toast = useToast()
  const queryClient = useQueryClient()

  const [bankDetails, setBankDetails] = useState<AdminTransferDetails | null>(null)
  const [loadingBank, setLoadingBank] = useState(false)
  const [transferRef, setTransferRef] = useState(() => generateRandomTransferRef())
  const [transferNote, setTransferNote] = useState('Đã chuyển khoản hoàn tiền thành công cho khách hàng.')
  const [isConfirming, setIsConfirming] = useState(false)

  const query = useQuery({
    queryKey: ['admin', 'refund', idNum],
    queryFn: () => refundApi.getDetail(idNum),
    enabled: idNum > 0,
    staleTime: 30_000,
  })

  const refund = query.data

  useEffect(() => {
    if (refund) {
      document.title = `Hồ sơ hoàn tiền #REF-${refund.id} · Admin 3DWorld`
    }
  }, [refund])

  const handleFetchBank = async () => {
    setLoadingBank(true)
    try {
      const res = await refundApi.getAdminTransferDetails(idNum, 'Admin đối soát tài khoản để thực hiện chuyển khoản hoàn tiền.')
      setBankDetails(res)
      toast('Đã giải mã thành công thông tin tài khoản ngân hàng của khách.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không lấy được thông tin ngân hàng.'
      toast(msg, 'error')
    } finally {
      setLoadingBank(false)
    }
  }

  const handleConfirmTransfer = async () => {
    if (!transferRef.trim()) {
      toast('Vui lòng nhập mã giao dịch chuyển khoản thực tế.', 'error')
      return
    }
    if (!transferNote.trim()) {
      toast('Vui lòng nhập ghi chú chuyển khoản.', 'error')
      return
    }

    setIsConfirming(true)
    try {
      await refundApi.confirmAdminTransfer(idNum, {
        transferReference: transferRef.trim(),
        reason: transferNote.trim(),
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'refund', idNum] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'refunds'] }),
        queryClient.invalidateQueries({ queryKey: ['staff', 'refunds'] }),
      ])
      toast('Đã xác nhận chuyển khoản hoàn tiền thành công! Trạng thái hồ sơ chuyển sang COMPLETED.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xác nhận chuyển tiền.'
      toast(msg, 'error')
    } finally {
      setIsConfirming(false)
    }
  }

  if (query.isLoading) {
    return (
      <div className="grid min-h-[400px] place-items-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-violet-soft border-t-violet" />
      </div>
    )
  }

  if (!refund) {
    return (
      <div>
        <div className="mb-5">
          <Link to="/admin/refunds" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink">
            <ArrowLeft size={14} /> Quay về danh sách
          </Link>
        </div>
        <StatusBlock
          tone="empty"
          title="Không tìm thấy hồ sơ khiếu nại"
          body={`Hồ sơ yêu cầu hoàn tiền #${refundId} không tồn tại hoặc bạn không có quyền xem.`}
        />
      </div>
    )
  }

  // Parse evidence images from audit history
  let evidenceImages: string[] = []
  const requestedEntry = refund.history?.find((h) => h.status === 'REFUND_REQUESTED')
  if (requestedEntry?.metadata) {
    try {
      const meta = typeof requestedEntry.metadata === 'string' ? JSON.parse(requestedEntry.metadata) : requestedEntry.metadata
      if (Array.isArray(meta?.images)) {
        evidenceImages = meta.images
      }
    } catch {
      // ignore
    }
  }

  const isApproved = refund.status === 'APPROVED' || (refund.status as string) === 'PROCESSING'
  const isPaid = refund.status === 'PAID' || (refund.status as string) === 'SUCCESS' || (refund.status as string) === 'COMPLETED'
  const isRejected = refund.status === 'REJECTED' || (refund.status as string) === 'FAILED'

  return (
    <div className="space-y-6">
      <div className="mb-3">
        <Link to="/admin/refunds" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink">
          <ArrowLeft size={14} /> Quay về danh sách hoàn tiền
        </Link>
      </div>

      {/* Top Banner */}
      <div className="rounded-[2rem] bg-white/95 p-6 shadow-soft sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-ink-soft">
                Hồ sơ hoàn tiền #REF-{refund.id}
              </span>
              <span className="text-line">•</span>
              <span className="text-xs text-ink-soft">
                Đơn hàng: #ORD-{String(refund.physical_order_id).padStart(5, '0')}
              </span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Đối Soát & Thực Thi Hoàn Tiền
            </h1>
            <p className="mt-1 font-label text-sm text-ink-soft">
              Số tiền hoàn:{' '}
              <strong className="text-orange-deep font-mono text-base">{formatVnd(refund.amount)}</strong>
            </p>
          </div>
          <Pill tone={statusTone(refund.status)}>
            {statusLabel(refund.status)}
          </Pill>
        </div>
      </div>

      <DetailLayout
        main={
          <>
            {/* Thông tin hồ sơ */}
            <Section title="Thông tin khiếu nại">
              <KeyValues
                cols={2}
                items={[
                  { label: 'Mã hồ sơ', value: `#REF-${refund.id}` },
                  { label: 'Mã đơn hàng', value: `#ORD-${String(refund.physical_order_id).padStart(5, '0')}` },
                  { label: 'Số tiền yêu cầu hoàn', value: formatVnd(refund.amount) },
                  { label: 'Thời điểm tạo', value: formatDateTime(refund.created_at) },
                  { label: 'Lý do khiếu nại', value: refund.reason || '—' },
                  {
                    label: 'Mã giao dịch thực tế',
                    value: refund.transfer_reference ? (
                      <span className="font-mono font-bold text-mint-deep">{refund.transfer_reference}</span>
                    ) : (
                      'Chưa có (Chờ chuyển khoản)'
                    ),
                  },
                ]}
              />
            </Section>

            {/* Minh chứng ảnh của khách hàng */}
            <Section title="Hình ảnh minh chứng do khách hàng tải lên">
              {evidenceImages.length === 0 ? (
                <p className="text-xs text-ink-soft italic">Khách hàng không đính kèm hình ảnh bổ sung.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {evidenceImages.map((url, idx) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-line bg-surface-low shadow-sm transition hover:scale-105"
                    >
                      <img src={url} alt={`Minh chứng #${idx + 1}`} className="h-full w-full object-cover" />
                      <span className="absolute bottom-1.5 left-1.5 rounded-lg bg-ink/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Ảnh #{idx + 1}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </Section>

            {/* KHỐI THỰC THI CHUYỂN KHOẢN (MANUAL TRANSFER) */}
            <Section
              title="Thực thi chuyển khoản thủ công (Manual Bank Transfer)"
              subtitle="Admin kiểm tra số tài khoản đã được giải mã, chuyển tiền qua ngân hàng và nhập mã giao dịch để hoàn tất."
            >
              {isApproved && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-orange/30 bg-peach/30 p-4 text-xs text-orange-deep">
                    <p className="font-semibold">Staff đã thẩm định chấp thuận hồ sơ này.</p>
                    <p className="mt-1 text-ink-soft">
                      Vui lòng bấm &quot;Lấy thông tin tài khoản ngân hàng&quot; bên dưới để nhận số tài khoản đầy đủ, sau đó chuyển khoản số tiền <strong>{formatVnd(refund.amount)}</strong> và xác nhận mã giao dịch.
                    </p>
                  </div>

                  {!bankDetails ? (
                    <div>
                      <Btn
                        variant="primary"
                        icon={Eye}
                        onClick={handleFetchBank}
                        disabled={loadingBank}
                      >
                        {loadingBank ? 'Đang giải mã thông tin tài khoản...' : 'Lấy thông tin tài khoản chuyển tiền'}
                      </Btn>
                      <p className="mt-2 text-[11px] text-ink-soft">
                        (Hành động truy cập số tài khoản sẽ được ghi nhận vào nhật ký kiểm toán audit logs để bảo mật thông tin tài chính).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 rounded-2xl border border-line bg-surface-low p-5">
                      <div className="flex items-center justify-between border-b border-line pb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-violet">
                          Thông tin tài khoản nhận tiền hoàn
                        </span>
                        <Pill tone="green">Đã giải mã bảo mật</Pill>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-ink-soft">Ngân hàng</p>
                          <p className="text-sm font-bold text-ink">
                            {bankDetails.bankName} ({bankDetails.bankCode})
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-soft">Chủ tài khoản</p>
                          <p className="text-sm font-bold uppercase text-ink">
                            {bankDetails.accountHolder}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-xs text-ink-soft">Số tài khoản chuyển khoản</p>
                          <div className="mt-1 flex items-center gap-3">
                            <span className="font-mono text-lg font-bold text-violet">
                              {bankDetails.accountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(bankDetails.accountNumber)
                                toast('Đã sao chép số tài khoản vào clipboard!')
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:border-violet hover:text-violet"
                            >
                              <Copy size={12} /> Sao chép
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-line pt-4">
                        <p className="text-xs font-semibold uppercase text-ink">Bước tiếp theo: Xác nhận chuyển khoản</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-xs font-semibold text-ink-soft">
                                Mã giao dịch ngân hàng (Transfer Reference) *
                              </span>
                              <button
                                type="button"
                                onClick={() => setTransferRef(generateRandomTransferRef())}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet hover:underline"
                                title="Tạo mã giao dịch ngẫu nhiên"
                              >
                                <RefreshCw size={11} /> Đổi mã khác
                              </button>
                            </div>
                            <input
                              value={transferRef}
                              onChange={(e) => setTransferRef(e.target.value)}
                              placeholder="Ví dụ: FT241102948194"
                              className="w-full rounded-xl border border-line bg-white px-3 py-2 font-mono text-sm font-bold text-ink outline-none focus:border-violet"
                            />
                            <span className="mt-1 block text-[10px] text-ink-soft">
                              Đã tự động điền mã tham chiếu chuẩn ngân hàng. Bạn có thể bấm &quot;Xác nhận&quot; ngay hoặc chỉnh sửa.
                            </span>
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-ink-soft">
                              Ghi chú chuyển khoản *
                            </span>
                            <input
                              value={transferNote}
                              onChange={(e) => setTransferNote(e.target.value)}
                              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-violet"
                            />
                          </label>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Btn
                            variant="primary"
                            icon={CheckCircle2}
                            onClick={handleConfirmTransfer}
                            disabled={isConfirming || !transferRef.trim()}
                          >
                            {isConfirming ? 'Đang ghi nhận lệnh chi...' : 'Xác nhận đã chuyển khoản thành công'}
                          </Btn>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isPaid && (
                <div className="rounded-2xl border border-mint/40 bg-mint/15 p-5 text-sm text-[#0f5132]">
                  <div className="flex items-center gap-2 font-bold text-base">
                    <CheckCircle2 size={20} />
                    <span>Đã hoàn tất hoàn tiền cho khách hàng</span>
                  </div>
                  <p className="mt-2 text-xs">
                    Mã đối soát giao dịch ngân hàng:{' '}
                    <strong className="font-mono text-sm">{refund.transfer_reference}</strong>
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Hệ thống đã tự động ghi nhận ghi nợ tiền mặt sàn và đảo ngược doanh thu chờ của người bán cho đơn hàng này.
                  </p>
                </div>
              )}

              {!isApproved && !isPaid && (
                <div className="rounded-2xl bg-surface-low p-4 text-xs text-ink-soft">
                  <p className="font-semibold text-ink">
                    Hồ sơ đang ở trạng thái: {statusLabel(refund.status)}
                  </p>
                  <p className="mt-1">
                    Chỉ những hồ sơ khiếu nại đã được nhân viên Staff thẩm định chấp thuận (`APPROVED`) mới được chuyển sang giao đoạn chuyển khoản của Admin.
                  </p>
                </div>
              )}
            </Section>
          </>
        }
        aside={
          <div className="space-y-6">
            <Section title="Nhật ký xử lý (Audit Timeline)">
              <div className="space-y-3">
                {refund.history.map((h, i) => (
                  <div key={`${h.status}-${i}`} className="border-l-2 border-line pl-3 py-1">
                    <p className="text-xs font-semibold text-ink">
                      {h.status === 'REFUND_REQUESTED'
                        ? 'Khách hàng nộp đơn hoàn tiền'
                        : h.status === 'REFUND_APPROVED'
                          ? 'Staff duyệt chấp thuận'
                          : h.status === 'REFUND_REJECTED'
                            ? 'Staff từ chối yêu cầu'
                            : h.status === 'REFUND_PAID'
                              ? 'Admin xác nhận đã chuyển tiền'
                              : h.status === 'REFUND_BANK_DETAILS_ACCESSED'
                                ? 'Admin xem thông tin STK'
                                : h.status}
                    </p>
                    {h.reason && <p className="mt-0.5 text-xs text-ink-soft italic">&quot;{h.reason}&quot;</p>}
                    <p className="mt-1 text-[11px] text-ink-soft">{formatDateTime(h.created_at)}</p>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        }
      />
    </div>
  )
}
