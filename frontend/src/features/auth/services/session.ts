<<<<<<< HEAD:frontend/src/features/auth/services/session.ts
import { loginHref } from '../../../shared/modules'
import { authService, type AuthUser } from './auth.service'
=======
import { type AuthUser, authService } from '../services/auth/auth.service'
import { tokenStore } from '../services/auth/token'
import { loginHref } from './modules'
>>>>>>> 1fc0e32357a9aa864933cad3201aa7a66639e148:frontend/src/shared/auth.ts

export type SessionUser = AuthUser

type MeEnvelope = {
  user?: AuthUser
  data?: {
    userId?: number | string
    email?: string
    fullName?: string
    phone?: string | null
    emailVerified?: boolean
    roles?: string[]
    capabilities?: string[]
  } | null
}

/**
 * Người dùng hiện tại, null nếu chưa đăng nhập.
 * Hỗ trợ cả Backend cũ ({ user }) và Backend OpenAPI ({ data: UserResponse }).
 */
export async function fetchMe(signal?: AbortSignal): Promise<SessionUser | null> {
  try {
    const res = (await authService.getCurrentUser(signal)) as MeEnvelope
    if (res.user) return res.user
    const d = res.data
    if (!d?.email) return null
    return {
      id: String(d.userId ?? ''),
      email: d.email,
      name: d.fullName || d.email.split('@')[0],
      role: d.roles?.[0] ?? 'CUSTOMER',
      phone: d.phone ?? null,
      emailVerified: d.emailVerified,
      roles: d.roles ?? [],
      capabilities: d.capabilities ?? [],
    }
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
