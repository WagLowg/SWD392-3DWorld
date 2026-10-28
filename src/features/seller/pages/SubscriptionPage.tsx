import { Check, CreditCard, Crown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDate, formatDateTime, formatVnd } from '../../../shared/lib/format'
import { Btn, DataTable, Hero, RuleBox, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useRenew, useSubscription } from '../hooks/useSeller'
import { PAYMENT_STATUS, STOREFRONT_STATUS } from '../lib/status'

/** MP 039 · Gói Đăng Ký Xưởng */
export function SubscriptionPage() {
  const q = useSubscription()
  const renew = useRenew()
  const [selected, setSelected] = useState<string>()

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
            const { subscription: s, plans } = q.data
            const current = plans.find((p) => p.id === s.planId)
            const plan = plans.find((p) => p.id === (selected ?? s.planId)) ?? plans[0]
            const daysLeft = Math.ceil((Date.parse(s.expiresAt) - Date.now()) / 86_400_000)
            return (
              <>
                <section className="mt-8 grid gap-4 rounded-[2rem] bg-gradient-to-br from-ink to-[#3a2f7a] p-6 text-white shadow-lift sm:grid-cols-[1fr_auto] sm:p-8">
                  <div>
                    <p className="flex items-center gap-2 font-label text-xs uppercase tracking-widest text-white/70">
                      <Crown size={14} /> Hồ sơ thuê bao hiện tại
                    </p>
                    <p className="mt-2 font-display text-3xl font-bold">{current?.name}</p>
                    <p className="mt-1 text-sm text-white/80">
                      Hết hạn {formatDate(s.expiresAt)} · {daysLeft > 0 ? `còn ${daysLeft} ngày` : 'đã hết hạn / chưa kích hoạt'}
                      {current?.commission !== undefined && ` · phí sàn ${current.commission}%`}
                    </p>
                  </div>
                  <div className="self-center">
                    <StatusPill status={s.status} map={STOREFRONT_STATUS} />
                  </div>
                </section>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {plans.map((p) => {
                    const active = plan.id === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelected(p.id)}
                        aria-pressed={active}
                        className={`rounded-[2rem] bg-white/95 p-6 text-left shadow-soft transition ${active ? 'ring-2 ring-orange' : 'hover:-translate-y-0.5'}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-display text-xl font-bold">{p.name}</p>
                          {p.highlight && <span className="rounded-full bg-orange px-2.5 py-1 font-label text-[10px] font-semibold text-white">Phổ biến</span>}
                        </div>
                        <p className="mt-3 font-display text-3xl font-bold">
                          {formatVnd(p.price)}
                          <span className="text-sm font-normal text-ink-soft"> / {p.period}</span>
                        </p>
                        {p.commission !== undefined && <p className="mt-1 text-sm text-violet">Phí hoa hồng {p.commission}%</p>}
                        <ul className="mt-4 space-y-1.5 text-sm">
                          {p.perks.map((perk) => (
                            <li key={perk} className="flex items-center gap-2">
                              <Check size={14} className="text-teal" /> {perk}
                            </li>
                          ))}
                        </ul>
                      </button>
                    )
                  })}
                </div>

                <Section title="Gia hạn sớm (+1 tháng)" className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-sm text-ink-soft">
                      Gia hạn <strong className="text-ink">{plan.name}</strong> — cộng thêm 1 tháng lịch sau khi ZaloPay xác nhận thanh toán.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {s.history.some((h) => h.status === 'PENDING') && (
                        <Btn href="/marketplace/payment/result?type=subscription" variant="white">
                          Kiểm tra thanh toán đang chờ
                        </Btn>
                      )}
                      <Btn variant="primary" icon={CreditCard} disabled={renew.isPending} onClick={() => renew.mutate(plan.id)}>
                        Thanh toán gia hạn ({formatVnd(plan.price)})
                      </Btn>
                    </div>
                  </div>
                </Section>

                <h2 className="mt-8 font-display text-xl font-bold">Lịch sử thanh toán gói thuê bao</h2>
                <DataTable
                  rows={s.history}
                  rowKey={(r) => r.txnId}
                  columns={[
                    { key: 'p', header: 'Kỳ sử dụng', render: (r) => r.period },
                    { key: 't', header: 'Mã giao dịch', render: (r) => <code className="text-xs">{r.txnId}</code> },
                    { key: 'a', header: 'Số tiền', render: (r) => <strong>{formatVnd(r.amount)}</strong> },
                    { key: 's', header: 'Trạng thái', render: (r) => <StatusPill status={r.status} map={PAYMENT_STATUS} /> },
                    { key: 'd', header: 'Ngày thanh toán', render: (r) => formatDateTime(r.paidAt) },
                  ]}
                />
                <RuleBox
                  title="Cam kết không trừ tiền ngầm"
                  rules={[
                    'Không tự động gia hạn nếu bạn chưa bật — gian hàng chỉ tạm ẩn khi hết hạn, không xoá sản phẩm.',
                    'Phí hoa hồng áp dụng theo gói tại thời điểm đơn được thanh toán.',
                    'Biên lai VAT xuất cho mỗi kỳ thanh toán thành công.',
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
