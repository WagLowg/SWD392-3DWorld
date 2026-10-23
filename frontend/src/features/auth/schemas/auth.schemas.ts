import { z } from 'zod'

const email = z.string().trim().min(1, 'Nhập email.').email('Email không hợp lệ.').max(320)

/** Backend: 8–72 byte UTF-8. */
const password = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự.')
  .refine((v) => new TextEncoder().encode(v).length <= 72, 'Mật khẩu tối đa 72 byte.')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Nhập mật khẩu.'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Tên hiển thị tối thiểu 2 ký tự.').max(255),
    email,
    phone: z
      .string()
      .trim()
      .regex(/^(\+?[0-9]{8,15})?$/, 'Số điện thoại gồm 8–15 chữ số.')
      .optional(),
    password,
    confirm: z.string(),
    agree: z.boolean().refine((v) => v, 'Bạn cần đồng ý điều khoản để tiếp tục.'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Mật khẩu nhập lại không khớp.' })
export type RegisterValues = z.infer<typeof registerSchema>

export const emailOnlySchema = z.object({ email })
export type EmailOnlyValues = z.infer<typeof emailOnlySchema>

export const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Mật khẩu nhập lại không khớp.' })
export type ResetValues = z.infer<typeof resetSchema>

/** Token trong link email: 43 ký tự base64url. */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
