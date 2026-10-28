import { describe, expect, it } from 'vitest'
import { formatStructuredAddress, isGhtkReadyAddress } from './address'

const complete = {
  id: 1,
  recipientName: 'Nguyễn Văn A',
  phone: '0901234567',
  addressLine: '12 Nguyễn Trãi',
  city: 'TP. Hồ Chí Minh',
  province: 'TP. Hồ Chí Minh',
  district: 'Quận 1',
  ward: 'Phường Bến Thành',
  isDefault: true,
}

describe('seller pickup address', () => {
  it('requires the fields used by GHTK while allowing district to be omitted', () => {
    expect(isGhtkReadyAddress(complete)).toBe(true)
    expect(isGhtkReadyAddress({ ...complete, district: null })).toBe(true)
    expect(isGhtkReadyAddress({ ...complete, ward: null })).toBe(false)
    expect(isGhtkReadyAddress({ ...complete, phone: null })).toBe(false)
  })

  it('formats the structured address without repeating city and province', () => {
    expect(formatStructuredAddress(complete)).toBe('12 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh')
  })
})
