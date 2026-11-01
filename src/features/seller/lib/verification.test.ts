import { expect, it } from 'vitest'
import { isVerifiedSellerBank, missingSellerVerification } from './verification'

it('requires the exact active VERIFIED bank status used by the backend', () => {
  const bank = { id: 1, bankCode: 'VCB', bankName: 'Bank', accountHolder: 'Seller', accountNumberMasked: '***1234', verificationStatus: 'VERIFIED', isDefault: true, isActive: true }
  expect(isVerifiedSellerBank(bank)).toBe(true)
  for (const verificationStatus of ['PENDING', 'APPROVED', 'REJECTED', '']) {
    expect(isVerifiedSellerBank({ ...bank, verificationStatus })).toBe(false)
  }
  expect(isVerifiedSellerBank({ ...bank, isActive: false })).toBe(false)
})

it('requires verified contact and bank flags, not final seller eligibility', () => {
  expect(missingSellerVerification({ emailVerified: true, phoneVerified: true, verifiedBankAvailable: true })).toEqual([])
  expect(missingSellerVerification({ emailVerified: true, phoneVerified: false, verifiedBankAvailable: false })).toHaveLength(2)
  expect(missingSellerVerification({ emailVerified: true, phoneVerified: true })).toHaveLength(1)
})
