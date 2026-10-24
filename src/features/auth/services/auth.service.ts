import { http, type ApiEnvelope } from '../../../shared/api'
import { tokenStore } from '../../../shared/session/token'

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

export type LoginInput = {
  email: string
  password: string
}

export type RegisterInput = LoginInput & {
  name: string
  phone?: string
}

type BackendUserResponse = {
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

type LoginResponse = {
  accessToken: string
  tokenType: 'Bearer' | string
  expiresAt: string
  user: BackendUserResponse
}

function mapUser(user: BackendUserResponse): AuthUser {
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

export const authService = {
  async getCurrentUser(signal?: AbortSignal) {
    const response = await http.get<ApiEnvelope<BackendUserResponse>>('/api/auth/me', { signal })
    return mapUser(response.data)
  },

  async login(input: LoginInput) {
    tokenStore.clear()
    const response = await http.post<ApiEnvelope<LoginResponse>, LoginInput>('/api/auth/login', input)
    tokenStore.set(response.data.accessToken, response.data.expiresAt)
    return mapUser(response.data.user)
  },

  async register(input: RegisterInput) {
    const response = await http.post<ApiEnvelope<BackendUserResponse>>('/api/auth/register', {
      email: input.email,
      password: input.password,
      fullName: input.name,
      phone: input.phone || null,
    })
    return mapUser(response.data)
  },

  /** Link trong email có dạng {APP_BASE_URL}/verify-email?email=…&token=… */
  verifyEmail(input: { email: string; token: string }) {
    return http.post<void>('/api/auth/verify-email', input)
  },

  resendVerification(email: string) {
    return http.post<void>('/api/auth/resend-verification', { email })
  },

  /** Luôn trả thành công, không tiết lộ email có tồn tại hay không. */
  forgotPassword(email: string) {
    return http.post<void>('/api/auth/forgot-password', { email })
  },

  resetPassword(input: { email: string; token: string; newPassword: string }) {
    return http.post<void>('/api/auth/reset-password', input)
  },

  async logout() {
    try {
      await http.post<void>('/api/auth/logout')
    } finally {
      tokenStore.clear()
    }
  },
}
