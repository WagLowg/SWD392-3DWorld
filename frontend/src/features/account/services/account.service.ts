import { type ApiEnvelope, http } from '../../../services/http'
import type {
  Address,
  AddressInput,
  BankAccount,
  BankAccountInput,
  Profile,
  ProfileInput,
} from '../types/account.types'

export const profileService = {
  async get(signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<Profile>>('/api/auth/me', { signal })).data
  },

  /** Chỉ cập nhật họ tên và số điện thoại; email không đổi được qua API này. */
  async update(input: ProfileInput) {
    return (await http.patch<ApiEnvelope<Profile>, ProfileInput>('/api/users/me', input)).data
  },
}

export const addressService = {
  async list(signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<Address[]>>('/api/users/me/addresses', { signal })).data ?? []
  },

  /** Địa chỉ đầu tiên tự động thành mặc định. */
  async create(input: AddressInput) {
    return (await http.post<ApiEnvelope<Address>, AddressInput>('/api/users/me/addresses', input)).data
  },

  async update(id: number, input: AddressInput) {
    return (await http.patch<ApiEnvelope<Address>, AddressInput>(`/api/users/me/addresses/${id}`, input)).data
  },

  async remove(id: number) {
    await http.delete<ApiEnvelope<null>>(`/api/users/me/addresses/${id}`)
  },

  async setDefault(id: number) {
    return (await http.post<ApiEnvelope<Address>>(`/api/users/me/addresses/${id}/default`)).data
  },
}

export const bankAccountService = {
  async list(signal?: AbortSignal) {
    return (await http.get<ApiEnvelope<BankAccount[]>>('/api/users/me/bank-accounts', { signal })).data ?? []
  },

  async create(input: BankAccountInput) {
    return (await http.post<ApiEnvelope<BankAccount>, BankAccountInput>('/api/users/me/bank-accounts', input)).data
  },

  /** Sửa tài khoản sẽ đưa trạng thái xác minh về PENDING. */
  async update(id: number, input: BankAccountInput) {
    return (await http.patch<ApiEnvelope<BankAccount>, BankAccountInput>(`/api/users/me/bank-accounts/${id}`, input))
      .data
  },

  /** Xoá mềm (ngừng sử dụng). */
  async remove(id: number) {
    await http.delete<ApiEnvelope<null>>(`/api/users/me/bank-accounts/${id}`)
  },

  async setDefault(id: number) {
    return (await http.post<ApiEnvelope<BankAccount>>(`/api/users/me/bank-accounts/${id}/default`)).data
  },
}
