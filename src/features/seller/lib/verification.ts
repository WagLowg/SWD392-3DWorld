import type { BankAccount } from '../../account/types/account.types'

/** Match SellerVerificationService.bank(): APPROVED and PENDING are not VERIFIED. */
export const isVerifiedSellerBank = (bank: BankAccount) => bank.isActive === true && bank.verificationStatus === 'VERIFIED'

export function missingSellerVerification(state: { emailVerified: boolean; phoneVerified: boolean; verifiedBankAvailable?: boolean }) {
  return [
    !state.emailVerified && 'Xác thực email qua liên kết trong hộp thư.',
    !state.phoneVerified && 'Lưu số điện thoại và liên hệ quản trị viên để xác minh.',
    !state.verifiedBankAvailable && 'Thêm tài khoản ngân hàng và chờ quản trị viên xác minh.',
  ].filter((item): item is string => !!item)
}
