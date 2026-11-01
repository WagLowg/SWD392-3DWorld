import { type ApiEnvelope, http } from '../../../shared/api'
import { type BackendUserResponse, fetchCurrentUser, logoutRequest, mapUser } from '../../../shared/session/session'
import { tokenStore } from '../../../shared/session/token'

export type { AuthUser } from '../../../shared/session/session'

export type LoginInput = {
  email: string
  password: string
}

export type RegisterInput = LoginInput & {
  name: string
  phone?: string
}

type LoginResponse = {
  accessToken: string
  tokenType: 'Bearer' | string
  expiresAt: string
  user: BackendUserResponse
}

export const authService = {
  getCurrentUser: fetchCurrentUser,

  async login(input: LoginInput) {
    tokenStore.clear()
    const response = await http.post<ApiEnvelope<LoginResponse>, LoginInput>('/api/auth/login', input)
    tokenStore.set(response.data.accessToken, response.data.expiresAt)
    const user = mapUser(response.data.user)
    tokenStore.setUser(user)
    return user
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

  logout: logoutRequest,
}
