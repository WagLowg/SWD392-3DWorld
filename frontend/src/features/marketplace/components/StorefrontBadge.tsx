import { Store } from 'lucide-react'
import { storefrontName } from '../lib/cart'

const TONES = ['bg-violet text-white', 'bg-orange text-white', 'bg-teal text-white', 'bg-[#0f5132] text-white']

/** Avatar + tên xưởng dùng ở Giỏ hàng và Thanh toán. */
export function StorefrontBadge({ storefrontId, sub }: { storefrontId: number | null; sub?: string }) {
  const tone = storefrontId === null ? 'bg-surface-high text-ink-soft' : TONES[storefrontId % TONES.length]
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${tone}`}>
        <Store size={19} />
      </span>
      <div className="min-w-0">
        <p className="truncate font-display text-lg font-bold leading-tight">{storefrontName(storefrontId)}</p>
        {sub && <p className="truncate font-label text-[11px] text-ink-soft">{sub}</p>}
      </div>
    </div>
  )
}
