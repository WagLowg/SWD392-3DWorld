import { useSession as useSharedSession } from '../../../shared/session/useSession'

/** Người dùng đang đăng nhập (nếu có) — để landing hiện tên thay cho "Sign In". */
export function useSession() {
  const session = useSharedSession()
  return { user: session.data ?? null, isLoading: session.isLoading }
}
