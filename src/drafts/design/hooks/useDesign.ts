import { useQuery } from '@tanstack/react-query'
import { useMockAction } from '../../../shared/mock/useMockAction'
import type { DesignRequest, DesignStatus } from '../data/design.fixtures'
import { designService } from '../services/design.service'

const K = ['design-mock'] as const

export const useDesignStatus = () => useQuery({ queryKey: [...K, 'status'], queryFn: designService.status })
export const useDesignRequests = () => useQuery({ queryKey: [...K, 'list'], queryFn: designService.list })
export const useDesignRequest = (id: string) => useQuery({ queryKey: [...K, 'one', id], queryFn: () => designService.get(id) })
export const useEngineers = () => useQuery({ queryKey: [...K, 'engineers'], queryFn: designService.engineers })
export const usePricing = () => useQuery({ queryKey: [...K, 'pricing'], queryFn: designService.pricing })

export const useCreateDesign = () =>
  useMockAction(
    (input: Pick<DesignRequest, 'title' | 'purpose' | 'description' | 'size' | 'formats' | 'budget' | 'deadline'>) => designService.create(input),
    [K],
    'Đã gửi yêu cầu — chờ báo giá trong 24h.',
  )
export const useDesignTransition = () =>
  useMockAction(
    (v: { id: string; status: DesignStatus; action: string; actor?: string; note?: string }) => designService.transition(v.id, v.status, v.action, v.actor, v.note),
    [K],
    (r: DesignRequest | undefined) => (r ? `Đã cập nhật ${r.id}.` : 'Đã cập nhật.'),
  )
export const useRequestRevision = () =>
  useMockAction((v: { id: string; issues: string[]; text: string }) => designService.requestRevision(v.id, v.issues, v.text), [K], 'Đã gửi yêu cầu chỉnh sửa.')
export const useDesignMessage = () =>
  useMockAction((v: { id: string; from: 'customer' | 'engineer' | 'staff'; text: string }) => designService.message(v.id, v.from, v.text), [K])
export const useAssignEngineer = () => useMockAction((v: { id: string; engineer: string }) => designService.assign(v.id, v.engineer), [K], 'Đã phân công kỹ sư.')
export const useSendQuote = () =>
  useMockAction((v: { id: string; lines: { label: string; amount: number }[] }) => designService.sendQuote(v.id, v.lines), [K], 'Đã gửi báo giá mới.')
export const useSavePricing = () =>
  useMockAction((p: { baseSculpt: number; remesh: number; rushPercent: number }) => designService.savePricing(p), [K], 'Đã lưu cấu hình đơn giá.')
export const useSetService = () =>
  useMockAction((v: { accepting: boolean; reason: '' | 'QUOTA' | 'MAINTENANCE' }) => designService.setService(v.accepting, v.reason), [K], 'Đã cập nhật trạng thái dịch vụ.')
