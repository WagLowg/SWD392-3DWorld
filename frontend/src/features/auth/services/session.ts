import { loginHref } from '../../../shared/modules'
import { authService, type AuthUser } from './auth.service'

export type SessionUser = AuthUser

/** Người dùng hiện tại (cookie httpOnly do backend cấp), null nếu chưa đăng nhập. */
export async function fetchMe(): Promise<SessionUser | null> {
  try {
    const data = await authService.getCurrentUser()
    return data.user ?? null
  } catch {
    return null
  }
}

export async function logout(redirectTo = '/') {
  await authService.logout().catch(() => {})
  location.assign(redirectTo)
}

/** Chuyển sang trang đăng nhập chung rồi quay lại trang hiện tại. */
export function goLogin(next?: string) {
  location.assign(loginHref(next))
}
