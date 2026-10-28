export type SessionUser = {
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
