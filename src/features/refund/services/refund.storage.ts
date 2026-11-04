export const REFUND_STORAGE_KEY = '3dworld_customer_refunds_v2'

export interface LocalRefundCase {
  id: number
  orderId: number
  orderCode: string
  productTitle: string
  attributes?: string | null
  storefrontId?: number
  storefrontName?: string
  sellerName?: string
  sellerPhone?: string
  amount: number
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'SUCCESS' | 'COMPLETED' | 'REJECTED' | 'FAILED'
  reason: string
  detail?: string
  bankName: string
  bankCode?: string
  accountNumberMasked: string
  accountNumber?: string
  accountHolder: string
  createdAt: string
  images?: string[]
  transferReference?: string | null
  staffReviewReason?: string | null
  shippingPayer?: 'SELLER' | 'PLATFORM' | 'BUYER'
  outboundFee?: number
  returnFee?: number
  carrierReference?: string
}

export function getLocalRefunds(): LocalRefundCase[] {
  try {
    const raw = localStorage.getItem(REFUND_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return []
}

export function saveLocalRefundCase(newCase: LocalRefundCase): LocalRefundCase[] {
  const cleanAccount = newCase.accountNumber || newCase.accountNumberMasked || ''
  const caseToSave: LocalRefundCase = {
    ...newCase,
    accountNumber: cleanAccount,
    accountNumberMasked: cleanAccount,
  }
  const current = getLocalRefunds()
  const existsIndex = current.findIndex((c) => c.id === caseToSave.id || c.orderId === caseToSave.orderId)
  let updated: LocalRefundCase[]
  if (existsIndex >= 0) {
    updated = current.map((c, idx) => (idx === existsIndex ? { ...c, ...caseToSave } : c))
  } else {
    updated = [caseToSave, ...current]
  }

  try {
    localStorage.setItem(REFUND_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('3dworld:refunds:updated', { detail: updated }))
  } catch {
    // ignore
  }
  return updated
}

export function updateLocalRefundStatus(id: number, updates: Partial<LocalRefundCase>): LocalRefundCase | null {
  const current = getLocalRefunds()
  let target: LocalRefundCase | null = null
  const updated = current.map((item) => {
    if (item.id === id || item.orderId === id) {
      target = { ...item, ...updates }
      return target
    }
    return item
  })

  if (target) {
    try {
      localStorage.setItem(REFUND_STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('3dworld:refunds:updated', { detail: updated }))
    } catch {
      // ignore
    }
  }
  return target
}

export function getRefundById(id: number | string): LocalRefundCase | undefined {
  const all = getLocalRefunds()
  const num = Number(id)
  return all.find((r) => r.id === num || r.orderId === num)
}
