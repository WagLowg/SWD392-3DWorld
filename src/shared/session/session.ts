import { type ApiEnvelope, http } from '../api'
import { loginHref } from '../config/modules'
import { tokenStore } from './token'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: string
  avatarUrl?: string | null
  dateOfBirth?: string | null
  phone?: string | null
  emailVerified?: boolean
  roles?: string[]
  capabilities?: string[]
}

export type SessionUser = AuthUser

/** UserResponse của Spring Boot. */
export type BackendUserResponse = {
  userId: number
  email: string
  fullName: string
  avatarUrl: string | null
  dateOfBirth: string | null
  phone: string | null
  emailVerified: boolean
  roles: string[]
  capabilities: string[]
}

export function mapUser(user: BackendUserResponse): AuthUser {
  return {
    id: String(user.userId),
    email: user.email,
    name: user.fullName || user.email.split('@')[0],
    role: user.roles[0] ?? 'CUSTOMER',
    avatarUrl: user.avatarUrl,
    dateOfBirth: user.dateOfBirth,
    phone: user.phone,
    emailVerified: user.emailVerified,
    roles: user.roles,
    capabilities: user.capabilities,
  }
}

export async function fetchCurrentUser(signal?: AbortSignal) {
  const response = await http.get<ApiEnvelope<BackendUserResponse>>('/api/auth/me', { signal })
  return mapUser(response.data)
}

export async function logoutRequest() {
  try {
    await http.post<void>('/api/auth/logout')
  } finally {
    tokenStore.clear()
  }
}

/** Người dùng hiện tại theo ApiResponse<UserResponse> của Spring Boot, null nếu chưa đăng nhập. */
export async function fetchMe(signal?: AbortSignal): Promise<SessionUser | null> {
  try {
    return await fetchCurrentUser(signal)
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
  await logoutRequest().catch(() => {})
  location.assign(redirectTo)
}

/** Chuyển sang trang đăng nhập chung rồi quay lại trang hiện tại. */
export function goLogin(next?: string) {
  location.assign(loginHref(next))
}
