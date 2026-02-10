import { Elysia } from 'elysia'

import { handleUncaughtError } from '@/utils/common'

import { authModel } from './model'
import { Auth, authService } from './service'

export const authRoute = new Elysia({ prefix: '/api/v1/auth', tags: ['Auth'] })
  .use(authModel)
  .use(authService)
  .post(
    '/email/code',
    async ({ body: { email, code } }) => {
      try {
        return await Auth.verifyEmailAndLogin(email, code)
      } catch (e) {
        return handleUncaughtError(e, 500, 'Internal server error')
      }
    },
    {
      body: 'emailCodeReqBody',
      response: {
        200: 'emailCodeRespBody',
        400: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .post(
    '/email/challenge',
    async ({ body: { email } }) => {
      try {
        return await Auth.emailChallenge(email)
      } catch (e) {
        return handleUncaughtError(e, 500, 'Internal server error')
      }
    },
    {
      body: 'emailChallengeReqBody',
      response: {
        200: 'emailChallengeRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .post(
    '/email/password',
    async ({ body: { email, password } }) => {
      try {
        return await Auth.loginWithPassword(email, password)
      } catch (e) {
        return handleUncaughtError(e, 500, 'Internal server error')
      }
    },
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
    async ({ body: { email, code, newPassword } }) => {
      try {
        return await Auth.resetPassword(email, code, newPassword)
      } catch (e) {
        return handleUncaughtError(e, 500, 'Internal server error')
      }
    },
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
