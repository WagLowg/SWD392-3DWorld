import { useQuery } from '@tanstack/react-query'
import { useMockAction } from '../../../shared/mock/useMockAction'
import type { OpsDomain } from '../data/ops.fixtures'
import { opsService } from '../services/ops.service'

const K = ['ops'] as const
export const opsKeys = {
  all: K,
  list: (d: OpsDomain) => [...K, d] as const,
  one: (d: OpsDomain, id: string) => [...K, d, id] as const,
}

export const useOpsList = (d: OpsDomain) => useQuery({ queryKey: opsKeys.list(d), queryFn: () => opsService.list(d) })
export const useOpsAll = () => useQuery({ queryKey: [...K, 'all'], queryFn: opsService.all })
export const useOpsCase = (d: OpsDomain, id: string) => useQuery({ queryKey: opsKeys.one(d, id), queryFn: () => opsService.get(d, id) })
export const usePlatformLedger = () => useQuery({ queryKey: [...K, 'ledger'], queryFn: opsService.ledger })
export const usePlatformEarnings = () => useQuery({ queryKey: [...K, 'earnings'], queryFn: opsService.earnings })
export const useCommissions = () => useQuery({ queryKey: [...K, 'commissions'], queryFn: opsService.commissions })
export const useAuditLogs = () => useQuery({ queryKey: [...K, 'audit'], queryFn: opsService.audit })
export const useAuditEntry = (id: string) => useQuery({ queryKey: [...K, 'audit', id], queryFn: () => opsService.auditEntry(id) })

export const useDecide = () =>
  useMockAction(
    (v: { domain: OpsDomain; id: string; decision: string; status: string; reason: string }) => opsService.decide(v.domain, v.id, v.decision, v.status, v.reason),
    [K],
    'Đã ký duyệt & ghi audit log.',
  )
export const useReleaseEarning = () => useMockAction((id: string) => opsService.releaseEarning(id), [K], 'Đã mở khoá vào ví xưởng.')
