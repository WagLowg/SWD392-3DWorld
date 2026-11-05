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

const SHIPPING_CLASS_LABELS: Record<string, string> = {
  STANDARD: 'Hộp tiêu chuẩn',
  FRAGILE: 'Hộp chống sốc / hàng dễ vỡ',
  OVERSIZED: 'Kiện cồng kềnh',
}

export function shippingClassLabel(code: string | null | undefined) {
  if (!code) return ''
  return SHIPPING_CLASS_LABELS[code.toUpperCase()] ?? categoryLabel(code)
}

/** Hiển thị JSON specifications của Backend thành nội dung dễ đọc; dữ liệu text cũ vẫn giữ nguyên. */
export function formatProductSpecifications(raw: string | null | undefined) {
  if (!raw) return ''
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return raw
    const specs = parsed as Record<string, unknown>
    const lines: string[] = []
    if (typeof specs.material === 'string' && specs.material) lines.push(`Vật liệu: ${specs.material}`)
    if (Array.isArray(specs.dimensionsMm) && specs.dimensionsMm.length === 3) {
      lines.push(`Kích thước tham chiếu: ${specs.dimensionsMm.join(' × ')} mm`)
    }
    if (typeof specs.polygonCount === 'number') {
      lines.push(`Số polygon: ${specs.polygonCount.toLocaleString('vi-VN')}`)
    }
    if (typeof specs.manifold === 'boolean') lines.push(`Lưới kín (manifold): ${specs.manifold ? 'Có' : 'Không'}`)
    return lines.length ? lines.join('\n') : raw
  } catch {
    return raw
  }
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

/** Tên màu tiếng Việt (đã bỏ dấu) → hex. */
const VI_COLORS: Record<string, string> = {
  trang: '#ffffff',
  den: '#1b1b22',
  do: '#e5484d',
  'xanh duong': '#4c7cf0',
  'xanh da troi': '#7cc4fa',
  'xanh la': '#46a758',
  'xanh mint': '#b9f4d0',
  'xanh ngoc': '#3dd6c6',
  xanh: '#4c7cf0',
  vang: '#ffd84d',
  cam: '#f07a2e',
  hong: '#ffb3c7',
  'hong pastel': '#ffd1dc',
  tim: '#a78bfa',
  'tim pastel': '#d8ccff',
  xam: '#a1a1aa',
  nau: '#8b5e3c',
  be: '#f1e3c8',
  kem: '#fbf3dc',
  bac: '#c9ccd3',
  'vang dong': '#d4a537',
  'trong suot': '#eef3f8',
}

const stripAccents = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()

/** Nhận tên màu tiếng Anh/Việt, mã hex hoặc tên màu CSS; trả về nhãn hiển thị + hex. */
export function colorSwatch(value: string) {
  const raw = value.trim()
  const known = COLOR_NAMES[raw.toLowerCase()]
  if (known) return known
  const vi = VI_COLORS[stripAccents(raw)]
  if (vi) return { label: raw, hex: vi }
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return { label: raw.toUpperCase(), hex: raw }
  if (typeof CSS !== 'undefined' && CSS.supports('color', raw)) return { label: raw, hex: raw }
  return undefined
}

/** Màu nền tối → dùng dấu check màu trắng. */
export function isDarkColor(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex) ?? /^#?([0-9a-f]{3})$/i.exec(hex)
  if (!m) return false
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16))
  return 0.299 * r + 0.587 * g + 0.114 * b < 140
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

const BADGE_LABELS: Record<string, string> = {
  BEST_SELLER: 'Bán chạy',
  BESTSELLER: 'Bán chạy',
  NEW: 'Mới ra mắt',
  HOT: 'Đang hot',
  FEATURED: 'Nổi bật',
  STAFF_PICK: 'Tuyển chọn',
  LIMITED: 'Giới hạn',
}

/** badgeType của ProductSummary → nhãn tiếng Việt. */
export function badgeLabel(code: string | null | undefined) {
  if (!code) return ''
  return BADGE_LABELS[code.toUpperCase()] ?? categoryLabel(code)
}

/** Số sao trung bình làm tròn 1 chữ số, vd. "4,8". */
export function formatRating(value: number | null | undefined) {
  return (Math.round((Number(value) || 0) * 10) / 10).toLocaleString('vi-VN')
}
