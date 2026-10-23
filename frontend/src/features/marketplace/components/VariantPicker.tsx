import { Check } from 'lucide-react'
import {
  attributeLabel,
  attributeValueLabel,
  colorSwatch,
  formatAttributes,
  formatVnd,
  isColorKey,
  parseAttributes,
} from '../lib/format'
import type { ProductVariant } from '../types/catalog.types'

const KEY_ORDER = ['material', 'color', 'colour', 'size', 'scale', 'finish']

/** Lấy các nhóm thuộc tính (chất liệu, màu, kích thước…) từ JSON `attributes` của variant. */
export function attributeKeys(variants: ProductVariant[]) {
  const keys = new Set<string>()
  for (const v of variants) for (const k of Object.keys(parseAttributes(v.attributes))) keys.add(k)
  return [...keys].sort((a, b) => {
    const ia = KEY_ORDER.indexOf(a.toLowerCase())
    const ib = KEY_ORDER.indexOf(b.toLowerCase())
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}

function matches(v: ProductVariant, selection: Record<string, string>) {
  const attrs = parseAttributes(v.attributes)
  return Object.entries(selection).every(([k, val]) => attrs[k] === val)
}

/** Chọn thuộc tính; nếu tổ hợp mới không tồn tại thì lấy variant đầu tiên có giá trị vừa chọn. */
export function pickVariant(variants: ProductVariant[], selection: Record<string, string>, changedKey?: string) {
  const exact = variants.find((v) => matches(v, selection))
  if (exact || !changedKey) return exact
  const candidates = variants.filter((v) => parseAttributes(v.attributes)[changedKey] === selection[changedKey])
  return candidates.find((v) => v.available > 0) ?? candidates[0]
}

type Props = {
  variants: ProductVariant[]
  selected?: ProductVariant
  onSelect: (variant: ProductVariant) => void
}

export function VariantPicker({ variants, selected, onSelect }: Props) {
  const keys = attributeKeys(variants)
  const basePrice = Math.min(...variants.map((v) => Number(v.price) || 0))
  const selection = selected ? parseAttributes(selected.attributes) : {}

  // Thuộc tính không phải JSON → chọn trực tiếp theo variant
  if (!keys.length) {
    return (
      <fieldset>
        <legend className="font-label text-xs font-semibold text-ink-soft">Phiên bản</legend>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {variants.map((v) => (
            <OptionButton
              key={v.id}
              active={v.id === selected?.id}
              out={v.available <= 0}
              title={formatAttributes(v.attributes) || v.sku}
              sub={formatVnd(v.price)}
              onClick={() => onSelect(v)}
            />
          ))}
        </div>
      </fieldset>
    )
  }

  return (
    <div className="space-y-5">
      {keys.map((key) => {
        const values = [...new Set(variants.map((v) => parseAttributes(v.attributes)[key]).filter(Boolean))]
        const current = selection[key]
        const choose = (value: string) => {
          const next = pickVariant(variants, { ...selection, [key]: value }, key)
          if (next) onSelect(next)
        }
        const color = isColorKey(key)
        return (
          <fieldset key={key}>
            <legend className="flex w-full items-center justify-between font-label text-xs font-semibold text-ink-soft">
              <span>{attributeLabel(key)}:</span>
              {current && <span className="text-violet">{attributeValueLabel(key, current)}</span>}
            </legend>
            {color ? (
              <div className="mt-2.5 flex flex-wrap gap-2.5">
                {values.map((value) => {
                  const swatch = colorSwatch(value)
                  const active = value === current
                  const exists = variants.some((v) => matches(v, { ...selection, [key]: value }))
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      aria-label={attributeValueLabel(key, value)}
                      title={attributeValueLabel(key, value)}
                      onClick={() => choose(value)}
                      className={`grid h-11 w-11 place-items-center rounded-full border-2 transition ${
                        active ? 'border-orange-deep' : 'border-transparent'
                      } ${exists ? '' : 'opacity-40'}`}
                    >
                      <span
                        className="grid h-9 w-9 place-items-center rounded-full border border-line"
                        style={{ background: swatch?.hex ?? '#efecf6' }}
                      >
                        {active && (
                          <Check size={15} className={swatch?.hex === '#1b1b22' ? 'text-white' : 'text-ink'} />
                        )}
                        {!swatch && !active && <span className="font-label text-[9px]">{value.slice(0, 3)}</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {values.map((value) => {
                  const candidate = pickVariant(variants, { ...selection, [key]: value }, key)
                  const delta = candidate ? Number(candidate.price) - basePrice : 0
                  return (
                    <OptionButton
                      key={value}
                      active={value === current}
                      out={!candidate || candidate.available <= 0}
                      title={attributeValueLabel(key, value)}
                      sub={delta > 0 ? `+${formatVnd(delta)}` : 'Tiêu chuẩn'}
                      onClick={() => choose(value)}
                    />
                  )
                })}
              </div>
            )}
          </fieldset>
        )
      })}
    </div>
  )
}

function OptionButton({
  active,
  out,
  title,
  sub,
  onClick,
}: {
  active: boolean
  out: boolean
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-2xl px-4 py-2.5 text-left transition ${
        active ? 'bg-ink text-white shadow-sm' : 'bg-surface-low hover:bg-surface-high'
      } ${out ? 'opacity-50' : ''}`}
    >
      <span className="block truncate text-sm font-semibold">{title}</span>
      <span className={`block font-label text-[11px] ${active ? 'text-white/70' : 'text-ink-soft'}`}>
        {out ? 'Hết hàng' : sub}
      </span>
    </button>
  )
}
