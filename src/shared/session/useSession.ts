import { useQuery } from '@tanstack/react-query'
import { fetchMe, getCachedSessionUser } from './session'

/** Người dùng hiện tại; null nếu chưa đăng nhập. */
export function useSession() {
  const cachedUser = getCachedSessionUser()
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: ({ signal }) => fetchMe(signal),
    initialData: cachedUser ?? undefined,
    // Snapshot chỉ dùng để vẽ ngay; luôn xác minh nền với Backend khi entry mới mount.
    initialDataUpdatedAt: cachedUser ? 0 : undefined,
    staleTime: 5 * 60_000,
    retry: false,
  })
}
