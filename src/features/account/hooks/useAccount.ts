import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../../shared/session/useSession'
import { addressService, bankAccountService, profileService } from '../services/account.service'
import type { AddressInput, BankAccountInput, ProfileInput } from '../types/account.types'

export const accountKeys = {
  profile: ['account', 'profile'] as const,
  /** Dùng chung key với Checkout của Marketplace. */
  addresses: ['addresses'] as const,
  banks: ['account', 'bank-accounts'] as const,
}

export function useProfile() {
  const { data: user } = useSession()
  return useQuery({
    queryKey: accountKeys.profile,
    queryFn: ({ signal }) => profileService.get(signal),
    enabled: !!user,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfileInput) => profileService.update(input),
    onSuccess: (profile) => {
      qc.setQueryData(accountKeys.profile, profile)
      qc.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })
}

export function useAddressList() {
  const { data: user } = useSession()
  return useQuery({
    queryKey: accountKeys.addresses,
    queryFn: ({ signal }) => addressService.list(signal),
    enabled: !!user,
  })
}

export function useAddressMutations() {
  const qc = useQueryClient()
  const onSuccess = () => qc.invalidateQueries({ queryKey: accountKeys.addresses })
  return {
    create: useMutation({ mutationFn: (input: AddressInput) => addressService.create(input), onSuccess }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: number; input: AddressInput }) => addressService.update(id, input),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: (id: number) => addressService.remove(id), onSuccess }),
    setDefault: useMutation({ mutationFn: (id: number) => addressService.setDefault(id), onSuccess }),
  }
}

export function useBankAccounts() {
  const { data: user } = useSession()
  return useQuery({
    queryKey: accountKeys.banks,
    queryFn: ({ signal }) => bankAccountService.list(signal),
    enabled: !!user,
  })
}

export function useBankAccountMutations() {
  const qc = useQueryClient()
  const onSuccess = () => qc.invalidateQueries({ queryKey: accountKeys.banks })
  return {
    create: useMutation({ mutationFn: (input: BankAccountInput) => bankAccountService.create(input), onSuccess }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: number; input: BankAccountInput }) => bankAccountService.update(id, input),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: (id: number) => bankAccountService.remove(id), onSuccess }),
    setDefault: useMutation({ mutationFn: (id: number) => bankAccountService.setDefault(id), onSuccess }),
  }
}
