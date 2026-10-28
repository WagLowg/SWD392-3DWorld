import { useEffect, useState } from 'react'
import { fetchMe, type SessionUser } from '../../../shared/session/session'

/** Người dùng đang đăng nhập (nếu có) — để landing hiện tên thay cho "Sign In". */
export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null)
  useEffect(() => {
    fetchMe().then(setUser)
  }, [])
  return { user }
}
