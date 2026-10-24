import { loginHref } from '../../../shared/modules'
import { tokenStore } from '../../../shared/session/token'
import { authService, type AuthUser } from './auth.service'

export type SessionUser = AuthUser

/** Người dùng hiện tại theo ApiResponse<UserResponse> của Spring Boot, null nếu chưa đăng nhập. */
export async function fetchMe(signal?: AbortSignal): Promise<SessionUser | null> {
  try {
    return await authService.getCurrentUser(signal)
  } catch {
    return null
  }
}

/** Có token trong phiên nhưng /api/auth/me thất bại → phiên đã hết hạn (MP-104). */
export function hasStoredSession() {
  return !!tokenStore.get() || tokenStore.wasExpired()
}

/** Người bán: có quyền quản lý gian hàng hoặc xử lý đơn. */
export function isSeller(user: SessionUser | null | undefined) {
  if (!user) return false
  const caps = user.capabilities ?? []
  const roles = user.roles ?? [user.role]
  return (
    caps.includes('STOREFRONT_MANAGE_OWN') ||
    caps.includes('ORDER_PROCESS_EXISTING') ||
    roles.some((r) => /SELLER/i.test(r))
  )
}

export async function logout(redirectTo = '/') {
  await authService.logout().catch(() => {})
  location.assign(redirectTo)
}

/** Chuyển sang trang đăng nhập chung rồi quay lại trang hiện tại. */
export function goLogin(next?: string) {
  location.assign(loginHref(next))
}
