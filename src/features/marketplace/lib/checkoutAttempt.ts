import type { CheckoutInput } from '../types/catalog.types'

const STORAGE_KEY = '3dworld.marketplace.pending-checkout'

export type PendingCheckoutAttempt = {
  payload: CheckoutInput
  createdAt: number
}

function validPayload(value: unknown): value is CheckoutInput {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<CheckoutInput>
  return (
    Array.isArray(payload.cartItemIds) &&
    payload.cartItemIds.length > 0 &&
    payload.cartItemIds.length <= 100 &&
    payload.cartItemIds.every((id) => Number.isInteger(id) && id > 0) &&
    new Set(payload.cartItemIds).size === payload.cartItemIds.length &&
    Number.isInteger(payload.shippingAddressId) &&
    Number(payload.shippingAddressId) > 0 &&
    typeof payload.idempotencyKey === 'string' &&
    payload.idempotencyKey.length > 0 &&
    typeof payload.shippingQuoteToken === 'string' &&
    payload.shippingQuoteToken.length > 0 &&
    (payload.paymentMethod === 'COD' || payload.paymentMethod === 'GATEWAY')
  )
}

export function loadPendingCheckout(): PendingCheckoutAttempt | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const attempt = JSON.parse(raw) as Partial<PendingCheckoutAttempt>
    return validPayload(attempt.payload) && typeof attempt.createdAt === 'number'
      ? { payload: attempt.payload, createdAt: attempt.createdAt }
      : null
  } catch {
    return null
  }
}

export function savePendingCheckout(payload: CheckoutInput): PendingCheckoutAttempt {
  const attempt = { payload, createdAt: Date.now() }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempt))
  } catch {
    // Retry trong cùng page vẫn dùng state; storage chỉ hỗ trợ khôi phục sau reload.
  }
  return attempt
}

export function clearPendingCheckout(idempotencyKey?: string) {
  try {
    if (idempotencyKey) {
      const current = loadPendingCheckout()
      if (current && current.payload.idempotencyKey !== idempotencyKey) return
    }
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Không chặn checkout nếu browser không cho dùng sessionStorage.
  }
}

