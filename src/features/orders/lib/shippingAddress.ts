export type ParsedShippingAddress = {
  recipientName?: string
  phone?: string
  addressLine?: string
  ward?: string
  district?: string
  province?: string
  raw?: string
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function first(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = text(source[key])
    if (value) return value
  }
  return undefined
}

function fromObject(source: Record<string, unknown>): ParsedShippingAddress | null {
  const nested = source.shippingAddress ?? source.shipping_address ?? source.address
  const address =
    nested && typeof nested === 'object' && !Array.isArray(nested)
      ? ({ ...source, ...(nested as Record<string, unknown>) } as Record<string, unknown>)
      : source

  const parsed: ParsedShippingAddress = {
    recipientName: first(address, ['recipientName', 'recipient_name', 'recipient', 'fullName', 'full_name', 'name']),
    phone: first(address, ['phone', 'phoneNumber', 'phone_number', 'recipientPhone', 'recipient_phone']),
    addressLine: first(address, [
      'addressLine',
      'address_line',
      'streetAddress',
      'street_address',
      'fullAddress',
      'full_address',
      'street',
    ]),
    ward: first(address, ['ward', 'commune']),
    district: first(address, ['district']),
    province: first(address, ['province', 'city']),
  }

  return Object.values(parsed).some(Boolean) ? parsed : null
}

/** Chuẩn hoá snapshot từ API mới (JSON) và dữ liệu cũ "tên | SĐT | địa chỉ". */
export function parseShippingAddressSnapshot(snapshot: unknown): ParsedShippingAddress | null {
  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    return fromObject(snapshot as Record<string, unknown>)
  }
  if (typeof snapshot !== 'string' || !snapshot.trim()) return null

  const original = snapshot.trim()
  let decoded: unknown = original
  for (let attempt = 0; attempt < 2 && typeof decoded === 'string'; attempt += 1) {
    try {
      decoded = JSON.parse(decoded)
    } catch {
      break
    }
  }
  if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
    const parsed = fromObject(decoded as Record<string, unknown>)
    if (parsed) return parsed
  }

  const parts = original.split('|').map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 3) {
    return { recipientName: parts[0], phone: parts[1], addressLine: parts.slice(2).join(' | ') }
  }
  if (parts.length === 2) {
    return /^\+?[\d\s().-]{7,}$/.test(parts[1])
      ? { recipientName: parts[0], phone: parts[1] }
      : { recipientName: parts[0], addressLine: parts[1] }
  }
  return { raw: original }
}

