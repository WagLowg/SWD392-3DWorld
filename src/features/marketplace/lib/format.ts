import { env } from '../../../shared/config/env'
import type { ProductVariant } from '../types/catalog.types'

const vnd = new Intl.NumberFormat('vi-VN')

/** Media Backend trả về dạng "/demo/assets/x.png" → ghép với API base URL (nếu có). */
export function resolveMediaUrl(src: string | undefined) {
  if (!src) return undefined
  if (/^(https?:|data:|blob:)/i.test(src) || src.startsWith('//')) return src
  return `${env.apiBaseUrl.replace(/\/$/, '')}${src.startsWith('/') ? '' : '/'}${src}`
}

const CATEGORY_LABELS: Record<string, string> = {
  FIGURINE: 'Tượng & Figure',
  DESK_ACCESSORY: 'Phụ kiện bàn',
  TOY: 'Đồ chơi',
  ART_TOY: 'Art toy',
  KEYCAP: 'Keycap',
  MINIATURE: 'Mô hình mini',
  HOME_DECOR: 'Trang trí',
  JEWELRY: 'Trang sức',
}

/** Category Backend là mã (FIGURINE, DESK_ACCESSORY…) → nhãn tiếng Việt dễ đọc. */
export function categoryLabel(code: string | null | undefined) {
  if (!code) return ''
  const known = CATEGORY_LABELS[code.toUpperCase()]
  if (known) return known
  const words = code.replace(/[_-]+/g, ' ').toLowerCase().trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function formatVnd(value: number | null | undefined) {
  return `${vnd.format(Math.round(Number(value) || 0))}₫`
}

/** `attributes` của variant là chuỗi JSON (vd. {"material":"PLA","color":"white"}) → object; không phải JSON thì {}. */
export function parseAttributes(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>)
          .filter(([, v]) => v !== null && v !== '')
          .map(([k, v]) => [k, String(v)]),
      )
    }
  } catch {
    // không phải JSON
  }
  return {}
}

/** Nhãn ngắn của variant, vd. "PLA · Trắng". */
export function formatAttributes(raw: string | null | undefined) {
  const attrs = parseAttributes(raw)
  const entries = Object.entries(attrs)
  if (!entries.length) return raw ?? ''
  return entries.map(([k, v]) => attributeValueLabel(k, v)).join(' · ')
}

const ATTRIBUTE_LABELS: Record<string, string> = {
  material: 'Chất liệu chế tác',
  color: 'Phối màu hoàn thiện',
  colour: 'Phối màu hoàn thiện',
  size: 'Kích thước & tỉ lệ',
  scale: 'Kích thước & tỉ lệ',
  finish: 'Bề mặt hoàn thiện',
}

export function attributeLabel(key: string) {
  return ATTRIBUTE_LABELS[key.toLowerCase()] ?? key.charAt(0).toUpperCase() + key.slice(1)
}

const COLOR_NAMES: Record<string, { label: string; hex: string }> = {
  white: { label: 'Trắng', hex: '#ffffff' },
  black: { label: 'Đen', hex: '#1b1b22' },
  red: { label: 'Đỏ', hex: '#e5484d' },
  blue: { label: 'Xanh dương', hex: '#4c7cf0' },
  green: { label: 'Xanh lá', hex: '#46a758' },
  mint: { label: 'Xanh mint', hex: '#b9f4d0' },
  yellow: { label: 'Vàng', hex: '#ffe58f' },
  orange: { label: 'Cam', hex: '#f07a2e' },
  pink: { label: 'Hồng', hex: '#ffb3c7' },
  purple: { label: 'Tím', hex: '#a78bfa' },
  grey: { label: 'Xám', hex: '#a1a1aa' },
  gray: { label: 'Xám', hex: '#a1a1aa' },
}

export function colorSwatch(value: string) {
  return COLOR_NAMES[value.toLowerCase()]
}

export function attributeValueLabel(key: string, value: string) {
  if (/^colou?r$/i.test(key)) return colorSwatch(value)?.label ?? value
  return value
}

export function isColorKey(key: string) {
  return /^colou?r$/i.test(key)
}

export type VariantSummary = {
  minPrice: number
  maxPrice: number
  available: number
  variantCount: number
}

export function activeVariants(variants: ProductVariant[] = []) {
  return variants.filter((v) => v.active !== false)
}

export function summarizeVariants(variants: ProductVariant[] | undefined): VariantSummary | null {
  const active = activeVariants(variants)
  if (!active.length) return null
  const prices = active.map((v) => Number(v.price) || 0)
  return {
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    available: active.reduce((sum, v) => sum + Math.max(0, v.available ?? 0), 0),
    variantCount: active.length,
  }
}

/** Bảng màu pastel theo phong cách Stitch, chọn ổn định theo id sản phẩm. */
const ACCENTS = [
  { stage: 'from-butter to-[#fff8e0]', chip: 'bg-mint text-[#0f5132]' },
  { stage: 'from-violet-soft to-[#f4f0ff]', chip: 'bg-violet-soft text-violet' },
  { stage: 'from-peach to-[#fff3ea]', chip: 'bg-peach text-orange-deep' },
  { stage: 'from-teal-soft to-[#eef9ff]', chip: 'bg-teal-soft text-teal' },
  { stage: 'from-mint to-[#effcf4]', chip: 'bg-butter text-[#6b4e00]' },
] as const

export function accentFor(seed: number) {
  return ACCENTS[Math.abs(seed) % ACCENTS.length]
}
