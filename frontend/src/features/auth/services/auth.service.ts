import { http } from '../../../shared/api'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: string
}

export type LoginInput = {
  email: string
  password: string
}

export type RegisterInput = LoginInput & {
  name: string
}

type AuthResponse = {
  user: AuthUser
}

export const authService = {
  getCurrentUser(signal?: AbortSignal) {
    return http.get<AuthResponse>('/api/auth/me', { signal })
  },

  login(input: LoginInput) {
    return http.post<AuthResponse, LoginInput>('/api/auth/login', input)
  },

  register(input: RegisterInput) {
    return http.post<AuthResponse, RegisterInput>('/api/auth/register', input)
  },

  logout() {
    return http.post<void>('/api/auth/logout')
  },
}
