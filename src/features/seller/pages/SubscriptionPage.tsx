import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Eye,
  Loader2,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDate, formatDateTime, formatVnd } from '../../../shared/lib/format'
import { Btn, DataTable, Hero, RuleBox, Section } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useToast } from '../../../shared/ui/toast'
import { type SubscriptionHistoryItem } from '../data/seller.fixtures'
import { sellerKeys, useRenew, useSubscription } from '../hooks/useSeller'
import { PAYMENT_STATUS } from '../lib/status'
import { sellerService } from '../services/seller.service'

export function SubscriptionPage() {
  const q = useSubscription()
  const renew = useRenew()
  const qc = useQueryClient()
  const toast = useToast()
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<SubscriptionHistoryItem | null>(null)
  const [checkingPayment, setCheckingPayment] = useState(false)

  const handleCheckPendingPayment = async () => {
    setCheckingPayment(true)
    try {
      const res = await sellerService.checkPendingSubscriptionPayment()
      if (res.success) {
        toast('Đã xác nhận thanh toán thành công từ ZaloPay! Gian hàng đã được kích hoạt.', 'success')
        await Promise.all([
          qc.invalidateQueries({ queryKey: sellerKeys.subscription }),
          qc.invalidateQueries({ queryKey: sellerKeys.storefront }),
          qc.invalidateQueries({ queryKey: ['auth', 'session'] }),
        ])
      } else {
        toast(res.message, 'error')
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Không thể kiểm tra giao dịch với ZaloPay.', 'error')
    } finally {
      setCheckingPayment(false)
    }
  }

  useEffect(() => {
    document.title = 'Gói đăng ký gian hàng · 3DWorld'
  }, [])

  return (
    <>
      <Hero
        eyebrow="Kênh người bán"
        title="Gói Đăng Ký Gian Hàng Chế Tác"
        accent="Kích hoạt gian hàng & Duy trì quyền kinh doanh trên sàn."
        description="Gói dịch vụ duy trì quyền mở bán, quản lý sản phẩm và vận hành xưởng chế tác 3D trên sàn thương mại điện tử 3DWorld."
      />

      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data &&
          (() => {
            const { subscription: s, monthlyFee, hasPendingPayment } = q.data
            const hasSubscribed = s.hasSubscribed ?? Boolean(s.expiresAt)
            const daysLeft = s.expiresAt ? Math.ceil((Date.parse(s.expiresAt) - Date.now()) / 86_400_000) : 0
            const isInactive = s.status === 'INACTIVE' || !hasSubscribed
            const isExpired = s.status === 'EXPIRED'
            const isExpiring = s.status === 'EXPIRING'
            const isActive = s.status === 'ACTIVE'

            return (
              <>
                {/* Banner trạng thái gói hiện tại */}
                <section
                  className={`mt-8 grid gap-4 rounded-[2rem] p-6 text-white shadow-lift sm:grid-cols-[1fr_auto] sm:p-8 ${
                    isInactive
                      ? 'bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca]'
                      : isExpired
                        ? 'bg-gradient-to-br from-[#450a0a] via-[#7f1d1d] to-[#991b1b]'
                        : isExpiring
                          ? 'bg-gradient-to-br from-[#451a03] via-[#78350f] to-[#b45309]'
                          : 'bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e]'
                  }`}
                >
                  <div>
                    <p className="flex items-center gap-2 font-label text-xs uppercase tracking-widest text-white/80">
                      {isInactive ? (
                        <>
                          <Sparkles size={15} className="text-amber-300" /> Trạng thái gian hàng
                        </>
                      ) : (
                        <>
                          <Crown size={15} className="text-amber-300" /> Hồ sơ gói dịch vụ
                        </>
                      )}
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                      {isInactive
                        ? 'Chưa kích hoạt gói gian hàng'
                        : isExpired
                          ? 'Gói gian hàng đã hết hạn'
                          : isExpiring
                            ? 'Gói gian hàng sắp hết hạn'
                            : 'Gói gian hàng đang hoạt động'}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">
                      {isInactive ? (
                        'Hồ sơ xưởng của bạn đã được kiểm duyệt hợp lệ! Hãy kích hoạt gói để mở gian hàng, bắt đầu đăng bán sản phẩm và tiếp cận khách hàng trên 3DWorld.'
                      ) : isExpired ? (
                        <>
                          Đã hết hạn vào ngày <strong>{s.expiresAt ? formatDate(s.expiresAt) : '—'}</strong>. Các sản
                          phẩm đang tạm ẩn khỏi sàn mua sắm. Hãy gia hạn để mở lại gian hàng.
                        </>
                      ) : isExpiring ? (
                        <>
                          Hạn dùng đến <strong>{s.expiresAt ? formatDate(s.expiresAt) : '—'}</strong> · Chỉ còn{' '}
                          <strong>{daysLeft} ngày</strong>. Hãy gia hạn sớm để không bị gián đoạn hoạt động kinh doanh.
                        </>
                      ) : (
                        <>
                          Thời hạn sử dụng đến <strong>{s.expiresAt ? formatDate(s.expiresAt) : '—'}</strong> · Còn{' '}
                          <strong>{daysLeft} ngày</strong> sử dụng.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="self-center">
                    {isInactive ? (
                      <span className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/40 bg-amber-400/20 px-4 py-2 font-label text-xs font-bold text-amber-200 backdrop-blur-sm shadow-sm">
                        <Clock size={14} className="text-amber-300" />
                        Chưa kích hoạt gói
                      </span>
                    ) : isExpired ? (
                      <span className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/40 bg-rose-500/20 px-4 py-2 font-label text-xs font-bold text-rose-200 backdrop-blur-sm shadow-sm">
                        <AlertTriangle size={14} className="text-rose-300" />
                        Đã hết hạn
                      </span>
                    ) : isExpiring ? (
                      <span className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/20 px-4 py-2 font-label text-xs font-bold text-amber-200 backdrop-blur-sm shadow-sm">
                        <Clock size={14} className="text-amber-300" />
                        Sắp hết hạn
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 font-label text-xs font-bold text-emerald-200 backdrop-blur-sm shadow-sm">
                        <CheckCircle2 size={14} className="text-emerald-300" />
                        Đang hoạt động
                      </span>
                    )}
                  </div>
                </section>

                {/* Chi tiết gói và quyền lợi */}
                <Section title="Chi tiết gói dịch vụ gian hàng" className="mt-6">
                  <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
                    <div>
                      <div className="flex items-center gap-2 text-violet">
                        <Store size={18} />
                        <span className="font-label text-xs font-bold uppercase tracking-widest">
                          Gói dịch vụ người bán tiêu chuẩn
                        </span>
                      </div>
                      <p className="mt-3 font-display text-3xl font-bold text-ink">
                        {formatVnd(monthlyFee)}{' '}
                        <span className="text-sm font-normal text-ink-soft">/ 30 ngày sử dụng</span>
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-ink-soft">
                        <li className="flex items-center gap-2.5">
                          <CheckCircle2 size={16} className="shrink-0 text-[#0f7050]" />
                          <span>Mở quyền đăng bán không giới hạn mô hình & sản phẩm in 3D trên sàn</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <CheckCircle2 size={16} className="shrink-0 text-[#0f7050]" />
                          <span>Tự động liên kết vận đơn, đối soát phí vận chuyển qua đối tác GHTK</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <CheckCircle2 size={16} className="shrink-0 text-[#0f7050]" />
                          <span>Tiếp nhận đơn đặt hàng in 3D và gia công theo yêu cầu từ khách hàng</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <CheckCircle2 size={16} className="shrink-0 text-[#0f7050]" />
                          <span>Quản lý dòng tiền ví doanh thu và tự động giải ngân sau 72h hoàn tất đơn</span>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-line bg-surface-low p-5 text-sm text-ink-soft">
                      <div className="flex items-start gap-3">
                        <CalendarDays size={20} className="mt-0.5 shrink-0 text-orange" />
                        <div>
                          <p className="font-bold text-ink">Thanh toán linh hoạt từng tháng</p>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            Không tự động gia hạn nếu bạn chưa yêu cầu — hoàn toàn chủ động chi phí.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 border-t border-line/60 pt-3">
                        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-violet" />
                        <div>
                          <p className="font-bold text-ink">Bảo toàn dữ liệu gian hàng</p>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            Khi gói hết hạn, sản phẩm chỉ tạm ẩn chứ không bị xóa; bạn có thể gia hạn lại bất kỳ lúc nào.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Section>

                {/* Khu vực hành động: Mua gói ngay hoặc Gia hạn */}
                <Section
                  title={
                    isInactive
                      ? 'Kích hoạt gói gian hàng'
                      : isExpired
                        ? 'Gia hạn lại gian hàng'
                        : 'Gia hạn sớm (+30 ngày)'
                  }
                  className="mt-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="max-w-2xl text-sm text-ink-soft">
                      {isInactive ? (
                        <>
                          Thanh toán phí duy trì gian hàng <strong className="text-ink">{formatVnd(monthlyFee)}</strong>{' '}
                          qua ví điện tử ZaloPay để chính thức mở gian hàng và bắt đầu bán sản phẩm.
                        </>
                      ) : isExpired ? (
                        <>
                          Thanh toán gia hạn <strong className="text-ink">{formatVnd(monthlyFee)}</strong> để mở lại
                          gian hàng thêm 30 ngày và tiếp tục đón nhận đơn hàng mới.
                        </>
                      ) : (
                        <>
                          Gia hạn sớm cộng thêm <strong className="text-ink">30 ngày</strong> vào hạn dùng hiện tại của
                          gian hàng sau khi xác nhận thanh toán qua ZaloPay thành công.
                        </>
                      )}
                    </p>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {hasPendingPayment && (
                        <button
                          type="button"
                          disabled={checkingPayment}
                          onClick={handleCheckPendingPayment}
                          className="inline-flex items-center gap-2 rounded-2xl border border-violet/30 bg-violet/10 px-4 py-2.5 font-label text-sm font-semibold text-violet shadow-xs transition hover:bg-violet/20 disabled:opacity-50"
                        >
                          {checkingPayment ? (
                            <>
                              <Loader2 size={16} className="animate-spin text-violet" />
                              <span>Đang kiểm tra với ZaloPay…</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw size={15} className="text-violet" />
                              <span>Kiểm tra giao dịch đang chờ</span>
                            </>
                          )}
                        </button>
                      )}
                      <Btn
                        variant="primary"
                        icon={CreditCard}
                        disabled={renew.isPending || monthlyFee <= 0}
                        onClick={() => renew.mutate()}
                      >
                        {renew.isPending
                          ? 'Đang chuyển sang ZaloPay…'
                          : isInactive
                            ? `Kích hoạt gói ngay (${formatVnd(monthlyFee)})`
                            : isExpired
                              ? `Gia hạn lại (${formatVnd(monthlyFee)})`
                              : `Gia hạn gói (${formatVnd(monthlyFee)})`}
                      </Btn>
                    </div>
                  </div>
                </Section>

                {/* Lịch sử thanh toán gói */}
                <h2 className="mt-8 font-display text-xl font-bold text-ink">Lịch sử thanh toán gói dịch vụ</h2>
                {s.history.length === 0 ? (
                  <div className="mt-3 rounded-3xl border border-line bg-white p-8 text-center text-sm text-ink-soft shadow-sm">
                    <Receipt size={36} className="mx-auto mb-2 text-ink-soft/40" />
                    <p className="font-bold text-ink">Chưa có giao dịch thanh toán gói nào</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Sau khi bạn kích hoạt gói mở gian hàng, các kỳ thanh toán và mã hóa đơn đối soát sẽ được lưu vết đầy
                      đủ tại đây.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
                    <DataTable
                      rows={s.history}
                      rowKey={(r) => r.txnId}
                      columns={[
                        { key: 'p', header: 'Kỳ sử dụng', render: (r) => r.period },
                        { key: 't', header: 'Mã giao dịch', render: (r) => <code className="text-xs font-mono font-bold text-ink">{r.txnId}</code> },
                        { key: 'a', header: 'Số tiền', render: (r) => <strong className="text-ink">{formatVnd(r.amount)}</strong> },
                        {
                          key: 's',
                          header: 'Trạng thái',
                          render: (r) => {
                            const meta = PAYMENT_STATUS[r.status]
                            const isPending = r.status === 'PENDING'
                            const isSucceeded = r.status === 'SUCCEEDED'
                            return (
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  isSucceeded
                                    ? 'bg-mint text-[#0f5132]'
                                    : isPending
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-danger'
                                }`}
                              >
                                {isSucceeded ? (
                                  <CheckCircle2 size={12} />
                                ) : isPending ? (
                                  <Clock size={12} />
                                ) : (
                                  <XCircle size={12} />
                                )}
                                <span>{meta?.label ?? r.status}</span>
                              </span>
                            )
                          },
                        },
                        {
                          key: 'd',
                          header: 'Thời gian',
                          render: (r) => (r.status === 'PENDING' ? 'Đang chờ xử lý' : r.paidAt ? formatDateTime(r.paidAt) : 'Chưa ghi nhận'),
                        },
                        {
                          key: 'action',
                          header: 'Thao tác',
                          render: (r) => (
                            <button
                              type="button"
                              onClick={() => setSelectedHistoryItem(r)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 font-label text-xs font-bold text-ink transition hover:border-violet hover:text-violet shadow-xs"
                            >
                              <Eye size={13} />
                              Xem chi tiết
                            </button>
                          ),
                        },
                      ]}
                    />
                  </div>
                )}

                {/* Cam kết minh bạch quyền lợi */}
                <RuleBox
                  title="Chính sách & Cam kết quyền lợi người bán"
                  rules={[
                    'Chủ động thanh toán: Hệ thống không tự động trừ tiền ngầm; bạn hoàn toàn chủ động thanh toán khi muốn duy trì hoặc gia hạn gian hàng.',
                    'Bảo toàn dữ liệu: Khi hết hạn gói, toàn bộ thông tin xưởng, danh mục sản phẩm và đánh giá vẫn được lưu trữ an toàn để bạn kích hoạt lại bất kỳ lúc nào.',
                    'Kích hoạt tức thì: Ngay sau khi bạn hoàn tất thanh toán qua ZaloPay thành công, gian hàng sẽ tự động được mở quyền bán ngay lập tức.',
                    'Minh bạch chi phí: Mức phí dịch vụ được niêm yết rõ ràng và áp dụng đồng nhất, không phát sinh bất kỳ khoản phụ phí ẩn nào.',
                  ]}
                />

                {/* Modal Chi tiết giao dịch thanh toán gói */}
                {selectedHistoryItem && (
                  <SubscriptionDetailModal
                    item={selectedHistoryItem}
                    monthlyFee={monthlyFee}
                    onClose={() => setSelectedHistoryItem(null)}
                    onPayNow={() => {
                      setSelectedHistoryItem(null)
                      renew.mutate()
                    }}
                    onCheckPayment={handleCheckPendingPayment}
                    isPaying={renew.isPending}
                    isChecking={checkingPayment}
                  />
                )}
              </>
            )
          })()}
      </QueryState>
    </>
  )
}

/** Modal hiển thị chi tiết giao dịch thanh toán gói thuê bao */
function SubscriptionDetailModal({
  item,
  monthlyFee,
  onClose,
  onPayNow,
  onCheckPayment,
  isPaying,
  isChecking,
}: {
  item: SubscriptionHistoryItem
  monthlyFee: number
  onClose: () => void
  onPayNow: () => void
  onCheckPayment?: () => void
  isPaying: boolean
  isChecking?: boolean
}) {
  const isPending = item.status === 'PENDING'
  const isSucceeded = item.status === 'SUCCEEDED'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-line sm:p-7 animate-scale-up">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-surface-low text-ink-soft hover:bg-surface-high hover:text-ink transition"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-soft text-violet shadow-sm">
            <Receipt size={22} />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-ink">Chi tiết giao dịch thanh toán gói</h3>
            <p className="text-xs text-ink-soft font-mono font-bold mt-0.5">{item.txnId}</p>
          </div>
        </div>

        {/* Thông tin giao dịch */}
        <div className="mt-5 space-y-4 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface-low p-3.5 border border-line/60">
              <span className="font-semibold text-ink-soft block mb-1">Gói dịch vụ</span>
              <span className="font-bold text-sm text-ink block">Thuê gian hàng theo tháng</span>
              <span className="text-[11px] text-ink-soft">Thời lượng 30 ngày sử dụng</span>
            </div>

            <div className="rounded-2xl bg-surface-low p-3.5 border border-line/60">
              <span className="font-semibold text-ink-soft block mb-1">Số tiền thanh toán</span>
              <span className="font-display font-bold text-base text-violet block">{formatVnd(item.amount || monthlyFee)}</span>
              <span className="text-[11px] text-ink-soft">Phương thức: Ví điện tử ZaloPay</span>
            </div>
          </div>

          <div className="rounded-2xl bg-surface-low p-3.5 border border-line/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink-soft">Trạng thái giao dịch:</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                  isSucceeded
                    ? 'bg-mint text-[#0f5132]'
                    : isPending
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-danger'
                }`}
              >
                {isSucceeded ? (
                  <CheckCircle2 size={12} />
                ) : isPending ? (
                  <Clock size={12} />
                ) : (
                  <XCircle size={12} />
                )}
                <span>{PAYMENT_STATUS[item.status]?.label ?? item.status}</span>
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-line/50 pt-2">
              <span className="font-semibold text-ink-soft">Kỳ áp dụng:</span>
              <span className="font-bold text-ink">{item.period}</span>
            </div>

            <div className="flex items-center justify-between border-t border-line/50 pt-2">
              <span className="font-semibold text-ink-soft">Thời điểm ghi nhận:</span>
              <span className="text-ink-soft">
                {item.paidAt ? formatDateTime(item.paidAt) : 'Đang chờ xác nhận từ ZaloPay'}
              </span>
            </div>
          </div>

          {/* Khối giải thích nếu đang ở trạng thái PENDING */}
          {isPending && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2 text-amber-900">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Clock size={15} className="text-amber-700 shrink-0" />
                <span>Vì sao giao dịch vẫn ở trạng thái "Đang xử lý"?</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Khi bạn bấm mở ZaloPay nhưng hủy hoặc đóng tab, cổng thanh toán ZaloPay duy trì phiên giao dịch tối đa{' '}
                <strong>15 phút</strong> trước khi tự động đánh dấu hết hạn.
              </p>
              <p className="text-[11px] leading-relaxed text-amber-900 font-semibold">
                👉 Bạn <strong>không cần phải chờ 15 phút</strong>! Bạn có thể bấm nút <strong>"Thanh toán lại ngay"</strong> bên dưới để tạo phiên ZaloPay mới và kích hoạt gian hàng tức thì.
              </p>
            </div>
          )}

          {isSucceeded && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-[#065f46] flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#059669] shrink-0" />
              <span>Giao dịch đã được xác nhận thanh toán thành công. Gian hàng của bạn đang có hiệu lực.</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-line/60 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-line bg-white px-4 py-2 font-label text-xs font-semibold text-ink hover:bg-surface-low transition"
          >
            Đóng
          </button>

          {isPending && (
            <>
              {onCheckPayment && (
                <button
                  type="button"
                  disabled={isChecking}
                  onClick={onCheckPayment}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-violet/30 bg-violet/10 px-4 py-2 font-label text-xs font-bold text-violet hover:bg-violet/20 transition disabled:opacity-50"
                >
                  {isChecking ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Đang kiểm tra…</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      <span>Kiểm tra kết quả ZaloPay</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                disabled={isPaying}
                onClick={onPayNow}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet to-[#8069f3] px-4 py-2 font-label text-xs font-bold text-white shadow-lift hover:opacity-95 transition disabled:opacity-50"
              >
                <CreditCard size={14} />
                {isPaying ? 'Đang chuyển sang ZaloPay…' : `Thanh toán lại ngay (${formatVnd(monthlyFee)})`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
