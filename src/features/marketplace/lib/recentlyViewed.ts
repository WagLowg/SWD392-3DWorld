import { useSyncExternalStore } from 'react'
import type { ProductSummary } from '../types/catalog.types'

/** Sản phẩm vừa xem — chỉ lưu trên trình duyệt của người xem. */
const KEY = 'mp:recently-viewed'
const LIMIT = 10
const listeners = new Set<() => void>()
let cache: ProductSummary[] | null = null

function read(): ProductSummary[] {
  if (cache) return cache
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    cache = Array.isArray(parsed) ? parsed : []
  } catch {
    cache = []
  }
  return cache
}

export function rememberViewed(product: ProductSummary) {
  const next = [product, ...read().filter((p) => p.id !== product.id)].slice(0, LIMIT)
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // bộ nhớ trình duyệt bị chặn → chỉ giữ trong phiên
  }
  for (const l of listeners) l()
}

export function clearViewed() {
  cache = []
  try {
    localStorage.removeItem(KEY)
  } catch {
    // bỏ qua
  }
  for (const l of listeners) l()
}

const EMPTY: ProductSummary[] = []

export function useRecentlyViewed() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => EMPTY,
  )
}
