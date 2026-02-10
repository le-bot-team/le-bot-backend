import { Elysia } from 'elysia'

import { authModel } from './model'
import { Auth, authService } from './service'

export const authRoute = new Elysia({ prefix: '/api/v1/auth', tags: ['Auth'] })
  .use(authModel)
  .use(authService)
  .post(
    '/email/code',
    async ({ body: { email, code } }) => await Auth.verifyEmailAndLogin(email, code),
    {
      body: 'emailCodeReqBody',
      response: {
        200: 'emailCodeRespBody',
        400: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .post('/email/challenge', async ({ body: { email } }) => await Auth.emailChallenge(email), {
    body: 'emailChallengeReqBody',
    response: {
      200: 'emailChallengeRespBody',
      500: 'errorRespBody',
    },
  })
  .post(
    '/email/password',
    async ({ body: { email, password } }) => await Auth.loginWithPassword(email, password),
    {
      body: 'emailPasswordReqBody',
      response: {
        200: 'emailPasswordRespBody',
        401: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .post(
    '/email/reset',
    async ({ body: { email, code, newPassword } }) =>
      await Auth.resetPassword(email, code, newPassword),
    {
      body: 'emailResetReqBody',
      response: {
        200: 'emailResetRespBody',
        400: 'errorRespBody',
        404: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .get('/validate', () => ({ success: true as const, data: undefined }), {
    resolveAccessToken: true,
    response: {
      200: 'validateRespBody',
      500: 'errorRespBody',
    },
  })
