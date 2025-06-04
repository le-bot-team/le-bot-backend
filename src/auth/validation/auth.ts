import { t } from 'elysia'

export const emailCodeValidator = t.Object({
  email: t.String({ format: 'email' }),
  code: t.String({ maxLength: 6, minLength: 6 }),
})

export const emailPasswordValidator = t.Object({
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 8 }),
})

export const phoneCodeValidator = t.Object({
  phone: t.String({ format: 'phone' }),
  code: t.String({ maxLength: 6, minLength: 6 }),
})

export const phonePasswordValidator = t.Object({
  phone: t.String({ format: 'phone' }),
  password: t.String({ minLength: 8 }),
})