import { Elysia, t } from 'elysia'

export const authModel = new Elysia({ name: 'auth.model' }).model({
  emailChallengeReqBody: t.Object({
    email: t.String({ format: 'email' }),
  }),
  emailCodeReqBody: t.Object({
    email: t.String({ format: 'email' }),
    code: t.String({ maxLength: 6, minLength: 6 }),
  }),
  emailPasswordReqBody: t.Object({
    email: t.String({ format: 'email' }),
    password: t.String({ minLength: 8 }),
  }),
  emailResetReqBody: t.Object({
    email: t.String({ format: 'email' }),
    code: t.String({ maxLength: 6, minLength: 6 }),
    newPassword: t.String({ minLength: 8 }),
  }),
  phoneChallengeReqBody: t.Object({
    phone: t.String({ format: 'phone' }),
  }),
  phoneCodeReqBody: t.Object({
    phone: t.String({ format: 'phone' }),
    code: t.String({ maxLength: 6, minLength: 6 }),
  }),
  phonePasswordReqBody: t.Object({
    phone: t.String({ format: 'phone' }),
    password: t.String({ minLength: 8 }),
  }),
  phoneResetReqBody: t.Object({
    phone: t.String({ format: 'phone' }),
    code: t.String({ maxLength: 6, minLength: 6 }),
    newPassword: t.String({ minLength: 8 }),
  }),
})
