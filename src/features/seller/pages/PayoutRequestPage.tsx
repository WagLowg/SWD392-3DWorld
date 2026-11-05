import { CheckCircle2, Clock, Landmark, Wallet, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatVnd } from '../../../shared/lib/format'
import { inputClass } from '../../../shared/ui/form'
import { Btn, Hero, Section } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { useBankAccounts } from '../../account/hooks/useAccount'
import { useEarnings, useRequestPayout } from '../hooks/useSeller'

function newPayoutKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Rút tiền tự động qua POST /api/users/me/payouts, không cần Admin phê duyệt. */
export function PayoutRequestPage() {
  const wallet = useEarnings()
  const banks = useBankAccounts()
  const payout = useRequestPayout()

  const payoutKey = useRef<string | null>(null)

  // Backend chỉ cho chuyển tiền vào tài khoản đang hoạt động và đã xác minh.
  const userBanks = useMemo(
    () =>
      (banks.data ?? []).filter(
        (bank) =>
          bank.isActive !== false && ['VERIFIED', 'APPROVED'].includes(bank.verificationStatus?.toUpperCase()),
      ),
    [banks.data],
  )
  const [amount, setAmount] = useState('')
  const [bankAccountId, setBankAccountId] = useState(0)
  const [reason, setReason] = useState('Rút doanh thu bán hàng về tài khoản ngân hàng')

  useEffect(() => {
    document.title = 'Rút tiền · 3DWorld'
  }, [])

  useEffect(() => {
    if (!bankAccountId && userBanks.length > 0) {
      const defaultBank = userBanks.find((b) => b.isDefault) ?? userBanks[0]
      setBankAccountId(defaultBank.id)
    }
  }, [bankAccountId, userBanks])

  const available = wallet.data?.wallet.available ?? 0
  const withdrawable = wallet.data?.wallet.withdrawable ?? available
  const value = Number(amount)
  const valid = value > 0 && value <= withdrawable && bankAccountId > 0 && reason.trim().length > 0

  if (payout.data) {
    const status = payout.data.status
    const completed = status === 'COMPLETED'
    const failed = status === 'FAILED'
    const ResultIcon = failed ? XCircle : completed ? CheckCircle2 : Clock

    return (
      <div className="flex flex-col items-center rounded-[2rem] bg-white/95 px-6 py-14 text-center shadow-soft">
        <span
          className={`grid h-20 w-20 place-items-center rounded-full ${
            failed ? 'bg-[#ffdad6] text-danger' : completed ? 'bg-mint text-[#0f5132]' : 'bg-amber-100 text-amber-800'
          }`}
        >
          <ResultIcon size={36} />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold">
          {failed ? 'Rút tiền không thành công' : completed ? 'Rút tiền thành công' : 'Đang chuyển tiền'}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Mã giao dịch: #{payout.data.transactionId} · Số tiền: {formatVnd(payout.data.amount)}.{' '}
          {failed
            ? 'Ngân hàng không nhận được giao dịch và số tiền đã được hoàn lại ví khả dụng.'
            : completed
              ? 'Tiền đã được chuyển tự động về tài khoản ngân hàng của bạn.'
              : 'Hệ thống đang tự động chuyển tiền về tài khoản ngân hàng, không cần phê duyệt thủ công.'}
        </p>
        {payout.data.transferReference && (
          <p className="mt-2 text-xs text-ink-soft">
            Mã đối soát: <code className="font-semibold text-ink">{payout.data.transferReference}</code>
          </p>
        )}
        <div className="mt-6"><Btn to="/seller/revenue" variant="primary">Về doanh thu & ví</Btn></div>
      </div>
    )
  }

  return (
    <>
      <Hero
        code="WALLET"
        eyebrow="Ví người bán"
        title="Rút Tiền Về Ngân Hàng"
        accent="Rút Trực Tiếp Từ Số Dư Khả Dụng."
        description="Tiền được trừ trực tiếp từ số dư khả dụng và tự động chuyển về tài khoản ngân hàng đã xác minh, không cần chờ phê duyệt."
      />
      <div className="mt-8">
        <QueryState isLoading={wallet.isLoading || banks.isLoading} error={wallet.error ?? banks.error}>
          {!userBanks.length ? (
            <StatusBlock
              tone="empty"
              title="Chưa có tài khoản ngân hàng đã xác minh"
              body="Vui lòng liên kết và xác minh tài khoản ngân hàng của xưởng trước khi rút doanh thu."
              action={<Btn to="/bank-accounts" variant="primary">Quản lý tài khoản ngân hàng</Btn>}
            />
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
              <Section title="Thông tin rút tiền">
                <div className="grid gap-4">
                  <label className="block">
                    <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Tài khoản nhận tiền</span>
                    <select
                      value={bankAccountId}
                      onChange={(e) => {
                        payoutKey.current = null
                        setBankAccountId(Number(e.target.value))
                      }}
                      className={inputClass}
                    >
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
                        onChange={(e) => {
                          payoutKey.current = null
                          setAmount(e.target.value.replace(/\D/g, ''))
                        }}
                        className={`${inputClass} pr-28 font-medium`}
                        placeholder={`Tối đa ${formatVnd(withdrawable)}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          payoutKey.current = null
                          setAmount(String(withdrawable))
                        }}
                        disabled={withdrawable <= 0}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-teal/10 px-3 py-1.5 text-xs font-bold text-teal transition hover:bg-teal hover:text-white disabled:pointer-events-none disabled:opacity-40"
                      >
                        Rút toàn bộ
                      </button>
                    </div>
                    {value > 0 && value <= withdrawable && (
                      <p className="mt-1.5 text-xs text-ink-soft">
                        Số tiền rút: <strong className="text-ink">{formatVnd(value)}</strong> · Số dư còn lại:{' '}
                        <strong className="text-ink">{formatVnd(Math.max(0, available - value))}</strong>
                      </p>
                    )}
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Lý do</span>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={reason}
                      onChange={(e) => {
                        payoutKey.current = null
                        setReason(e.target.value)
                      }}
                      className={inputClass}
                    />
                  </label>
                </div>
                {value > withdrawable && (
                  <p className="mt-2 text-sm text-danger">Số tiền vượt quá số dư khả dụng ({formatVnd(withdrawable)}).</p>
                )}
                {payout.error && <p className="mt-3 rounded-2xl bg-[#ffdad6] p-3 text-sm text-danger">{payout.error.message}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <Btn to="/seller/revenue">Huỷ</Btn>
                  <Btn
                    variant="primary"
                    icon={Wallet}
                    disabled={!valid || payout.isPending}
                    onClick={() => {
                      payoutKey.current ??= newPayoutKey()
                      payout.mutate({
                        amount: value,
                        bankAccountId,
                        reason: reason.trim(),
                        idempotencyKey: payoutKey.current,
                      })
                    }}
                  >
                    {payout.isPending ? 'Đang chuyển tiền...' : 'Rút tiền ngay'}
                  </Btn>
                </div>
              </Section>
              <aside className="space-y-4">
                <Section title="Số dư có thể rút">
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-soft">Tổng số dư khả dụng:</span>
                      <span className="font-semibold text-ink">{formatVnd(available)}</span>
                    </div>
                    <div className="border-t border-line/60 pt-2 flex justify-between items-baseline">
                      <span className="text-xs font-bold text-ink">Số tiền được rút:</span>
                      <span className="font-display text-2xl font-bold text-teal">{formatVnd(withdrawable)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
                    Bạn có thể rút toàn bộ số dư khả dụng. Tiền chờ mở khóa không được tính vào hạn mức này.
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
                      <span><strong>Hạn mức:</strong> Được rút tối đa toàn bộ số dư khả dụng hiện tại.</span>
                    </li>
                    <li className="flex gap-2">
                      <Wallet size={16} className="shrink-0 text-orange" />
                      <span><strong>Xử lý tự động:</strong> Không cần quản trị viên phê duyệt lệnh rút tiền.</span>
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
