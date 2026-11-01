import { useMutation, useQuery } from '@tanstack/react-query'
import { useMockAction } from '../../../shared/mock/useMockAction'
import type { Payout } from '../data/wallet.fixtures'
import { walletService } from '../services/wallet.service'

const K = ['wallet-mock'] as const
export const walletKeys = {
  wallet: [...K, 'wallet'] as const,
  entry: (id: string) => [...K, 'entry', id] as const,
  payouts: [...K, 'payouts'] as const,
  payout: (id: string) => [...K, 'payouts', id] as const,
}

export const useWallet = () => useQuery({ queryKey: walletKeys.wallet, queryFn: walletService.wallet })
export const useLedgerEntry = (id: string) => useQuery({ queryKey: walletKeys.entry(id), queryFn: () => walletService.entry(id) })
export const usePayouts = () => useQuery({ queryKey: walletKeys.payouts, queryFn: walletService.payouts })
export const usePayout = (id: string) => useQuery({ queryKey: walletKeys.payout(id), queryFn: () => walletService.payout(id) })

export const useCreatePayout = () =>
  useMockAction((input: { bank: Payout['bank']; amount: number; note?: string }) => walletService.createPayout(input), [K], 'Đã tạo lệnh rút tiền.')

/** Nạp ví qua ZaloPay — API thật. */
export const useTopup = () =>
  useMutation({ mutationFn: ({ amount, walletId }: { amount: number; walletId: number }) => walletService.topup(amount, walletId) })
