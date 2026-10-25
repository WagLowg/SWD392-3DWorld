import { describe, expect, it } from 'vitest'
import { registerSchema } from './auth.schemas'

const validRegistration = {
  fullName: 'Nguyen Van A',
  email: 'user@example.com',
  phone: '0901234567',
  password: 'StrongPassword!123',
  confirm: 'StrongPassword!123',
  agree: true,
}

describe('registerSchema', () => {
  it('accepts credentials that satisfy the backend contract', () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true)
  })

  it.each(['abcdefgh', 'ABCDEFGH', 'Abcdefgh', 'Abcdefg1'])(
    'rejects a password missing a required character group: %s',
    (password) => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        password,
        confirm: password,
      })

      expect(result.success).toBe(false)
    },
  )
})
