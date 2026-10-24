import { nowIso } from '../../../shared/mock/mockApi'

export type Bucket = 'available' | 'pending' | 'held'

export type LedgerEntry = {
  id: string
  at: string
  type: 'TOPUP' | 'PAYMENT' | 'EARNING' | 'RELEASE' | 'HOLD' | 'PAYOUT' | 'REFUND'
  label: string
  bucket: Bucket
  amount: number
  balanceAfter: number
  ref: string
  idempotencyKey: string
  status: 'POSTED' | 'PENDING' | 'REVERSED'
  hash: string
}

export type PayoutStatus = 'PROCESSING' | 'SUCCEEDED' | 'REJECTED' | 'UNKNOWN'

export type Payout = {
  id: string
  at: string
  bank: { name: string; masked: string; holder: string }
  amount: number
  note?: string
  status: PayoutStatus
  ledgerRef: string
  attempts: { no: number; at: string; gateway: string; status: string; message: string }[]
  rejectReason?: string
}

export const balances = { available: 4_790_000, pending: 874_000, held: 779_000 }

const h = (s: string) => `sha256:${s.padEnd(12, '0').slice(0, 12)}…`

export const ledger: LedgerEntry[] = [
  { id: 'led_9012a6', at: nowIso(2), type: 'TOPUP', label: 'Nạp tiền qua ZaloPay', bucket: 'available', amount: 1_000_000, balanceAfter: 4_790_000, ref: 'TXN-TOP-99901', idempotencyKey: 'idem-7c1a', status: 'POSTED', hash: h('a91f7c') },
  { id: 'led_9012a5', at: nowIso(20), type: 'PAYMENT', label: 'Thanh toán thuê bao Storefront Pro', bucket: 'available', amount: -250_000, balanceAfter: 3_790_000, ref: 'TXN-SUB-88219', idempotencyKey: 'idem-55b2', status: 'POSTED', hash: h('77d01b') },
  { id: 'led_9012a4', at: nowIso(48), type: 'RELEASE', label: 'Giải ngân doanh thu ERN-88204', bucket: 'available', amount: 2_033_000, balanceAfter: 4_040_000, ref: 'ERN-88204', idempotencyKey: 'idem-19e0', status: 'POSTED', hash: h('c03e2a') },
  { id: 'led_9012a3', at: nowIso(29), type: 'HOLD', label: 'Tạm giữ do tranh chấp TXN-RFD-88188', bucket: 'held', amount: 779_000, balanceAfter: 779_000, ref: 'TXN-RFD-88188', idempotencyKey: 'idem-0aa1', status: 'POSTED', hash: h('5b8e44') },
  { id: 'led_9012a2', at: nowIso(60), type: 'EARNING', label: 'Ghi nhận doanh thu chờ ERN-88219', bucket: 'pending', amount: 874_000, balanceAfter: 874_000, ref: 'ERN-88219', idempotencyKey: 'idem-3fd9', status: 'POSTED', hash: h('e2a913') },
  { id: 'led_9012a1', at: nowIso(96), type: 'PAYOUT', label: 'Rút tiền về Vietcombank ****6789', bucket: 'available', amount: -1_500_000, balanceAfter: 2_007_000, ref: 'PO-90214', idempotencyKey: 'idem-90b7', status: 'POSTED', hash: h('19cc02') },
]

export const payouts: Payout[] = [
  {
    id: 'PO-90215',
    at: nowIso(1),
    bank: { name: 'Vietcombank', masked: '****6789', holder: 'NGUYEN VAN AN' },
    amount: 500_000,
    status: 'PROCESSING',
    ledgerRef: 'led_hold_90215',
    attempts: [{ no: 1, at: nowIso(1), gateway: 'Napas', status: 'PENDING', message: 'Đã gửi lệnh chuyển, chờ ngân hàng xác nhận' }],
  },
  {
    id: 'PO-90214',
    at: nowIso(96),
    bank: { name: 'Vietcombank', masked: '****6789', holder: 'NGUYEN VAN AN' },
    amount: 1_500_000,
    note: 'Rút doanh thu tháng 10',
    status: 'SUCCEEDED',
    ledgerRef: 'led_9012a1',
    attempts: [{ no: 1, at: nowIso(96), gateway: 'Napas', status: 'SUCCEEDED', message: 'Ngân hàng xác nhận ghi có' }],
  },
  {
    id: 'PO-90190',
    at: nowIso(200),
    bank: { name: 'Techcombank', masked: '****1122', holder: 'NGUYEN VAN AN' },
    amount: 3_000_000,
    status: 'REJECTED',
    ledgerRef: 'led_rev_90190',
    rejectReason: 'Tài khoản ngân hàng chưa được xác minh.',
    attempts: [{ no: 1, at: nowIso(200), gateway: 'Napas', status: 'REJECTED', message: 'Từ chối trước khi chuyển — tài khoản chưa xác minh' }],
  },
  {
    id: 'PO-90188',
    at: nowIso(30),
    bank: { name: 'Vietcombank', masked: '****6789', holder: 'NGUYEN VAN AN' },
    amount: 800_000,
    status: 'UNKNOWN',
    ledgerRef: 'led_hold_90188',
    attempts: [
      { no: 1, at: nowIso(30), gateway: 'Napas', status: 'TIMEOUT', message: 'Cổng ngân hàng không phản hồi sau 30 giây' },
      { no: 2, at: nowIso(29), gateway: 'Napas', status: 'UNKNOWN', message: 'Đang tra soát — số tiền vẫn được tạm giữ, không trừ hai lần' },
    ],
  },
]
