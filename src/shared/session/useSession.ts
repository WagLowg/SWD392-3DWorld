import { useQuery } from '@tanstack/react-query'
import { fetchMe } from '../../features/auth/services/session'

/** Người dùng hiện tại; null nếu chưa đăng nhập. */
export function useSession() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: ({ signal }) => fetchMe(signal),
    staleTime: 5 * 60_000,
    retry: false,
  })
}
