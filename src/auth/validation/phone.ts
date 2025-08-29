import { t } from 'elysia'

export const phoneChallengeValidator = t.Object({
  phone: t.String({ format: 'phone' }),
})

export const phoneCodeValidator = t.Object({
  phone: t.String({ format: 'phone' }),
  code: t.String({ maxLength: 6, minLength: 6 }),
})

export const phonePasswordValidator = t.Object({
  phone: t.String({ format: 'phone' }),
  password: t.String({ minLength: 8 }),
})

export const phoneResetValidator = t.Object({
  phone: t.String({ format: 'phone' }),
  code: t.String({ maxLength: 6, minLength: 6 }),
  newPassword: t.String({ minLength: 8 }),
})
