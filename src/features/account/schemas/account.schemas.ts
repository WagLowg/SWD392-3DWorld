import { z } from 'zod'

const phone = z
  .string()
  .trim()
  .regex(/^(\+?[0-9]{8,15})?$/, 'Số điện thoại gồm 8–15 chữ số.')
  .optional()

/** UpdateProfileRequest: fullName bắt buộc, phone tuỳ chọn. */
export const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Nhập họ và tên.').max(255, 'Tối đa 255 ký tự.'),
  phone,
})
export type ProfileFormValues = z.infer<typeof profileSchema>

/** AddressRequest đầy đủ cho giao hàng và địa chỉ lấy hàng GHTK. */
export const addressSchema = z.object({
  recipientName: z.string().trim().min(1, 'Nhập tên người nhận.').max(120, 'Tối đa 120 ký tự.'),
  phone: z.string().trim().regex(/^\+?[0-9]{8,15}$/, 'Số điện thoại gồm 8–15 chữ số.'),
  addressLine: z.string().trim().min(1, 'Nhập địa chỉ chi tiết.').max(255, 'Tối đa 255 ký tự.'),
  province: z.string().trim().min(1, 'Nhập tỉnh/thành phố.').max(255, 'Tối đa 255 ký tự.'),
  district: z.string().trim().max(255, 'Tối đa 255 ký tự.').optional(),
  ward: z.string().trim().min(1, 'Nhập phường/xã.').max(255, 'Tối đa 255 ký tự.'),
})
export type AddressFormValues = z.infer<typeof addressSchema>

/** BankRequest: cả 4 trường bắt buộc. */
export const bankAccountSchema = z.object({
  bankCode: z
    .string()
    .trim()
    .min(2, 'Nhập mã ngân hàng (vd. VCB).')
    .max(20, 'Tối đa 20 ký tự.')
    .transform((v) => v.toUpperCase()),
  bankName: z.string().trim().min(1, 'Nhập tên ngân hàng.').max(120, 'Tối đa 120 ký tự.'),
  accountHolder: z.string().trim().min(1, 'Nhập tên chủ tài khoản.').max(120, 'Tối đa 120 ký tự.'),
  accountNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{6,20}$/, 'Số tài khoản gồm 6–20 chữ số.'),
})
export type BankAccountFormValues = z.infer<typeof bankAccountSchema>
