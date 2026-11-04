import type { Earning } from '../data/seller.fixtures'

export function earningCommission(earning: Earning): number {
  if (earning.status === 'REFUNDED') return 0
  if (earning.commissionAmount && earning.commissionAmount > 0) return earning.commissionAmount
  return earning.gross * (earning.feeRate > 0 ? earning.feeRate : 0.05)
}

export function realizedCommissionTotal(earnings: Earning[]): number {
  return earnings.reduce(
    (total, earning) => total + (earning.status === 'RELEASED' ? earningCommission(earning) : 0),
    0,
  )
}
