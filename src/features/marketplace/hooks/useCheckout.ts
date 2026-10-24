import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addressService, orderService, paymentService } from '../services/order.service'
import type { AddressInput, CheckoutInput } from '../types/catalog.types'
import { cartKey } from './useCart'
import { useSession } from '../../../shared/session/useSession'

const addressKey = ['addresses'] as const

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
