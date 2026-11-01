import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { addressService, orderService, paymentService, shippingService } from '../services/order.service'
import type { AddressInput, CheckoutInput, ShippingQuoteInput } from '../types/catalog.types'
import { cartKey } from './useCart'
import { useSession } from '../../../shared/session/useSession'

export const addressKey = ['addresses'] as const
const shippingQuoteKey = ['shipping', 'quote'] as const

export function useAddresses() {
  const { data: user } = useSession()
  return useQuery({
    queryKey: addressKey,
    queryFn: ({ signal }) => addressService.list(signal),
    enabled: !!user,
  })
}

export function useCreateAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddressInput) => addressService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressKey }),
  })
}

type DebouncedQuoteRequest = {
  input: ShippingQuoteInput
  signature: string
}

/** POST quote được quản lý như server state; signature có quantity để đổi số lượng luôn tạo quote mới. */
export function useShippingQuote(
  input: ShippingQuoteInput | null,
  cartFingerprint: string,
  refreshKey = 0,
  debounceMs = 300,
) {
  const signature = useMemo(
    () =>
      input
        ? `${input.shippingAddressId}:${input.cartItemIds.join(',')}:${cartFingerprint}:${refreshKey}`
        : '',
    [input, cartFingerprint, refreshKey],
  )
  const [debounced, setDebounced] = useState<DebouncedQuoteRequest | null>(null)

  useEffect(() => {
    setDebounced(null)
    if (!input) return

    const request = {
      input: { ...input, cartItemIds: [...input.cartItemIds] },
      signature,
    }
    const timer = window.setTimeout(() => setDebounced(request), debounceMs)
    return () => window.clearTimeout(timer)
  }, [input, signature, debounceMs])

  const ready = !!debounced && debounced.signature === signature
  const query = useQuery({
    queryKey: [...shippingQuoteKey, debounced?.signature ?? 'idle'],
    queryFn: ({ signal }) => {
      if (!debounced) throw new Error('Shipping quote request is not ready.')
      return shippingService.quote(debounced.input, signal)
    },
    enabled: ready,
    retry: false,
    staleTime: 0,
  })

  return {
    ...query,
    data: ready ? query.data : undefined,
    error: ready ? query.error : null,
    isDebouncing: !!input && !ready,
    requestSignature: signature,
  }
}

export function useCheckout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CheckoutInput) => orderService.checkout(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cartKey }),
  })
}

export function useZaloPayPayment() {
  return useMutation({ mutationFn: (orderId: number) => paymentService.payOrderWithZaloPay(orderId) })
}
