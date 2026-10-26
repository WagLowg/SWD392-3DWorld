import { MapPin, Phone, UserRound } from 'lucide-react'
import { parseShippingAddressSnapshot } from '../lib/shippingAddress'

export function ShippingAddressSnapshot({ snapshot }: { snapshot: unknown }) {
  const address = parseShippingAddressSnapshot(snapshot)
  if (!address) {
    return <p className="mt-3 rounded-2xl bg-surface-low p-4 text-sm text-ink-soft">Đơn không lưu bản chụp địa chỉ.</p>
  }

  if (address.raw) {
    return <p className="mt-3 whitespace-pre-line rounded-2xl bg-surface-low p-4 text-sm">{address.raw}</p>
  }

  const locality = [address.ward, address.district, address.province].filter(Boolean).join(', ')
  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-surface-low p-4 text-sm">
      {(address.recipientName || address.phone) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {address.recipientName && (
            <span className="inline-flex items-center gap-2 font-semibold">
              <UserRound size={16} className="text-violet" /> {address.recipientName}
            </span>
          )}
          {address.phone && (
            <a
              href={`tel:${address.phone.replace(/[^+\d]/g, '')}`}
              className="inline-flex items-center gap-2 text-ink-soft hover:text-violet"
            >
              <Phone size={15} /> {address.phone}
            </a>
          )}
        </div>
      )}
      {(address.addressLine || locality) && (
        <div className="flex items-start gap-2 border-t border-line/70 pt-3">
          <MapPin size={16} className="mt-0.5 shrink-0 text-orange" />
          <div>
            {address.addressLine && <p className="font-medium">{address.addressLine}</p>}
            {locality && <p className="mt-0.5 text-ink-soft">{locality}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

