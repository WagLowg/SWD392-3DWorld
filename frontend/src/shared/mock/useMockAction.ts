import { type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../ui/toast'

/** Mutation cho dữ liệu mẫu: chạy hàm, làm mới các query liên quan và báo toast. */
export function useMockAction<V, R = unknown>(fn: (v: V) => Promise<R>, invalidate: QueryKey[], success?: string | ((r: R) => string)) {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      for (const key of invalidate) qc.invalidateQueries({ queryKey: key })
      if (success) toast(typeof success === 'function' ? success(r) : success)
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Thao tác thất bại.', 'error'),
  })
}
