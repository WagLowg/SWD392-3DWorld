import { CalendarDays, CreditCard, Crown, Server } from 'lucide-react'
import { useEffect } from 'react'
import { formatDate, formatDateTime, formatVnd } from '../../../shared/lib/format'
import { Btn, DataTable, Hero, RuleBox, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useRenew, useSubscription } from '../hooks/useSeller'
import { PAYMENT_STATUS, STOREFRONT_STATUS } from '../lib/status'

/** MP 039 · Gói Đăng Ký Xưởng */
export function SubscriptionPage() {
  const q = useSubscription()
  const renew = useRenew()

  useEffect(() => {
    document.title = 'Gói đăng ký xưởng · 3DWorld'
  }, [])

  return (
    <>
      <Hero
        code="MP 039"
        eyebrow="Thuê bao xưởng"
        title="Gói Đăng Ký Xưởng Chế Tác"
        accent="Duy Trì Quyền Bán & Vận Hành Gian Hàng."
        description="Gói thuê bao quyết định phí hoa hồng và quyền lợi của gian hàng. Gian hàng hết hạn sẽ tạm ẩn khỏi Chợ Đồ Chơi."
      />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data &&
          (() => {
            const { subscription: s, monthlyFee, hasPendingPayment } = q.data
            const daysLeft = Math.ceil((Date.parse(s.expiresAt) - Date.now()) / 86_400_000)
            return (
              <>
                <section className="mt-8 grid gap-4 rounded-[2rem] bg-gradient-to-br from-ink to-[#3a2f7a] p-6 text-white shadow-lift sm:grid-cols-[1fr_auto] sm:p-8">
                  <div>
                    <p className="flex items-center gap-2 font-label text-xs uppercase tracking-widest text-white/70">
                      <Crown size={14} /> Hồ sơ thuê bao hiện tại
                    </p>
                    <p className="mt-2 font-display text-3xl font-bold">Thuê gian hàng theo tháng</p>
                    <p className="mt-1 text-sm text-white/80">
                      Hết hạn {formatDate(s.expiresAt)} · {daysLeft > 0 ? `còn ${daysLeft} ngày` : 'đã hết hạn / chưa kích hoạt'}
                    </p>
                  </div>
                  <div className="self-center">
                    <StatusPill status={s.status} map={STOREFRONT_STATUS} />
                  </div>
                </section>

                <Section title="Gói đang được hệ thống áp dụng" className="mt-6">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex items-center gap-2 text-violet"><Server size={18} /><span className="font-label text-xs font-bold uppercase tracking-widest">Dữ liệu trực tiếp từ backend</span></div>
                      <p className="mt-3 font-display text-3xl font-bold">{formatVnd(monthlyFee)} <span className="text-sm font-normal text-ink-soft">/ 30 ngày</span></p>
                      <p className="mt-2 max-w-2xl text-sm text-ink-soft">Backend tạo một kỳ thuê bao chờ thanh toán. Gian hàng chỉ được kích hoạt hoặc gia hạn sau khi ZaloPay xác minh giao dịch thành công.</p>
                    </div>
                    <div className="rounded-2xl bg-surface-low px-4 py-3 text-sm text-ink-soft"><CalendarDays size={18} className="mb-2 text-orange" />Không tự động gia hạn<br />Không có gói giả trên frontend</div>
                  </div>
                </Section>

                <Section title="Gia hạn sớm (+1 tháng)" className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-sm text-ink-soft">
                      Thanh toán <strong className="text-ink">gói tháng do backend cấu hình</strong> — cộng thêm 30 ngày sau khi ZaloPay xác nhận giao dịch.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {hasPendingPayment && (
                        <Btn href="/marketplace/payment/result?type=subscription" variant="white">
                          Kiểm tra thanh toán đang chờ
                        </Btn>
                      )}
                      <Btn variant="primary" icon={CreditCard} disabled={renew.isPending || monthlyFee <= 0} onClick={() => renew.mutate()}>
                        Thanh toán ({formatVnd(monthlyFee)})
                      </Btn>
                    </div>
                  </div>
                </Section>

                <h2 className="mt-8 font-display text-xl font-bold">Kỳ thuê bao gần nhất</h2>
                <DataTable
                  rows={s.history}
                  rowKey={(r) => r.txnId}
                  columns={[
                    { key: 'p', header: 'Kỳ sử dụng', render: (r) => r.period },
                    { key: 't', header: 'Mã giao dịch', render: (r) => <code className="text-xs">{r.txnId}</code> },
                    { key: 'a', header: 'Số tiền', render: (r) => <strong>{formatVnd(r.amount)}</strong> },
                    { key: 's', header: 'Trạng thái', render: (r) => <StatusPill status={r.status} map={PAYMENT_STATUS} /> },
                    {
                      key: 'd',
                      header: 'Ngày thanh toán',
                      render: (r) => (r.status === 'PENDING' ? 'Chưa thanh toán' : formatDateTime(r.paidAt)),
                    },
                  ]}
                />
                <RuleBox
                  title="Cam kết không trừ tiền ngầm"
                  rules={[
                    'Không tự động gia hạn nếu bạn chưa bật — gian hàng chỉ tạm ẩn khi hết hạn, không xoá sản phẩm.',
                    'Mức phí hiển thị được đọc từ cấu hình nền tảng của backend.',
                    'Frontend không tự kích hoạt gian hàng; chỉ callback/query đã xác minh từ ZaloPay mới có quyền kích hoạt.',
                    'Gói bị đình chỉ do vi phạm không được hoàn phí thuê bao.',
                  ]}
                />
              </>
            )
          })()}
      </QueryState>
    </>
  )
}
