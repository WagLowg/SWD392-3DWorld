export type Profile = {
  userId: number
  email: string
  fullName: string
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
  isDefault: boolean
}

export type AddressInput = {
  recipientName: string
  phone?: string
  addressLine: string
  city?: string
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
