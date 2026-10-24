import { z } from 'zod'

/** Theo AddressRequest: recipientName, addressLine bắt buộc; phone, ward, district, city/province tuỳ chọn. */
export const addressSchema = z.object({
  recipientName: z.string().trim().min(1, 'Nhập tên người nhận.').max(120, 'Tối đa 120 ký tự.'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9]{8,15})?$/, 'Số điện thoại gồm 8–15 chữ số.')
    .optional(),
  addressLine: z.string().trim().min(1, 'Nhập địa chỉ chi tiết.').max(255, 'Tối đa 255 ký tự.'),
  ward: z.string().trim().max(120, 'Tối đa 120 ký tự.').optional(),
  district: z.string().trim().max(120, 'Tối đa 120 ký tự.').optional(),
  city: z.string().trim().max(120, 'Tối đa 120 ký tự.').optional(),
})

export type AddressFormValues = z.infer<typeof addressSchema>
