import { http } from '../../../shared/api'
import type { AddCartItemInput, ApiEnvelope, Cart } from '../types/catalog.types'

type CartEnvelope = ApiEnvelope<Cart>

export const cartService = {
  async get(signal?: AbortSignal) {
    return (await http.get<CartEnvelope>('/api/cart', { signal })).data
  },

  async addItem(input: AddCartItemInput) {
    return (await http.post<CartEnvelope, AddCartItemInput>('/api/cart/items', input)).data
  },

  async updateQuantity(itemId: number, quantity: number) {
    return (await http.patch<CartEnvelope, { quantity: number }>(`/api/cart/items/${itemId}`, { quantity })).data
  },

  async removeItem(itemId: number) {
    return (await http.delete<CartEnvelope>(`/api/cart/items/${itemId}`)).data
  },

  /** Kiểm tra lại trạng thái sản phẩm/variant và tồn kho trước khi thanh toán. */
  async revalidate() {
    return (await http.post<CartEnvelope>('/api/cart/revalidate')).data
  },
}
