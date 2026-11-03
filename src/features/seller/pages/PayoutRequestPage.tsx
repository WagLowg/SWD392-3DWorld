import { CheckCircle2, Landmark, ShieldCheck, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { formatVnd } from '../../../shared/lib/format'
import { inputClass } from '../../../shared/ui/form'
import { Btn, Hero, Section } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { useBankAccounts } from '../../account/hooks/useAccount'
import { useEarnings, useRequestPayout } from '../hooks/useSeller'

/** Yêu cầu chi tiền thật qua POST /api/users/me/payouts. */
export function PayoutRequestPage() {
  const wallet = useEarnings()
  const banks = useBankAccounts()
  const payout = useRequestPayout()
  
  // Lấy toàn bộ tài khoản ngân hàng còn hoạt động của seller
  const userBanks = useMemo(
    () => (banks.data ?? []).filter((bank) => bank.isActive !== false),
    [banks.data],
  )
  const [amount, setAmount] = useState('')
  const [bankAccountId, setBankAccountId] = useState(0)
  const [reason, setReason] = useState('Rút doanh thu bán hàng về tài khoản ngân hàng')

  useEffect(() => {
    document.title = 'Yêu cầu rút tiền · 3DWorld'
  }, [])

  useEffect(() => {
    if (!bankAccountId && userBanks.length > 0) {
      const defaultBank = userBanks.find((b) => b.isDefault) ?? userBanks[0]
      setBankAccountId(defaultBank.id)
    }
  }, [bankAccountId, userBanks])

  const available = wallet.data?.wallet.available ?? 0
  const minimumReserve = wallet.data?.wallet.minimumReserve ?? 100000
  const debt = wallet.data?.wallet.returnShippingDebt ?? 0
  const withdrawable = wallet.data?.wallet.withdrawable ?? (debt > 0 ? 0 : Math.max(0, available - minimumReserve))
  const value = Number(amount)
  const valid = value > 0 && value <= withdrawable && bankAccountId > 0 && reason.trim().length > 0 && debt <= 0

  if (payout.data) {
    return (
      <div className="flex flex-col items-center rounded-[2rem] bg-white/95 px-6 py-14 text-center shadow-soft">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-mint text-[#0f5132]"><CheckCircle2 size={36} /></span>
        <h1 className="mt-5 font-display text-3xl font-bold">Đã gửi yêu cầu rút tiền</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Mã giao dịch: #{payout.data.transactionId} · Số tiền rút: {formatVnd(payout.data.amount)}. Hệ thống đang tiến hành xử lý chuyển tiền về tài khoản ngân hàng của bạn trong vòng 24 giờ làm việc.
        </p>
        <div className="mt-6"><Btn to="/seller/revenue" variant="primary">Về doanh thu & ví</Btn></div>
      </div>
    )
  }

  return (
    <>
      <Hero
        code="WALLET"
        eyebrow="Ví người bán"
        title="Yêu Cầu Rút Tiền"
        accent="Chuyển Doanh Thu Về Ngân Hàng Đã Xác Minh."
        description="Khoản tiền yêu cầu rút sẽ được trừ từ số dư khả dụng và chuyển về tài khoản ngân hàng của bạn trong vòng 24 giờ làm việc."
      />
      <div className="mt-8">
        <QueryState isLoading={wallet.isLoading || banks.isLoading} error={wallet.error ?? banks.error}>
          {!userBanks.length ? (
            <StatusBlock
              tone="empty"
              title="Chưa có tài khoản ngân hàng nhận tiền"
              body="Vui lòng liên kết tài khoản ngân hàng của xưởng để thực hiện rút doanh thu về tài khoản."
              action={<Btn to="/bank-accounts" variant="primary">Quản lý tài khoản ngân hàng</Btn>}
            />
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
              <Section title="Thông tin yêu cầu">
                <div className="grid gap-4">
                  <label className="block">
                    <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Tài khoản nhận tiền</span>
                    <select value={bankAccountId} onChange={(e) => setBankAccountId(Number(e.target.value))} className={inputClass}>
                      {userBanks.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.bankName} · {bank.accountNumberMasked} · {bank.accountHolder}
                          {bank.isDefault ? ' (Mặc định)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <div className="mb-1.5 flex items-center justify-between font-label text-xs font-semibold text-ink-soft">
                      <span>Số tiền muốn rút</span>
                      <span className="text-teal font-medium">Hạn mức: {formatVnd(withdrawable)}</span>
                    </div>
                    <div className="relative">
                      <input
                        inputMode="numeric"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                        className={`${inputClass} pr-28 font-medium`}
                        placeholder={`Tối đa ${formatVnd(withdrawable)}`}
                      />
                      <button
                        type="button"
                        onClick={() => setAmount(String(withdrawable))}
                        disabled={withdrawable <= 0}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-teal/10 px-3 py-1.5 text-xs font-bold text-teal transition hover:bg-teal hover:text-white disabled:pointer-events-none disabled:opacity-40"
                      >
                        Rút toàn bộ
                      </button>
                    </div>
                    {value > 0 && value <= withdrawable && (
                      <p className="mt-1.5 text-xs text-ink-soft">
                        Số tiền rút định dạng: <strong className="text-ink">{formatVnd(value)}</strong> (giữ lại ký quỹ {formatVnd(minimumReserve)})
                      </p>
                    )}
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Lý do</span>
                    <textarea rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
                  </label>
                </div>
                {debt > 0 && (
                  <p className="mt-4 rounded-2xl bg-[#ffdad6] p-3 text-sm text-danger">
                    Cần thanh toán công nợ vận chuyển hoàn {formatVnd(debt)} trước khi rút tiền.
                  </p>
                )}
                {value > withdrawable && (
                  <p className="mt-2 text-sm text-danger">
                    {available - value < minimumReserve
                      ? `Quy định ký quỹ: Ví cần duy trì số dư tối thiểu ${formatVnd(minimumReserve)} để bảo đảm rủi ro hoàn đơn. Số tiền tối đa bạn có thể rút là ${formatVnd(withdrawable)}.`
                      : `Số tiền vượt quá hạn mức được phép rút (${formatVnd(withdrawable)}).`}
                  </p>
                )}
                {payout.error && <p className="mt-3 rounded-2xl bg-[#ffdad6] p-3 text-sm text-danger">{payout.error.message}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <Btn to="/seller/revenue">Huỷ</Btn>
                  <Btn
                    variant="primary"
                    icon={Wallet}
                    disabled={!valid || payout.isPending}
                    onClick={() => {
                      const sel = userBanks.find((b) => b.id === bankAccountId)
                      payout.mutate({
                        amount: value,
                        bankAccountId,
                        reason: reason.trim(),
                        bankInfo: sel ? `${sel.bankName} · ${sel.accountNumberMasked} · ${sel.accountHolder}` : undefined,
                      })
                    }}
                  >
                    Gửi yêu cầu rút tiền
                  </Btn>
                </div>
              </Section>
              <aside className="space-y-4">
                <Section title="Hạn mức rút tiền thực tế">
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-soft">Tổng số dư khả dụng:</span>
                      <span className="font-semibold text-ink">{formatVnd(available)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-violet">
                      <span className="flex items-center gap-1"><ShieldCheck size={13} /> Ký quỹ dự phòng tối thiểu:</span>
                      <span className="font-semibold">-{formatVnd(minimumReserve)}</span>
                    </div>
                    {debt > 0 && (
                      <div className="flex justify-between text-xs text-danger">
                        <span>Nợ cước hoàn trả:</span>
                        <span className="font-semibold">-{formatVnd(debt)}</span>
                      </div>
                    )}
                    <div className="border-t border-line/60 pt-2 flex justify-between items-baseline">
                      <span className="text-xs font-bold text-ink">Số tiền được rút:</span>
                      <span className="font-display text-2xl font-bold text-teal">{formatVnd(withdrawable)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
                    Hệ thống giữ lại {formatVnd(minimumReserve)} trong ví để dự phòng cấn trừ phí vận chuyển hai chiều khi có đơn hàng phát sinh khiếu nại hoàn tiền.
                  </p>
                </Section>
                <Section title="Chính sách & Điều kiện rút tiền">
                  <ul className="space-y-3 text-sm text-ink-soft">
                    <li className="flex gap-2">
                      <CheckCircle2 size={16} className="shrink-0 text-teal" />
                      <span><strong>Tài khoản ngân hàng:</strong> Đã liên kết và kích hoạt trong hồ sơ xưởng.</span>
                    </li>
                    <li className="flex gap-2">
                      <Landmark size={16} className="shrink-0 text-violet" />
                      <span><strong>Không có nợ cước:</strong> Không phát sinh công nợ cước vận chuyển hoàn đơn (Hiện tại: {formatVnd(debt)}).</span>
                    </li>
                    <li className="flex gap-2">
                      <ShieldCheck size={16} className="shrink-0 text-teal" />
                      <span><strong>Duy trì ký quỹ:</strong> Số dư ví sau khi rút tối thiểu {formatVnd(minimumReserve)}.</span>
                    </li>
                    <li className="flex gap-2">
                      <Wallet size={16} className="shrink-0 text-orange" />
                      <span><strong>Thời gian đối soát:</strong> Quản trị viên duyệt và giải ngân trong 24h làm việc.</span>
                    </li>
                  </ul>
                </Section>
              </aside>
            </div>
          )}
        </QueryState>
      </div>
    </>
  )
}
