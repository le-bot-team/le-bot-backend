import { Elysia, t } from 'elysia'

import { buildSuccessRespBody, errorRespBody } from '@/utils/model'

// Request body schemas
const emailChallengeReqBody = t.Object({
  email: t.String({ format: 'email' }),
})

const emailCodeReqBody = t.Object({
  email: t.String({ format: 'email' }),
  code: t.String({ maxLength: 6, minLength: 6 }),
})

const emailPasswordReqBody = t.Object({
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 8 }),
})

const emailResetReqBody = t.Object({
  email: t.String({ format: 'email' }),
  code: t.String({ maxLength: 6, minLength: 6 }),
  newPassword: t.String({ minLength: 8 }),
})

// Response body schemas
const emailCodeRespBody = buildSuccessRespBody(
  t.Object({
    accessToken: t.String(),
    isNew: t.Boolean(),
    noPassword: t.Boolean(),
  }),
)

const emailChallengeRespBody = buildSuccessRespBody()

const emailPasswordRespBody = buildSuccessRespBody(
  t.Object({
    accessToken: t.String(),
    isNew: t.Boolean(),
    noPassword: t.Boolean(),
  }),
)

const emailResetRespBody = buildSuccessRespBody()

const validateRespBody = buildSuccessRespBody()

export const authModel = new Elysia({ name: 'auth.model' }).model({
  emailChallengeReqBody,
  emailCodeReqBody,
  emailPasswordReqBody,
  emailResetReqBody,
  emailCodeRespBody,
  emailChallengeRespBody,
  emailPasswordRespBody,
  emailResetRespBody,
  validateRespBody,
  errorRespBody,
})
