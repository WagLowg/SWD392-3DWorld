import { type ApiEnvelope, http } from '../../../services/http'
import { mockFind, mockResponse, nowIso } from '../../../shared/mock/mockApi'
import { balances, ledger, type Payout, payouts } from '../data/wallet.fixtures'

/**
 * Ví tài khoản.
 * - Số dư, sổ cái, rút tiền: DỮ LIỆU MẪU (TODO(API): /api/wallets/me, /api/wallets/me/ledger, /api/payouts).
 * - Nạp tiền: API THẬT POST /api/payments/zalopay (sourceType WALLET, stage TOPUP).
 */
export const walletService = {
  wallet: () => mockResponse({ balances, ledger }),
  entry: (id: string) => mockFind(ledger, (l) => l.id === id, 'Bút toán'),
  payouts: () => mockResponse(payouts),
  payout: (id: string) => mockFind(payouts, (p) => p.id === id, 'Yêu cầu rút tiền'),

  /** Rút tiền: khoá số tiền từ khả dụng sang tạm giữ (atomic balance hold) rồi gửi lệnh. */
  createPayout(input: { bank: Payout['bank']; amount: number; note?: string }) {
    if (input.amount > balances.available) return Promise.reject(new Error('Số tiền rút vượt quá số dư khả dụng.'))
    if (input.amount < 50_000) return Promise.reject(new Error('Số tiền rút tối thiểu 50.000₫.'))
    balances.available -= input.amount
    balances.held += input.amount
    const id = `PO-${90216 + payouts.length}`
    const payout: Payout = {
      id,
      at: nowIso(),
      bank: input.bank,
      amount: input.amount,
      note: input.note,
      status: 'PROCESSING',
      ledgerRef: `led_hold_${id}`,
      attempts: [{ no: 1, at: nowIso(), gateway: 'Napas', status: 'PENDING', message: 'Đã khoá số dư và gửi lệnh chuyển' }],
    }
    payouts.unshift(payout)
    ledger.unshift({
      id: `led_hold_${id}`,
      at: nowIso(),
      type: 'HOLD',
      label: `Tạm giữ cho lệnh rút ${id}`,
      bucket: 'held',
      amount: input.amount,
      balanceAfter: balances.held,
      ref: id,
      idempotencyKey: `idem-${id}`,
      status: 'PENDING',
      hash: 'sha256:pending…',
    })
    return mockResponse(payout)
  },

  /** API thật — trả về orderUrl của ZaloPay. */
  async topup(amount: number, walletId: number) {
    return (
      await http.post<ApiEnvelope<{ transactionId: number; amount: number; status: string; orderUrl: string; appTransId: string }>>(
        '/api/payments/zalopay',
        { sourceType: 'WALLET', sourceId: walletId, stage: 'TOPUP', amount, description: 'Nạp ví 3DWorld' },
      )
    ).data
  },
}
