export type Profile = {
  userId: number
  email: string
  fullName: string
  avatarUrl?: string | null
  dateOfBirth?: string | null
  phone?: string | null
  emailVerified: boolean
  roles: string[]
  capabilities: string[]
}

export type ProfileInput = {
  fullName: string
  phone?: string
}

export type Address = {
  id: number
  recipientName: string
  phone?: string | null
  addressLine: string
  city?: string | null
  province?: string | null
  district?: string | null
  ward?: string | null
  isDefault: boolean
}

export type AddressInput = {
  recipientName: string
  phone?: string
  addressLine: string
  city?: string
  province?: string
  district?: string
  ward?: string
}

/** Số tài khoản không bao giờ trả về đầy đủ, chỉ có accountNumberMasked. */
export type BankAccount = {
  id: number
  bankCode: string
  bankName: string
  accountHolder: string
  accountNumberMasked: string
  /** PENDING | APPROVED | REJECTED (do quản trị viên duyệt). */
  verificationStatus: string
  isDefault: boolean
  isActive: boolean
}

export type BankAccountInput = {
  bankCode: string
  bankName: string
  accountHolder: string
  accountNumber: string
}
