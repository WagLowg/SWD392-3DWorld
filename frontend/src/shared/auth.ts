import { loginHref } from './modules'

export type SessionUser = { id: string; email: string; name: string; role: string }

/** Người dùng hiện tại (cookie httpOnly do backend cấp), null nếu chưa đăng nhập. */
export async function fetchMe(): Promise<SessionUser | null> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
    if (!res.ok) return null
    const data = await res.json()
    return data.user ?? null
  } catch {
    return null
  }
}

export async function logout(redirectTo = '/') {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {})
  location.assign(redirectTo)
}

/** Chuyển sang trang đăng nhập chung rồi quay lại trang hiện tại. */
export function goLogin(next?: string) {
  location.assign(loginHref(next))
}
