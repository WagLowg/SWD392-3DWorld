import { CreditCard, ExternalLink, QrCode, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ApiClientError } from '../../../services/http'
import { formatVnd } from '../../../shared/format'
import { useSession } from '../../../shared/session/useSession'
import { FormError } from '../../../shared/ui/form'
import { Btn, DetailLayout, Hero, Pill, Section } from '../../../shared/ui/kit'
import { useTopup } from '../hooks/useWallet'

const PRESETS = [100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000]

/** MP-097 · Nạp Tiền Vào Ví — API THẬT POST /api/payments/zalopay (WALLET / TOPUP). */
export function TopupPage() {
  const { data: user } = useSession()
  const topup = useTopup()
  const [amount, setAmount] = useState(1_000_000)
  const [raw, setRaw] = useState('')
  const [result, setResult] = useState<{ orderUrl: string; transactionId: number; status: string } | null>(null)

  useEffect(() => {
    document.title = 'Nạp tiền vào ví · 3DWorld'
  }, [])

  const value = raw ? Number(raw) : amount
  const valid = value >= 10_000 && value <= 50_000_000
  const error = topup.error instanceof ApiClientError ? topup.error.message : topup.error ? 'Không tạo được lệnh nạp.' : ''

  const submit = () =>
    topup.mutate(
      // Backend lưu sourceId làm walletId; chưa có API trả mã ví → dùng id người dùng.
      { amount: value, walletId: Number(user?.id) || 0 },
      {
        onSuccess: (p) => {
          setResult(p)
          window.open(p.orderUrl, '_blank', 'noopener')
        },
      },
    )

  return (
    <>
      <Hero code="MP-097" eyebrow="Nạp tiền vào ví" title="Nạp Tiền Vào Ví" accent="Thanh Toán ZaloPay & Cập Nhật Số Dư." />
      <DetailLayout
        main={
          <>
            <Section title="Chọn số tiền cần nạp">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={!raw && amount === p}
                    onClick={() => {
                      setAmount(p)
                      setRaw('')
                    }}
                    className={`rounded-2xl px-4 py-4 font-display text-lg font-bold transition ${!raw && amount === p ? 'bg-ink text-white' : 'bg-surface-low hover:bg-surface-high'}`}
                  >
                    {formatVnd(p)}
                  </button>
                ))}
              </div>
              <label htmlFor="topup-raw" className="mt-4 block">
                <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Hoặc nhập số khác (10.000₫ – 50.000.000₫)</span>
                <input
                  id="topup-raw"
                  inputMode="numeric"
                  value={raw}
                  onChange={(e) => setRaw(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập số tiền"
                  className="h-14 w-full rounded-2xl bg-surface-low px-5 font-display text-2xl font-bold outline-none focus:ring-2 focus:ring-violet/40"
                />
              </label>
            </Section>
            <Section title="Phương thức thanh toán">
              <div className="space-y-2">
                <label className="flex items-center gap-3 rounded-2xl bg-peach/50 p-4 ring-2 ring-orange">
                  <input type="radio" checked readOnly className="accent-orange" />
                  <CreditCard size={18} className="text-violet" />
                  <span className="flex-1">
                    <strong>ZaloPay</strong>
                    <span className="block text-xs text-ink-soft">ATM, thẻ quốc tế, ví ZaloPay — sandbox</span>
                  </span>
                  <Pill tone="green">API thật</Pill>
                </label>
                <label className="flex items-center gap-3 rounded-2xl bg-surface-low p-4 opacity-50">
                  <input type="radio" disabled />
                  <QrCode size={18} />
                  <span className="flex-1">
                    <strong>VietQR / Napas</strong>
                    <span className="block text-xs text-ink-soft">Sắp có</span>
                  </span>
                </label>
              </div>
            </Section>
          </>
        }
        aside={
          <Section title="Xác nhận nạp">
            <p className="font-display text-4xl font-bold">{valid ? formatVnd(value) : '—'}</p>
            <p className="mt-1 text-xs text-ink-soft">Số dư được cộng sau khi ZaloPay gửi callback thành công.</p>
            <div className="mt-4">
              <FormError message={error} />
            </div>
            {result ? (
              <div className="mt-4 space-y-2">
                <p className="rounded-2xl bg-mint p-3 text-sm text-[#0f5132]">
                  Đã tạo giao dịch #{result.transactionId} ({result.status}).
                </p>
                <Btn href={result.orderUrl} variant="primary" icon={ExternalLink}>
                  Mở lại trang ZaloPay
                </Btn>
              </div>
            ) : (
              <div className="mt-4">
                <Btn variant="primary" disabled={!valid || topup.isPending} onClick={submit}>
                  {topup.isPending ? 'Đang tạo lệnh…' : `Tạo lệnh nạp ${valid ? formatVnd(value) : ''}`}
                </Btn>
              </div>
            )}
            <p className="mt-4 flex gap-2 text-xs text-ink-soft">
              <ShieldCheck size={14} className="shrink-0 text-teal" /> Mỗi lệnh có khoá chống trùng — bấm lại không tạo khoản nạp mới khi cổng chưa phản hồi.
            </p>
            <p className="mt-2 text-[11px] text-violet">
              Lưu ý: chưa có API trả mã ví — tạm gửi id người dùng làm sourceId; số dư hiển thị ở trang Ví vẫn là dữ liệu mẫu.
            </p>
          </Section>
        }
      />
    </>
  )
}
