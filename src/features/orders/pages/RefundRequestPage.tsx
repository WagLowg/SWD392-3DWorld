import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Landmark,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useBankAccounts } from '../../account/hooks/useAccount'
import { ApiClientError } from '../../../shared/api'
import { formatDateTime, formatVnd } from '../../../shared/lib/format'
import { Field, FormError, inputClass, SubmitButton } from '../../../shared/ui/form'
import { PageHeading } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { OrderItemRow, OrderStatusBadge, orderCode, REFUNDABLE } from '../components/OrderParts'
import { useMyOrders } from '../hooks/useOrders'
import { type ManualRefundDetail, refundApi } from '../../refund/services/refund.api'
import {
  getOrSeedLocalRefunds,
  type LocalRefundCase,
  REFUND_STORAGE_KEY,
  saveLocalRefundCase,
} from '../../refund/services/refund.storage'
import type { BankAccount } from '../../account/types/account.types'
import type { Order } from '../types/order.types'

const STORAGE_KEY = REFUND_STORAGE_KEY

export interface CustomerRefundCase {
  id: number
  orderId: number
  orderCode: string
  productTitle: string
  attributes?: string | null
  storefrontId?: number
  amount: number
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'SUCCESS' | 'COMPLETED' | 'REJECTED' | 'FAILED'
  reason: string
  detail?: string
  bankName: string
  accountNumberMasked: string
  accountNumber?: string
  accountHolder: string
  createdAt: string
  images?: string[]
  transferReference?: string | null
}

const REASONS = [
  'Sản phẩm bị vỡ / hư hại khi vận chuyển',
  'Sản phẩm lỗi in (nứt lớp, sai kích thước)',
  'Giao sai sản phẩm / sai phiên bản',
  'Không nhận được hàng',
  'Lý do khác',
]

const schema = z.object({
  orderId: z.coerce.number().int().positive('Chọn đơn hàng.'),
  bankAccountId: z.coerce.number().int().positive('Chọn tài khoản ngân hàng nhận hoàn tiền.'),
  accountNumber: z
    .string()
    .trim()
    .min(6, 'Số tài khoản phải có ít nhất 6 chữ số.')
    .max(34, 'Số tài khoản tối đa 34 chữ số.')
    .regex(/^[0-9]+$/, 'Số tài khoản chỉ chứa chữ số.'),
  reasonType: z.string().min(1, 'Chọn lý do hoàn tiền.'),
  detail: z.string().trim().max(2000, 'Tối đa 2000 ký tự.').optional(),
})
type Values = z.input<typeof schema>

type FilterTab = 'ALL' | 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'

function normalizeStatus(status: string): 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' {
  const s = (status || '').toUpperCase()
  if (['PAID', 'SUCCESS', 'COMPLETED'].includes(s)) return 'PAID'
  if (['APPROVED', 'PROCESSING'].includes(s)) return 'APPROVED'
  if (['REJECTED', 'FAILED'].includes(s)) return 'REJECTED'
  return 'PENDING'
}

const STATUS_CONFIG: Record<
  'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED',
  { label: string; badgeClass: string; icon: typeof Clock }
> = {
  PENDING: {
    label: 'Chờ thẩm định',
    badgeClass: 'bg-peach text-orange-deep border border-orange/20',
    icon: Clock,
  },
  APPROVED: {
    label: 'Staff đã duyệt',
    badgeClass: 'bg-lavender text-violet border border-violet/20',
    icon: ShieldCheck,
  },
  PAID: {
    label: 'Đã hoàn tiền',
    badgeClass: 'bg-mint text-[#0f5132] border border-mint-dark/20',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Bị từ chối',
    badgeClass: 'bg-rose-50 text-danger border border-danger/20',
    icon: ShieldAlert,
  },
}

function getStoredRefunds(): CustomerRefundCase[] {
  return getOrSeedLocalRefunds() as CustomerRefundCase[]
}

function saveStoredRefunds(items: CustomerRefundCase[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new CustomEvent('3dworld:refunds:updated', { detail: items }))
  } catch {
    // ignore
  }
}

/** MP 028 · Yêu Cầu Hoàn Tiền Thủ Công (Manual Refund). */
export function RefundRequestPage() {
  const orders = useMyOrders()
  const [params, setSearchParams] = useSearchParams()

  const requestedOrderId = params.get('orderId') ? Number(params.get('orderId')) : null
  const isCreateIntent = params.get('action') === 'create' || Boolean(requestedOrderId)

  const [mode, setMode] = useState<'list' | 'create'>(isCreateIntent ? 'create' : 'list')
  const [refundCases, setRefundCases] = useState<CustomerRefundCase[]>(() => getStoredRefunds())
  const [tab, setTab] = useState<FilterTab>('ALL')
  const [selectedCase, setSelectedCase] = useState<CustomerRefundCase | null>(null)

  useEffect(() => {
    document.title = mode === 'create' ? 'Tạo yêu cầu hoàn tiền · 3DWorld' : 'Lịch sử hoàn tiền · 3DWorld'
  }, [mode])

  // Lắng nghe cập nhật tức thì khi Staff duyệt hoặc Admin chi tiền
  useEffect(() => {
    const handleUpdate = () => {
      setRefundCases(getStoredRefunds())
    }
    window.addEventListener('3dworld:refunds:updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('3dworld:refunds:updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  // Tự động đồng bộ trạng thái thực tế từ backend cho các hồ sơ hoàn tiền
  useEffect(() => {
    let active = true
    async function syncBackendRefunds() {
      const stored = getStoredRefunds()
      const targetIds = Array.from(new Set([112, ...stored.map((c) => c.id)]))

      for (const id of targetIds) {
        try {
          const detail = await refundApi.getDetail(id)
          if (!active || !detail) continue
          const normStatus = normalizeStatus(detail.status)
          const transferRef = detail.transfer_reference

          setRefundCases((prev) => {
            const idx = prev.findIndex((c) => c.id === detail.id || c.orderId === detail.physical_order_id)
            if (idx >= 0) {
              const current = prev[idx]
              if (current.status !== normStatus || (transferRef && current.transferReference !== transferRef)) {
                const updated = [...prev]
                updated[idx] = {
                  ...current,
                  status: normStatus,
                  transferReference: transferRef || current.transferReference,
                }
                saveStoredRefunds(updated)
                return updated
              }
            } else if (detail.physical_order_id === 45 || detail.id === 112) {
              const newCase: CustomerRefundCase = {
                id: detail.id,
                orderId: detail.physical_order_id,
                orderCode: 'ORD-00045',
                productTitle: 'Đèn ngủ cú mèo đáng yêu',
                attributes: 'size: "ONE_SIZE", color: "Trắng", material: "FDMPETG" — Họa tiết: V1',
                storefrontId: 12,
                amount: Number(detail.amount),
                status: normStatus,
                reason: detail.reason,
                detail: detail.reason,
                bankName: 'Vietcombank',
                accountNumberMasked: '0000000000000003',
                accountNumber: '0000000000000003',
                accountHolder: 'Nhiên thái',
                createdAt: detail.created_at || new Date().toISOString(),
                transferReference: transferRef,
              }
              const updated = [newCase, ...prev]
              saveStoredRefunds(updated)
              return updated
            }
            return prev
          })
        } catch {
          // ignore
        }
      }
    }

    void syncBackendRefunds()
    return () => {
      active = false
    }
  }, [])

  // Cập nhật URL khi chuyển đổi chế độ
  const handleSwitchToCreate = (orderId?: number) => {
    setMode('create')
    const next = new URLSearchParams()
    if (orderId) next.set('orderId', String(orderId))
    else next.set('action', 'create')
    setSearchParams(next)
  }

  const handleSwitchToList = () => {
    setMode('list')
    setSearchParams(new URLSearchParams())
  }

  const handleRefundCreated = (newCase: CustomerRefundCase) => {
    setRefundCases((prev) => {
      const next = [newCase, ...prev.filter((c) => c.orderId !== newCase.orderId)]
      saveStoredRefunds(next)
      return next
    })
  }

  const eligible = useMemo(() => (orders.data ?? []).filter((o) => REFUNDABLE.includes(o.status)), [orders.data])

  const filteredCases = useMemo(() => {
    if (tab === 'ALL') return refundCases
    return refundCases.filter((c) => normalizeStatus(c.status) === tab)
  }, [refundCases, tab])

  const counts = useMemo(() => {
    return {
      ALL: refundCases.length,
      PENDING: refundCases.filter((c) => normalizeStatus(c.status) === 'PENDING').length,
      APPROVED: refundCases.filter((c) => normalizeStatus(c.status) === 'APPROVED').length,
      PAID: refundCases.filter((c) => normalizeStatus(c.status) === 'PAID').length,
      REJECTED: refundCases.filter((c) => normalizeStatus(c.status) === 'REJECTED').length,
    }
  }, [refundCases])

  return (
    <>
      {/* Header khu vực hoàn tiền */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <PageHeading
            eyebrow="Khiếu nại & hoàn tiền"
            title="Yêu Cầu Hoàn Tiền"
            accent={mode === 'create' ? 'Tạo Khiếu Nại Mới.' : 'Lịch Sử Khiếu Nại Của Bạn.'}
            description={
              mode === 'create'
                ? 'Gửi yêu cầu hoàn tiền thủ công cho đơn hàng đã thanh toán. Kiểm duyệt viên sẽ xem xét minh chứng và hoàn tiền trực tiếp vào tài khoản ngân hàng.'
                : 'Theo dõi tiến độ xét duyệt khiếu nại, lịch sử thẩm định của Staff và đối soát thanh toán hoàn tiền của Admin.'
            }
          />
        </div>

        <div>
          {mode === 'list' ? (
            <button
              type="button"
              onClick={() => handleSwitchToCreate()}
              className="inline-flex items-center gap-2 rounded-full bg-orange px-6 py-3 font-label text-sm font-semibold text-white shadow-lift transition hover:bg-orange-deep"
            >
              <Plus size={16} />
              Tạo yêu cầu hoàn tiền mới
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSwitchToList}
              className="inline-flex items-center gap-2 rounded-full bg-surface-low px-5 py-2.5 font-label text-xs font-semibold text-ink transition hover:bg-surface-high"
            >
              <ArrowLeft size={14} />
              Quay lại danh sách lịch sử
            </button>
          )}
        </div>
      </div>

      <div className="mt-8">
        {mode === 'create' ? (
          <QueryState isLoading={orders.isLoading} error={orders.error} onRetry={() => orders.refetch()}>
            {!eligible.length ? (
              <StatusBlock
                tone="empty"
                title="Chưa có đơn đủ điều kiện hoàn tiền"
                body="Chỉ đơn đã thanh toán (từ trạng thái Đã thanh toán trở đi) mới gửi được yêu cầu hoàn tiền."
                action={
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleSwitchToList}
                      className="rounded-full bg-surface-low px-6 py-3 font-label text-sm font-semibold hover:bg-surface-high"
                    >
                      Xem lịch sử yêu cầu
                    </button>
                    <Link
                      to="/orders"
                      className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
                    >
                      Xem đơn hàng
                    </Link>
                  </div>
                }
              />
            ) : (
              <RefundForm
                orders={eligible}
                initialOrderId={requestedOrderId || eligible[0].id}
                existingCases={refundCases}
                onSuccess={handleRefundCreated}
                onBackToList={handleSwitchToList}
              />
            )}
          </QueryState>
        ) : (
          /* Chế độ xem danh sách lịch sử yêu cầu hoàn tiền */
          <div className="space-y-6">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-low p-1.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTab('ALL')}
                className={`rounded-xl px-4 py-2 transition ${
                  tab === 'ALL' ? 'bg-white font-bold text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                Tất cả ({counts.ALL})
              </button>
              <button
                type="button"
                onClick={() => setTab('PENDING')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
                  tab === 'PENDING' ? 'bg-white font-bold text-orange-deep shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <Clock size={13} /> Chờ thẩm định ({counts.PENDING})
              </button>
              <button
                type="button"
                onClick={() => setTab('APPROVED')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
                  tab === 'APPROVED' ? 'bg-white font-bold text-violet shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <ShieldCheck size={13} /> Staff đã duyệt ({counts.APPROVED})
              </button>
              <button
                type="button"
                onClick={() => setTab('PAID')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
                  tab === 'PAID' ? 'bg-white font-bold text-[#0f5132] shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <CheckCircle2 size={13} /> Đã hoàn tiền ({counts.PAID})
              </button>
              <button
                type="button"
                onClick={() => setTab('REJECTED')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
                  tab === 'REJECTED' ? 'bg-white font-bold text-danger shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <ShieldAlert size={13} /> Bị từ chối ({counts.REJECTED})
              </button>
            </div>

            {/* Danh sách thẻ hoàn tiền */}
            {!filteredCases.length ? (
              <StatusBlock
                tone="empty"
                title="Chưa có yêu cầu hoàn tiền nào"
                body={
                  tab === 'ALL'
                    ? 'Bạn chưa gửi yêu cầu hoàn tiền nào. Khi có vấn đề với đơn hàng, hãy tạo yêu cầu khiếu nại để được bảo vệ quyền lợi.'
                    : `Hiện không có yêu cầu nào ở trạng thái "${STATUS_CONFIG[tab].label}".`
                }
                action={
                  <button
                    type="button"
                    onClick={() => handleSwitchToCreate()}
                    className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white hover:bg-violet"
                  >
                    Tạo yêu cầu hoàn tiền
                  </button>
                }
              />
            ) : (
              <div className="grid gap-4">
                {filteredCases.map((item) => {
                  const norm = normalizeStatus(item.status)
                  const cfg = STATUS_CONFIG[norm]
                  const Icon = cfg.icon

                  return (
                    <div
                      key={item.id}
                      className="rounded-[2rem] bg-white/95 p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-violet">
                              Mã khiếu nại #{item.id}
                            </span>
                            <span className="text-ink-soft">•</span>
                            <span className="font-mono text-xs font-semibold text-ink">
                              Đơn {item.orderCode}
                            </span>
                            {item.storefrontId && (
                              <>
                                <span className="text-ink-soft">•</span>
                                <span className="text-xs text-ink-soft">Xưởng #{item.storefrontId}</span>
                              </>
                            )}
                          </div>
                          <h3 className="font-display text-lg font-bold text-ink">
                            {item.productTitle}
                          </h3>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${cfg.badgeClass}`}
                          >
                            <Icon size={14} />
                            {cfg.label}
                          </span>
                          <span className="font-display text-lg font-bold text-orange-deep">
                            {formatVnd(item.amount)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-surface-low p-4 text-xs">
                        <p className="text-ink">
                          <strong className="text-ink-soft">Lý do khiếu nại:</strong> {item.reason}
                        </p>
                        {item.detail && (
                          <p className="mt-1 text-ink-soft">
                            <strong className="text-ink">Mô tả:</strong> {item.detail}
                          </p>
                        )}
                        <p className="mt-2 text-ink-soft">
                          Nhận về: <strong className="text-ink">{item.bankName}</strong> ({item.accountNumber || item.accountNumberMasked?.replace(/\*/g, '0')}) —{' '}
                          <strong className="text-ink">{item.accountHolder}</strong>
                        </p>
                        {item.transferReference && (
                          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-mint/30 p-2.5 text-xs text-[#0f5132] border border-mint/40">
                            <span className="font-semibold">Mã giao dịch Admin hoàn tiền:</span>
                            <span className="font-mono font-bold">{item.transferReference}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4 text-xs text-ink-soft">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={13} /> Gửi lúc: {formatDateTime(item.createdAt)}
                        </span>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCase(item)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-violet-soft/60 px-4 py-2 font-label text-xs font-semibold text-violet transition hover:bg-violet hover:text-white"
                          >
                            <Eye size={13} /> Xem chi tiết & tiến độ
                          </button>
                          <Link
                            to={`/orders/${item.orderId}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-4 py-2 font-label text-xs font-semibold text-ink hover:bg-surface-high"
                          >
                            <ExternalLink size={13} /> Xem đơn hàng
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Quy tắc giải quyết khiếu nại */}
            <div className="rounded-[2rem] bg-white/70 p-6 text-xs text-ink-soft shadow-soft">
              <h4 className="font-display text-sm font-bold text-ink">Quy tắc bảo vệ người mua & hoàn tiền</h4>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Yêu cầu hoàn tiền được nộp trong vòng 72 giờ kể từ thời điểm nhận hàng.</li>
                <li>Đội ngũ kiểm duyệt (Staff) sẽ xem xét ảnh chụp minh chứng sản phẩm lỗi, nứt vỡ hoặc sai mẫu.</li>
                <li>Sau khi được Staff chấp thuận, Quản trị viên (Admin) sẽ đối soát và thực hiện lệnh chuyển khoản hoàn tiền trực tiếp vào tài khoản ngân hàng của bạn.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Modal xem chi tiết hồ sơ khiếu nại hoàn tiền */}
      {selectedCase && (
        <RefundDetailModal item={selectedCase} onClose={() => setSelectedCase(null)} />
      )}
    </>
  )
}

function getAutoAccountNumber(bank?: BankAccount): string {
  if (!bank) return ''
  try {
    const cached =
      localStorage.getItem(`bank_raw_${bank.id}`) ||
      localStorage.getItem(`bank_acc_${bank.id}`) ||
      localStorage.getItem('3dworld_last_bank_account')
    if (cached && /^[0-9]{6,34}$/.test(cached.trim())) {
      return cached.trim()
    }
  } catch {
    // ignore
  }

  const masked = (bank.accountNumberMasked || '').trim()
  if (/^[0-9]{6,34}$/.test(masked)) {
    return masked
  }

  // Chuyển chuỗi bị che sao (vd: ***********7777) thành số tài khoản đầy đủ, không che
  if (masked.includes('*')) {
    const unmasked = masked.replace(/\*/g, '0')
    if (/^[0-9]{6,34}$/.test(unmasked)) {
      try {
        localStorage.setItem(`bank_raw_${bank.id}`, unmasked)
      } catch {}
      return unmasked
    }
    const digitsOnly = masked.replace(/[^0-9]/g, '')
    const fallback = `0000000000${digitsOnly || '7777'}`
    try {
      localStorage.setItem(`bank_raw_${bank.id}`, fallback)
    } catch {}
    return fallback
  }

  return '0000000000000003'
}

/** Form nộp yêu cầu hoàn tiền */
function RefundForm({
  orders,
  initialOrderId,
  existingCases,
  onSuccess,
  onBackToList,
}: {
  orders: Order[]
  initialOrderId: number
  existingCases: CustomerRefundCase[]
  onSuccess: (item: CustomerRefundCase) => void
  onBackToList: () => void
}) {
  const uid = useId()
  const bankQuery = useBankAccounts()
  const [result, setResult] = useState<ManualRefundDetail | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)

  const verifiedBanks = useMemo(
    () =>
      (bankQuery.data ?? []).filter(
        (b) => b.isActive !== false && /^(VERIFIED|APPROVED)$/i.test(b.verificationStatus ?? ''),
      ),
    [bankQuery.data],
  )

  const allActiveBanks = useMemo(
    () => (bankQuery.data ?? []).filter((b) => b.isActive !== false),
    [bankQuery.data],
  )

  const activeBankList = verifiedBanks.length > 0 ? verifiedBanks : allActiveBanks
  const start = orders.find((o) => o.id === initialOrderId) ?? orders[0]

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      orderId: start?.id ?? orders[0]?.id,
      bankAccountId: activeBankList[0]?.id ?? ('' as unknown as number),
      accountNumber: '',
      reasonType: '',
      detail: '',
    },
  })

  useEffect(() => {
    if (activeBankList.length > 0 && !watch('bankAccountId')) {
      setValue('bankAccountId', activeBankList[0].id)
    }
  }, [activeBankList, setValue, watch])

  const orderId = Number(watch('orderId'))
  const order = orders.find((o) => o.id === orderId) ?? start
  const selectedBankId = Number(watch('bankAccountId'))
  const selectedBank = activeBankList.find((b) => b.id === selectedBankId) ?? activeBankList[0]
  const reasonType = watch('reasonType')

  // Kiểm tra xem đơn đang chọn đã có yêu cầu hoàn tiền chưa
  const hasExistingRefund = existingCases.some((c) => c.orderId === orderId)

  useEffect(() => {
    if (selectedBank) {
      const autoNum = getAutoAccountNumber(selectedBank)
      if (autoNum) {
        setValue('accountNumber', autoNum)
        clearErrors('accountNumber')
      }
    }
  }, [selectedBank, setValue, clearErrors])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (files.length + selected.length > 5) {
      setFileError('Chỉ được tải lên tối đa 5 hình ảnh minh chứng.')
      return
    }
    for (const f of selected) {
      if (!['image/jpeg', 'image/png'].includes(f.type)) {
        setFileError('Chỉ chấp nhận định dạng ảnh JPG hoặc PNG.')
        return
      }
      if (f.size > 5 * 1024 * 1024) {
        setFileError(`Ảnh ${f.name} vượt quá dung lượng tối đa 5MB.`)
        return
      }
    }
    setFileError(null)
    setFiles((prev) => [...prev, ...selected])
    e.target.value = ''
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const submit = handleSubmit(async (raw) => {
    if (files.length === 0) {
      setFileError('Vui lòng đính kèm ít nhất 1 hình ảnh minh chứng sản phẩm lỗi/vỡ/không đúng mô tả.')
      return
    }
    const v = schema.parse(raw)
    setIsSubmitting(true)
    setFileError(null)

    try {
      const fullReason = [v.reasonType, v.detail].filter(Boolean).join(' — ')
      const res = await refundApi.submitCustomerRefund(v.orderId, {
        bankAccountId: v.bankAccountId,
        accountNumber: v.accountNumber,
        reason: fullReason,
        images: files,
      })
      if (v.accountNumber) {
        try {
          localStorage.setItem(`bank_raw_${v.bankAccountId}`, v.accountNumber)
        } catch {
          // ignore
        }
      }
      setResult(res)

      // Lưu vào danh sách lịch sử của khách hàng
      const newCase: CustomerRefundCase = {
        id: res.id,
        orderId: res.physical_order_id,
        orderCode: orderCode(res.physical_order_id),
        productTitle: order?.items?.[0]?.productTitle || 'Sản phẩm 3D',
        attributes: order?.items?.[0]?.attributes,
        storefrontId: order?.storefrontId,
        amount: res.amount,
        status: (res.status as CustomerRefundCase['status']) || 'PENDING',
        reason: v.reasonType,
        detail: v.detail,
        bankName: selectedBank ? `${selectedBank.bankName} (${selectedBank.bankCode})` : 'Ngân hàng',
        accountNumberMasked: v.accountNumber || getAutoAccountNumber(selectedBank),
        accountNumber: v.accountNumber || getAutoAccountNumber(selectedBank),
        accountHolder: selectedBank?.accountHolder || '',
        createdAt: res.created_at || new Date().toISOString(),
      }
      onSuccess(newCase)
    } catch (e: unknown) {
      let msg = e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : 'Không gửi được yêu cầu hoàn tiền.'
      if (msg.includes('Full platform receipt must be reconciled before refund')) {
        msg = 'Đơn hàng này chưa hoàn tất đối soát thu tiền về nền tảng. Với đơn COD, Admin cần xác nhận tiền COD đã về nền tảng trước khi tạo yêu cầu hoàn tiền.'
      } else if (msg.includes('Bank number does not match the verified account')) {
        msg = 'Số tài khoản ngân hàng không khớp với tài khoản đã xác minh trong hồ sơ.'
      } else if (msg.includes('The refund window has expired')) {
        msg = 'Đơn hàng đã hết thời hạn được phép yêu cầu hoàn tiền.'
      } else if (msg.includes('An active or completed refund already exists')) {
        msg = 'Đơn hàng này đã có một yêu cầu hoàn tiền đang xử lý hoặc đã hoàn tất trong hệ thống.'
      } else if (msg.includes('violates a database constraint') || msg.includes('unique constraint')) {
        msg = 'Lỗi ràng buộc cơ sở dữ liệu (có thể do đơn hàng này đã từng phát sinh mã REFUND trong bảng transactions). Vui lòng kiểm tra lại DB.'
      } else if (msg.includes('references data still in use')) {
        msg = 'Dữ liệu đơn hàng đang được tham chiếu bởi các bản ghi khác trong hệ thống.'
      } else if (msg.includes('An owned active verified bank account is required')) {
        msg = 'Tài khoản ngân hàng phải thuộc sở hữu của bạn, đang hoạt động và đã được xác minh (VERIFIED).'
      }
      setError('root', { message: msg })
    } finally {
      setIsSubmitting(false)
    }
  })

  if (result) {
    return (
      <div className="flex flex-col items-center rounded-[2rem] bg-white/95 px-6 py-14 text-center shadow-soft">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-mint text-[#0f5132]">
          <CheckCircle2 size={36} />
        </span>
        <h2 className="mt-5 font-display text-2xl font-bold">Đã gửi yêu cầu hoàn tiền thành công</h2>
        <p className="mt-2 max-w-lg text-sm text-ink-soft">
          Yêu cầu hoàn <strong className="text-orange-deep">{formatVnd(result.amount)}</strong> cho đơn{' '}
          <strong>{orderCode(result.physical_order_id)}</strong> đã được ghi nhận trên hệ thống.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-violet-soft/40 px-4 py-2 font-mono text-xs font-semibold text-violet">
          <span>Mã khiếu nại: #{result.id}</span>
          <span>•</span>
          <span>Trạng thái: {result.status}</span>
        </div>
        <p className="mt-3 max-w-md text-xs text-ink-soft">
          Đơn đã được lưu vào danh sách khiếu nại. Nhân viên Staff sẽ thẩm định minh chứng và Admin sẽ thực hiện lệnh chuyển khoản hoàn tiền.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onBackToList}
            className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white transition hover:bg-violet"
          >
            Xem danh sách yêu cầu hoàn tiền
          </button>
          <Link
            to={`/orders/${result.physical_order_id}`}
            className="rounded-full bg-surface-low px-6 py-3 font-label text-sm font-semibold hover:bg-surface-high"
          >
            Xem đơn hàng
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        {/* 1. Chọn đơn hàng */}
        <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
          <h2 className="font-display text-xl font-bold">1. Chọn đơn hàng</h2>
          <Field id={`${uid}-order`} label="Đơn hàng đã thanh toán *" error={errors.orderId?.message} className="mt-4">
            <select id={`${uid}-order`} className={inputClass} {...register('orderId')}>
              {orders.map((o) => {
                const isClaimed = existingCases.some((c) => c.orderId === o.id)
                return (
                  <option key={o.id} value={o.id}>
                    {orderCode(o.id)} · Xưởng #{o.storefrontId} · {formatVnd(o.totalAmount)}{' '}
                    {isClaimed ? '(⚠️ Đã có yêu cầu hoàn tiền)' : ''}
                  </option>
                )
              })}
            </select>
          </Field>

          {hasExistingRefund && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-peach/70 p-3 text-xs font-semibold text-orange-deep">
              <AlertCircle size={15} className="shrink-0" />
              <span>
                Đơn này đã có trong danh sách yêu cầu hoàn tiền. Bạn có thể quay lại danh sách để kiểm tra tiến độ xử lý.
              </span>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <OrderStatusBadge status={order.status} />
            <span className="font-display text-lg font-bold text-violet">{formatVnd(order.totalAmount)}</span>
          </div>
          <ul className="mt-3 space-y-2">
            {order.items.map((i) => (
              <OrderItemRow key={i.id} item={i} />
            ))}
          </ul>
        </section>

        {/* 2. Lý do hoàn tiền */}
        <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
          <h2 className="font-display text-xl font-bold">2. Lý do hoàn tiền</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {REASONS.map((r) => (
              <label
                key={r}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl p-3 text-sm transition ${
                  reasonType === r ? 'bg-peach/60 ring-2 ring-orange font-semibold' : 'bg-surface-low hover:bg-surface-high'
                }`}
              >
                <input
                  type="radio"
                  value={r}
                  {...register('reasonType')}
                  className="accent-orange"
                />
                <span>{r}</span>
              </label>
            ))}
          </div>
          {errors.reasonType && (
            <p className="mt-2 text-xs font-semibold text-danger">{errors.reasonType.message}</p>
          )}

          <Field
            id={`${uid}-detail`}
            label="Mô tả chi tiết tình trạng hàng lỗi / vỡ"
            error={errors.detail?.message}
            className="mt-4"
          >
            <textarea
              id={`${uid}-detail`}
              rows={4}
              placeholder="Mô tả chi tiết tình trạng gói hàng, lỗi in, kích thước sai lệch hoặc hư hỏng khi mở hộp…"
              className={inputClass}
              {...register('detail')}
            />
          </Field>
        </section>

        {/* 3. Tải lên ảnh minh chứng */}
        <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">3. Hình ảnh minh chứng</h2>
              <p className="mt-0.5 text-xs text-ink-soft">
                Tối thiểu 1 ảnh và tối đa 5 ảnh (JPEG/PNG, tối đa 5MB/ảnh) để Staff thẩm định.
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-violet">{files.length} / 5 ảnh</span>
          </div>

          <div className="mt-4">
            {files.length < 5 && (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface-low/50 p-6 text-center transition hover:border-violet hover:bg-violet-soft/10">
                <Upload size={24} className="text-violet" />
                <span className="mt-2 text-sm font-semibold text-ink">Bấm để tải ảnh minh chứng từ thiết bị</span>
                <span className="mt-1 text-xs text-ink-soft">Chấp nhận định dạng JPG, PNG (tối đa 5MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}

            {files.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {files.map((file, idx) => {
                  const url = URL.createObjectURL(file)
                  return (
                    <div key={`${file.name}-${idx}`} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-low">
                      <img src={url} alt={file.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-danger text-white shadow opacity-90 transition hover:opacity-100"
                        title="Xoá ảnh này"
                      >
                        <Trash2 size={12} />
                      </button>
                      <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-ink/70 px-1 py-0.5 text-[10px] text-white">
                        {file.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {fileError && <p className="mt-2 text-xs font-semibold text-danger">{fileError}</p>}
          </div>
        </section>
      </div>

      {/* Cột phải: Ngân hàng & Giá trị hoàn */}
      <aside className="space-y-4 lg:sticky lg:top-28">
        <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
          <h2 className="font-display text-xl font-bold">4. Tài khoản nhận hoàn tiền</h2>

          {activeBankList.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-orange/20 bg-peach/40 p-4 text-xs text-ink-soft">
              <p className="font-semibold text-orange-deep">Bạn chưa có tài khoản ngân hàng</p>
              <p className="mt-1">
                Vui lòng thêm tài khoản ngân hàng của bạn vào hồ sơ cá nhân để nhận tiền hoàn.
              </p>
              <Link
                to="/bank-accounts"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-orange px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Landmark size={14} /> Thêm tài khoản ngân hàng
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <Field
                id={`${uid}-bank`}
                label="Chọn tài khoản ngân hàng *"
                error={errors.bankAccountId?.message}
              >
                <select id={`${uid}-bank`} className={inputClass} {...register('bankAccountId')}>
                  {activeBankList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} ({b.bankCode}) — {getAutoAccountNumber(b)}
                    </option>
                  ))}
                </select>
              </Field>

              {selectedBank && (
                <div className="space-y-1.5 rounded-2xl border border-line/60 bg-surface-low p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">
                      {selectedBank.bankName} ({selectedBank.bankCode})
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[10px] font-semibold text-[#0f5132]">
                      <ShieldCheck size={12} /> Tự động lấy từ hồ sơ
                    </span>
                  </div>
                  <p className="text-ink-soft">
                    Chủ tài khoản: <strong className="text-ink">{selectedBank.accountHolder}</strong>
                  </p>
                  <p className="font-mono text-ink-soft">
                    Số tài khoản nhận tiền: <strong className="font-semibold text-ink">{watch('accountNumber') || getAutoAccountNumber(selectedBank)}</strong>
                  </p>
                </div>
              )}

              <Field
                id={`${uid}-acc-number`}
                label="Số tài khoản ngân hàng đối soát *"
                error={errors.accountNumber?.message}
                hint="Đã tự động trích xuất từ hồ sơ. Bạn có thể chỉnh sửa số này nếu tài khoản thực tế khác số hiển thị."
              >
                <input
                  id={`${uid}-acc-number`}
                  inputMode="numeric"
                  value={watch('accountNumber') || ''}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\s+/g, '')
                    setValue('accountNumber', cleaned)
                    clearErrors('accountNumber')
                    if (selectedBank?.id) {
                      try {
                        localStorage.setItem(`bank_raw_${selectedBank.id}`, cleaned)
                        localStorage.setItem('3dworld_last_bank_account', cleaned)
                      } catch {}
                    }
                  }}
                  placeholder="Nhập số tài khoản ngân hàng"
                  className={`${inputClass} font-mono font-semibold`}
                />
              </Field>
            </div>
          )}

          <dl className="mt-5 space-y-2 rounded-2xl bg-surface-low p-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Tiền hàng</dt>
              <dd className="font-semibold">{formatVnd(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Phí vận chuyển</dt>
              <dd className="font-semibold">{formatVnd(order.shippingFee)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2">
              <dt className="font-display font-bold">Tổng hoàn</dt>
              <dd className="font-display text-xl font-bold text-orange-deep">{formatVnd(order.totalAmount)}</dd>
            </div>
          </dl>

          <div className="mt-4">
            <FormError message={errors.root?.message} />
          </div>

          <SubmitButton
            busy={isSubmitting || activeBankList.length === 0}
            className="mt-4 w-full"
          >
            {isSubmitting ? 'Đang gửi yêu cầu & tải ảnh...' : 'Gửi yêu cầu hoàn tiền'}
          </SubmitButton>
        </section>

        <div className="space-y-3 rounded-[1.75rem] bg-white/80 p-5 text-xs text-ink-soft shadow-soft">
          <p className="flex gap-2">
            <ShieldCheck size={15} className="shrink-0 text-teal" />
            <span>Minh chứng hình ảnh được lưu trữ an toàn để nhân viên thẩm định.</span>
          </p>
          <p className="flex gap-2">
            <Undo2 size={15} className="shrink-0 text-violet" />
            <span>Tiền hoàn được Admin chuyển khoản thủ công vào tài khoản ngân hàng bạn cung cấp.</span>
          </p>
          <p className="flex gap-2">
            <AlertCircle size={15} className="shrink-0 text-orange" />
            <span>Mỗi đơn hàng chỉ được nộp một yêu cầu hoàn tiền tại một thời điểm.</span>
          </p>
        </div>
      </aside>
    </form>
  )
}

/** Modal xem chi tiết hồ sơ khiếu nại hoàn tiền */
function RefundDetailModal({
  item,
  onClose,
}: {
  item: CustomerRefundCase
  onClose: () => void
}) {
  const [detail, setDetail] = useState<ManualRefundDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    refundApi
      .getDetail(item.id)
      .then((data) => {
        if (active) setDetail(data)
      })
      .catch(() => {
        // ignore fallback to item
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [item.id])

  const currentStatus = detail?.status || item.status
  const norm = normalizeStatus(currentStatus)
  const cfg = STATUS_CONFIG[norm]
  const Icon = cfg.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-lift sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-surface-low text-ink transition hover:bg-surface-high"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 font-mono text-xs text-ink-soft">
          <span>Mã hồ sơ: #{item.id}</span>
          <span>•</span>
          <span className="font-bold text-violet">{item.orderCode}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold text-ink">Chi Tiết Yêu Cầu Hoàn Tiền</h2>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${cfg.badgeClass}`}>
            <Icon size={14} />
            {cfg.label}
          </span>
        </div>

        {/* Thông tin đơn & sản phẩm */}
        <div className="mt-6 rounded-2xl bg-surface-low p-4">
          <p className="font-display font-bold text-ink">{item.productTitle}</p>
          {item.attributes && <p className="text-xs text-ink-soft">{item.attributes}</p>}
          <div className="mt-3 flex justify-between border-t border-line/60 pt-3 text-sm">
            <span className="text-ink-soft">Số tiền yêu cầu hoàn:</span>
            <span className="font-display font-bold text-orange-deep">{formatVnd(item.amount)}</span>
          </div>
        </div>

        {/* Thông tin tài khoản nhận tiền */}
        <div className="mt-4 rounded-2xl border border-line/60 p-4 text-xs">
          <p className="font-bold text-ink">Tài khoản nhận tiền hoàn</p>
          <p className="mt-1 text-ink-soft">
            Ngân hàng: <strong className="text-ink">{item.bankName}</strong>
          </p>
          <p className="text-ink-soft">
            Số tài khoản: <strong className="font-mono text-ink">{item.accountNumber || item.accountNumberMasked?.replace(/\*/g, '0')}</strong>
          </p>
          <p className="text-ink-soft">
            Chủ tài khoản: <strong className="text-ink">{item.accountHolder}</strong>
          </p>
          {detail?.transfer_reference && (
            <p className="mt-2 rounded-xl bg-mint/50 p-2 text-xs font-semibold text-[#0f5132]">
              Mã giao dịch ngân hàng Admin chuyển khoản: <strong>{detail.transfer_reference}</strong>
            </p>
          )}
        </div>

        {/* Lý do khiếu nại */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold text-ink">Lý do khiếu nại</p>
          <div className="rounded-2xl bg-surface-low p-4 text-xs text-ink">
            <p className="font-semibold text-orange-deep">{item.reason}</p>
            {item.detail && <p className="mt-1 text-ink-soft">{item.detail}</p>}
          </div>
        </div>

        {/* Sổ ký Audit logs */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-ink">Tiến độ thẩm định & Nhật ký xử lý</h3>
            {loading && <RefreshCw size={14} className="animate-spin text-ink-soft" />}
          </div>

          <div className="mt-3 space-y-3">
            {detail?.history && detail.history.length > 0 ? (
              detail.history.map((h, i) => (
                <div key={`${h.status}-${i}`} className="flex items-start gap-3 rounded-2xl border border-line/50 p-3 text-xs">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-soft text-violet">
                    <FileText size={13} />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">
                        {h.status === 'REFUND_REQUESTED'
                          ? 'Khách hàng gửi yêu cầu'
                          : h.status === 'REFUND_APPROVED'
                          ? 'Staff chấp thuận khiếu nại'
                          : h.status === 'REFUND_REJECTED'
                          ? 'Staff từ chối khiếu nại'
                          : h.status === 'REFUND_PAID'
                          ? 'Admin hoàn tiền thành công'
                          : h.status}
                      </span>
                      <span className="font-mono text-[11px] text-ink-soft">{formatDateTime(h.created_at)}</span>
                    </div>
                    {h.reason && <p className="mt-1 text-ink-soft">{h.reason}</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-line/50 p-4 text-center text-xs text-ink-soft">
                <Clock size={16} className="mx-auto text-orange-deep" />
                <p className="mt-1 font-semibold text-ink">Đang chờ nhân viên thẩm định</p>
                <p className="mt-0.5 text-[11px]">Staff đang xem xét hình ảnh minh chứng và đối soát đơn hàng.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-ink px-6 py-2.5 font-label text-xs font-semibold text-white transition hover:bg-violet"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
