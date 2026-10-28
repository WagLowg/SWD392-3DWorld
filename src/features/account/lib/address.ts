import type { Address } from '../types/account.types'

const clean = (value: string | null | undefined) => value?.trim() ?? ''

/** Các trường backend/GHTK dùng cho địa chỉ lấy hàng của seller. District được phép trống theo địa giới hai cấp. */
export function isGhtkReadyAddress(address: Address | null | undefined): address is Address {
  return !!(
    address &&
    clean(address.recipientName) &&
    clean(address.phone) &&
    clean(address.addressLine) &&
    clean(address.province) &&
    clean(address.ward)
  )
}

export function formatStructuredAddress(address: Address) {
  return [address.addressLine, address.ward, address.district, address.province ?? address.city]
    .map(clean)
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(', ')
}
