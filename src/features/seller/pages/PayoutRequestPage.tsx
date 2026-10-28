import { CheckCircle2, Landmark, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { formatVnd } from '../../../shared/format'
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
  const verified = useMemo(
    () => (banks.data ?? []).filter((bank) => bank.isActive && ['VERIFIED', 'APPROVED'].includes(bank.verificationStatus.toUpperCase())),
    [banks.data],
  )
  const [amount, setAmount] = useState('')
  const [bankAccountId, setBankAccountId] = useState(0)
  const [reason, setReason] = useState('Rút doanh thu bán hàng về tài khoản ngân hàng')

  useEffect(() => {
    document.title = 'Yêu cầu rút tiền · 3DWorld'
  }, [])
  useEffect(() => {
    if (!bankAccountId && verified[0]) setBankAccountId(verified[0].id)
  }, [bankAccountId, verified])

  const available = wallet.data?.wallet.available ?? 0
  const debt = wallet.data?.wallet.returnShippingDebt ?? 0
  const value = Number(amount)
  const valid = value > 0 && value <= available && bankAccountId > 0 && reason.trim().length > 0 && debt <= 0

  if (payout.data) {
    return (
      <div className="flex flex-col items-center rounded-[2rem] bg-white/95 px-6 py-14 text-center shadow-soft">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-mint text-[#0f5132]"><CheckCircle2 size={36} /></span>
        <h1 className="mt-5 font-display text-3xl font-bold">Đã gửi yêu cầu rút tiền</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Giao dịch #{payout.data.transactionId} · {formatVnd(payout.data.amount)} · trạng thái {payout.data.status}. Quản trị viên sẽ đối soát và chuyển khoản thủ công.
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
        description="Số tiền được chuyển sang trạng thái tạm giữ ngay khi gửi yêu cầu và chỉ được trừ sau khi quản trị viên duyệt chuyển khoản."
      />
      <div className="mt-8">
        <QueryState isLoading={wallet.isLoading || banks.isLoading} error={wallet.error ?? banks.error}>
          {!verified.length ? (
            <StatusBlock
              tone="empty"
              title="Chưa có tài khoản ngân hàng đã xác minh"
              body="Backend chỉ cho phép rút tiền về tài khoản đang hoạt động có trạng thái VERIFIED."
              action={<Btn to="/bank-accounts" variant="primary">Quản lý tài khoản ngân hàng</Btn>}
            />
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
              <Section title="Thông tin yêu cầu">
                <div className="grid gap-4">
                  <label className="block">
                    <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Tài khoản nhận tiền</span>
                    <select value={bankAccountId} onChange={(e) => setBankAccountId(Number(e.target.value))} className={inputClass}>
                      {verified.map((bank) => (
                        <option key={bank.id} value={bank.id}>{bank.bankName} · {bank.accountNumberMasked} · {bank.accountHolder}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Số tiền muốn rút</span>
                    <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} className={inputClass} placeholder={`Tối đa ${formatVnd(available)}`} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Lý do</span>
                    <textarea rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
                  </label>
                </div>
                {debt > 0 && <p className="mt-4 rounded-2xl bg-[#ffdad6] p-3 text-sm text-danger">Cần thanh toán công nợ vận chuyển hoàn {formatVnd(debt)} trước khi rút tiền.</p>}
                {value > available && <p className="mt-2 text-sm text-danger">Số tiền vượt quá số dư khả dụng.</p>}
                {payout.error && <p className="mt-3 rounded-2xl bg-[#ffdad6] p-3 text-sm text-danger">{payout.error.message}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <Btn to="/seller/revenue">Huỷ</Btn>
                  <Btn variant="primary" icon={Wallet} disabled={!valid || payout.isPending} onClick={() => payout.mutate({ amount: value, bankAccountId, reason: reason.trim() })}>
                    Gửi yêu cầu rút tiền
                  </Btn>
                </div>
              </Section>
              <aside className="space-y-4">
                <Section title="Số dư ví">
                  <p className="font-display text-3xl font-bold text-teal">{formatVnd(available)}</p>
                  <p className="mt-1 text-xs text-ink-soft">Khả dụng để yêu cầu chi trả</p>
                </Section>
                <Section title="Điều kiện backend">
                  <ul className="space-y-3 text-sm text-ink-soft">
                    <li className="flex gap-2"><CheckCircle2 size={16} className="shrink-0 text-teal" /> Tài khoản ngân hàng VERIFIED và còn hoạt động.</li>
                    <li className="flex gap-2"><Landmark size={16} className="shrink-0 text-violet" /> Không có công nợ vận chuyển hoàn.</li>
                    <li className="flex gap-2"><Wallet size={16} className="shrink-0 text-orange" /> Số tiền không vượt số dư khả dụng.</li>
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
