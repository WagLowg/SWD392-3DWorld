import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type PaymentRef = { transactionId: number; amount: number; createdAt: string }

type OrderPaymentsState = {
  byOrder: Record<number, PaymentRef>
  remember: (orderId: number, ref: Omit<PaymentRef, 'createdAt'>) => void
}

/**
 * OrderResponse chưa có transactionId, nhưng API hoàn tiền cần transactionId.
 * Ghi nhớ giao dịch ZaloPay đã tạo cho từng đơn để form hoàn tiền điền sẵn.
 * TODO(Backend): trả transactionId / trạng thái thanh toán trong OrderResponse thì bỏ store này.
 */
export const useOrderPaymentsStore = create<OrderPaymentsState>()(
  persist(
    (set) => ({
      byOrder: {},
      remember: (orderId, ref) =>
        set((s) => ({ byOrder: { ...s.byOrder, [orderId]: { ...ref, createdAt: new Date().toISOString() } } })),
    }),
    { name: '3dworld.order-payments' },
  ),
)
