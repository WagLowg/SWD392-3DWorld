import { Landmark, Plus } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatVnd } from '../../../shared/lib/format'
import { inputClass } from '../../../shared/ui/form'
import { Btn, DetailLayout, Hero, MockNotice, MoneyRows, Pill, Section } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useBankAccounts } from '../../../features/account/hooks/useAccount'
import { useCreatePayout, useWallet } from '../hooks/useWallet'

const PRESETS = [500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000]

/** MP-100 · Tạo Yêu Cầu Rút Tiền — tài khoản ngân hàng lấy từ API thật, lệnh rút là dữ liệu mẫu. */
export function NewPayoutPage() {
  const uid = useId()
  const navigate = useNavigate()
  const banks = useBankAccounts()
  const wallet = useWallet()
  const create = useCreatePayout()
  const [bankId, setBankId] = useState<number>()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    document.title = 'Rút tiền về ngân hàng · 3DWorld'
  }, [])

  const accounts = (banks.data ?? []).filter((a) => a.isActive !== false)
  useEffect(() => {
    if (bankId === undefined && accounts.length) setBankId((accounts.find((a) => a.isDefault) ?? accounts[0]).id)
  }, [accounts, bankId])

  const available = wallet.data?.balances.available ?? 0
  const value = Number(amount) || 0
  const bank = accounts.find((a) => a.id === bankId)
  const error = value > available ? 'Vượt quá số dư khả dụng.' : value && value < 50_000 ? 'Tối thiểu 50.000₫.' : ''
  const ok = bank && value >= 50_000 && value <= available

  return (
    <>
      <MockNotice api="POST /api/payouts" />
      <Hero code="MP-100" eyebrow="Rút tiền mới" title="Yêu Cầu Rút Tiền Mới" accent="Chuyển Nhanh Về Tài Khoản Ngân Hàng." />
      <DetailLayout
        main={
          <>
            <Section title="Chọn tài khoản ngân hàng thụ hưởng" aside={<Pill tone="green">API thật</Pill>}>
              <QueryState isLoading={banks.isLoading} error={banks.error}>
                {accounts.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {accounts.map((a) => (
                      <label key={a.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl p-4 ${bankId === a.id ? 'bg-violet-soft/50 ring-2 ring-violet' : 'bg-surface-low'}`}>
                        <input type="radio" name="bank" checked={bankId === a.id} onChange={() => setBankId(a.id)} className="accent-violet" />
                        <Landmark size={18} className="text-violet" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{a.bankName}</span>
                          <span className="font-mono text-xs text-ink-soft">
                            {a.accountNumberMasked} · {a.accountHolder}
                          </span>
                        </span>
                        <Pill tone={a.verificationStatus === 'APPROVED' ? 'green' : 'orange'}>{a.verificationStatus}</Pill>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">Chưa có tài khoản ngân hàng.</p>
                )}
                <div className="mt-3">
                  <Btn href="/portal/bank-accounts" size="sm" icon={Plus}>
                    Thêm tài khoản ngân hàng
                  </Btn>
                </div>
              </QueryState>
            </Section>
            <Section title="Nhập số tiền rút">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button key={p} type="button" onClick={() => setAmount(String(p))} className={`rounded-full px-4 py-2 font-label text-sm font-semibold ${value === p ? 'bg-ink text-white' : 'bg-surface-low'}`}>
                    {formatVnd(p)}
                  </button>
                ))}
                <button type="button" onClick={() => setAmount(String(available))} className="rounded-full bg-peach px-4 py-2 font-label text-sm font-semibold text-orange-deep">
                  Toàn bộ ({formatVnd(available)})
                </button>
              </div>
              <label htmlFor={`${uid}-a`} className="mt-4 block">
                <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Số tiền muốn rút (không mất phí Napas)</span>
                <input id={`${uid}-a`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} className="h-14 w-full rounded-2xl bg-surface-low px-5 font-display text-2xl font-bold outline-none focus:ring-2 focus:ring-violet/40" />
              </label>
              {error && <p className="mt-1 text-xs text-danger">{error}</p>}
              <label htmlFor={`${uid}-n`} className="mt-4 block">
                <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Ghi chú / tham chiếu nội bộ</span>
                <input id={`${uid}-n`} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
              </label>
            </Section>
          </>
        }
        aside={
          <Section title="Bảng kê biến động dự kiến">
            <MoneyRows
              rows={[
                { label: 'Khả dụng hiện tại', value: formatVnd(available) },
                { label: 'Chuyển sang tạm giữ', value: `-${formatVnd(value)}`, tone: 'minus' },
              ]}
              total={{ label: 'Khả dụng sau lệnh', value: formatVnd(Math.max(0, available - value)) }}
            />
            {bank && bank.verificationStatus !== 'APPROVED' && (
              <p className="mt-3 rounded-2xl bg-peach/60 p-3 text-xs text-orange-deep">Tài khoản chưa được xác minh — lệnh có thể bị từ chối.</p>
            )}
            <div className="mt-4 grid gap-2">
              <Btn
                variant="primary"
                disabled={!ok || create.isPending}
                onClick={() =>
                  bank &&
                  create.mutate(
                    { bank: { name: bank.bankName, masked: bank.accountNumberMasked, holder: bank.accountHolder }, amount: value, note: note || undefined },
                    { onSuccess: (p) => navigate(`/wallet/payouts/${p.id}`) },
                  )
                }
              >
                Xác nhận rút {value ? formatVnd(value) : ''}
              </Btn>
              <Btn to="/wallet/payouts">Huỷ thao tác</Btn>
            </div>
          </Section>
        }
      />
    </>
  )
}
