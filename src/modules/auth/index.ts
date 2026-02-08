import { Elysia } from 'elysia'

import { buildErrorResponse } from '@/utils/common'

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
        return buildErrorResponse(500, (e as Error).message)
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
        return buildErrorResponse(500, (e as Error).message)
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
        return buildErrorResponse(500, (e as Error).message)
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
        return buildErrorResponse(500, (e as Error).message)
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
  .get(
    '/validate',
    () => ({ success: true as const, data: undefined }),
    {
      checkAccessToken: true,
      response: {
        200: 'validateRespBody',
        500: 'errorRespBody',
      },
    },
  )
