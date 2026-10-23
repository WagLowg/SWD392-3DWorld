import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiClientError } from '../../../services/http'
import { goLogin } from '../../../shared/auth'
import { cartService } from '../services/cart.service'
import { useMarketplaceUiStore } from '../stores/marketplace-ui.store'
import type { AddCartItemInput, Cart } from '../types/catalog.types'
import { useSession } from '../../../shared/session/useSession'

export const cartKey = ['cart'] as const

export function errorMessage(error: unknown, fallback = 'Không thể cập nhật giỏ hàng. Vui lòng thử lại.') {
  return error instanceof ApiClientError ? error.message : fallback
}

export function isUnauthorized(error: unknown) {
  return error instanceof ApiClientError && (error.status === 401 || error.status === 403)
}

export function useCart() {
  const { data: user } = useSession()
  return useQuery({
    queryKey: cartKey,
    queryFn: ({ signal }) => cartService.get(signal),
    enabled: !!user,
  })
}

/** Mutation dùng chung: cập nhật cache giỏ từ response, báo lỗi qua toast, 401 → đăng nhập. */
function useCartMutation<Variables>(mutationFn: (v: Variables) => Promise<Cart>, successMessage?: string) {
  const queryClient = useQueryClient()
  const showToast = useMarketplaceUiStore((s) => s.showToast)
  return useMutation({
    mutationFn,
    onSuccess(cart) {
      queryClient.setQueryData(cartKey, cart)
      if (successMessage) showToast(successMessage)
    },
    onError(error) {
      if (isUnauthorized(error)) return goLogin()
      showToast(errorMessage(error), 'error')
    },
  })
}

export function useAddToCart() {
  const { data: user } = useSession()
  const queryClient = useQueryClient()
  const showToast = useMarketplaceUiStore((s) => s.showToast)
  const mutation = useMutation({
    mutationFn: (input: AddCartItemInput) => cartService.addItem(input),
    onSuccess(cart) {
      queryClient.setQueryData(cartKey, cart)
    },
    onError(error) {
      if (isUnauthorized(error)) return goLogin()
      showToast(errorMessage(error), 'error')
    },
  })

  /** Thêm vào giỏ; trả về giỏ mới (hoặc null nếu chưa đăng nhập / lỗi). */
  const addToCart = async (input: AddCartItemInput, options?: { silent?: boolean }) => {
    if (!user) {
      goLogin()
      return null
    }
    try {
      const cart = await mutation.mutateAsync(input)
      if (!options?.silent) showToast('Đã thêm vào giỏ hàng.', 'success', { label: 'Xem giỏ', to: '/cart' })
      return cart
    } catch {
      return null
    }
  }

  return { ...mutation, addToCart }
}

export function useUpdateCartItem() {
  return useCartMutation(({ itemId, quantity }: { itemId: number; quantity: number }) =>
    cartService.updateQuantity(itemId, quantity),
  )
}

export function useRemoveCartItem() {
  return useCartMutation((itemId: number) => cartService.removeItem(itemId))
}

export function useRevalidateCart() {
  return useCartMutation(() => cartService.revalidate(), 'Đã kiểm tra lại tồn kho & giá.')
}
