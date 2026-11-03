export const REFUND_STORAGE_KEY = '3dworld_customer_refunds_v1'

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

export const DEFAULT_REFUND_SEEDS: LocalRefundCase[] = [
  {
    id: 112,
    orderId: 45,
    orderCode: 'ORD-00045',
    productTitle: 'Đèn ngủ cú mèo đáng yêu',
    attributes: 'size: "ONE_SIZE", color: "Trắng", material: "FDMPETG" — Họa tiết: V1',
    storefrontId: 12,
    storefrontName: 'Xưởng #12',
    sellerName: 'Người bán',
    amount: 374200,
    status: 'PAID',
    reason: 'Sản phẩm bị vỡ / hư hại khi vận chuyển',
    detail: 'Sản phẩm bị vỡ / hư hại khi vận chuyển',
    bankName: 'Vietcombank',
    bankCode: 'VCB',
    accountNumberMasked: '0000000000000003',
    accountNumber: '0000000000000003',
    accountHolder: 'Nhiên thái',
    createdAt: '2026-11-02T06:24:47.5448+00:00',
    transferReference: 'FT261102976857',
    staffReviewReason: 'ok',
    shippingPayer: 'SELLER',
    outboundFee: 31200,
    returnFee: 31200,
    carrierReference: 'GHTK-REFUND-45',
  },
]

export function getOrSeedLocalRefunds(): LocalRefundCase[] {
  try {
    const raw = localStorage.getItem(REFUND_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        // Loại bỏ seed mock #REF-42 cũ
        const cleaned = parsed.filter(
          (p: any) => !(p.orderId === 42 && p.productTitle === 'Tượng Jade cute'),
        )
        // Đảm bảo case #REF-112 luôn có mặt trong danh sách cho khách hàng và staff tra cứu
        if (!cleaned.some((p: any) => p.id === 112 || p.orderId === 45)) {
          cleaned.push(...DEFAULT_REFUND_SEEDS)
        }
        localStorage.setItem(REFUND_STORAGE_KEY, JSON.stringify(cleaned))
        return cleaned
      }
    }
  } catch {
    // ignore
  }

  try {
    localStorage.setItem(REFUND_STORAGE_KEY, JSON.stringify(DEFAULT_REFUND_SEEDS))
  } catch {}
  return [...DEFAULT_REFUND_SEEDS]
}

export function saveLocalRefundCase(newCase: LocalRefundCase): LocalRefundCase[] {
  const cleanAccount = newCase.accountNumber || newCase.accountNumberMasked?.replace(/\*/g, '0') || '0000000000000003'
  const caseToSave: LocalRefundCase = {
    ...newCase,
    accountNumber: cleanAccount,
    accountNumberMasked: cleanAccount,
  }
  const current = getOrSeedLocalRefunds()
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

export function updateLocalRefundStatus(
  id: number,
  updates: Partial<LocalRefundCase>,
): LocalRefundCase | null {
  const current = getOrSeedLocalRefunds()
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
  const all = getOrSeedLocalRefunds()
  const num = Number(id)
  return all.find((r) => r.id === num || r.orderId === num)
}

