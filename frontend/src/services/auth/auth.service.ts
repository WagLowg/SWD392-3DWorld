import { http } from '../http'
import { tokenStore } from './token'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: string
  /** Các trường dưới có từ Backend OpenAPI (UserResponse). */
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

type AuthResponse = {
  user: AuthUser
}

/** Response của Backend JWT: { status, message, data: { accessToken, expiresAt, user } }. */
type TokenEnvelope = {
  data?: { accessToken?: string; expiresAt?: string } | null
}

function saveToken(res: unknown) {
  const data = (res as TokenEnvelope | null)?.data
  if (data?.accessToken) tokenStore.set(data.accessToken, data.expiresAt)
  return res
}

export const authService = {
  getCurrentUser(signal?: AbortSignal) {
    return http.get<AuthResponse>('/api/auth/me', { signal })
  },

  async login(input: LoginInput) {
    tokenStore.clear()
    return saveToken(await http.post<AuthResponse, LoginInput>('/api/auth/login', input)) as AuthResponse
  },

  /** RegisterRequest (OpenAPI): email, password, fullName, phone — Backend từ chối trường lạ. */
  register(input: RegisterInput) {
    return http.post<AuthResponse>('/api/auth/register', {
      email: input.email,
      password: input.password,
      fullName: input.name,
      phone: input.phone || null,
    })
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
