import { describe, expect, it } from 'vitest'
import { parseShippingAddressSnapshot } from './shippingAddress'

describe('parseShippingAddressSnapshot', () => {
  it('parses a JSON address snapshot', () => {
    expect(
      parseShippingAddressSnapshot(
        '{"recipientName":"Nguyen Van A","phone":"0901234567","addressLine":"12 Nguyen Trai","ward":"Ben Thanh","district":"Quan 1","province":"TP.HCM"}',
      ),
    ).toEqual({
      recipientName: 'Nguyen Van A',
      phone: '0901234567',
      addressLine: '12 Nguyen Trai',
      ward: 'Ben Thanh',
      district: 'Quan 1',
      province: 'TP.HCM',
    })
  })

  it('supports snake_case and a nested address object', () => {
    expect(
      parseShippingAddressSnapshot({
        recipient_name: 'Tran Thi B',
        recipient_phone: '0912345678',
        address: { address_line: '25 Le Loi', district: 'Hai Chau', city: 'Da Nang' },
      }),
    ).toMatchObject({
      recipientName: 'Tran Thi B',
      phone: '0912345678',
      addressLine: '25 Le Loi',
      district: 'Hai Chau',
      province: 'Da Nang',
    })
  })

  it('parses the legacy pipe-delimited snapshot', () => {
    expect(parseShippingAddressSnapshot('Le Van C | 0987654321 | 8 Tran Phu, Ha Noi')).toEqual({
      recipientName: 'Le Van C',
      phone: '0987654321',
      addressLine: '8 Tran Phu, Ha Noi',
    })
  })
})

