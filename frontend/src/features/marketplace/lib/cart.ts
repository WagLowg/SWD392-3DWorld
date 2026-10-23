import type { VariantInfo } from '../stores/variant-index.store'
import type { CartItem } from '../types/catalog.types'

export type CartGroup = {
  /** null khi chưa biết món thuộc xưởng nào (CartItemResponse chưa có storefrontId). */
  storefrontId: number | null
  items: CartItem[]
  subtotal: number
  quantity: number
}

/** Nhóm các món (còn mua được) theo xưởng — mỗi xưởng sẽ thành một đơn con khi đặt hàng. */
export function groupByStorefront(items: CartItem[], index: Record<number, VariantInfo>): CartGroup[] {
  const groups = new Map<number | null, CartGroup>()
  for (const item of items) {
    const storefrontId = index[item.variantId]?.storefrontId ?? null
    const group = groups.get(storefrontId) ?? { storefrontId, items: [], subtotal: 0, quantity: 0 }
    group.items.push(item)
    group.subtotal += Number(item.lineTotal) || 0
    group.quantity += item.quantity
    groups.set(storefrontId, group)
  }
  // nhóm chưa xác định luôn ở cuối
  return [...groups.values()].sort(
    (a, b) => (a.storefrontId ?? Number.MAX_SAFE_INTEGER) - (b.storefrontId ?? Number.MAX_SAFE_INTEGER),
  )
}

export function storefrontName(storefrontId: number | null) {
  return storefrontId === null ? 'Xưởng chưa xác định' : `Xưởng #${storefrontId}`
}

/** Mã viết tắt cho avatar xưởng. */
export function storefrontInitials(storefrontId: number | null) {
  return storefrontId === null ? '?' : `#${storefrontId}`
}
