import { t } from 'elysia'

export const emailChallengeValidator = t.Object({
  email: t.String({ format: 'email' }),
})

export const emailCodeValidator = t.Object({
  email: t.String({ format: 'email' }),
  code: t.String({ maxLength: 6, minLength: 6 }),
})

export const emailPasswordValidator = t.Object({
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 8 }),
})

export const emailResetValidator = t.Object({
  email: t.String({ format: 'email' }),
  code: t.String({ maxLength: 6, minLength: 6 }),
  newPassword: t.String({ minLength: 8 }),
})
