import { afterEach, expect, it, vi } from 'vitest'
import { addressService, bankAccountService } from '../../account/services/account.service'
import { sellerVerificationApi } from './seller.api'
import { sellerService } from './seller.service'

afterEach(() => vi.restoreAllMocks())

it('rechecks server verification and does not submit when the phone is still unverified', async () => {
  vi.spyOn(sellerVerificationApi, 'get').mockResolvedValue({ userId: 1, emailVerified: true, phoneVerified: false, verifiedBankAvailable: true, eligible: false, verification: null })
  vi.spyOn(bankAccountService, 'list').mockResolvedValue([])
  vi.spyOn(addressService, 'list').mockResolvedValue([])
  const submit = vi.spyOn(sellerVerificationApi, 'submit')
  await expect(sellerService.submitApplication({ storefrontName: 'Shop', description: '', address: '', technologies: [], evidence: 'Proof' })).rejects.toThrow('Lưu số điện thoại')
  expect(submit).not.toHaveBeenCalled()
})
