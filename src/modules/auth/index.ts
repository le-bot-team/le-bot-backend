import { Elysia } from 'elysia'

import { authModel } from './model'
import { Auth } from './service'

export const auth = new Elysia({ prefix: '/api/v1/auth', tags: ['Auth'] })
  .use(authModel)
  .post('/email/code', async () => {}, {
    body: 'emailCodeReqBody',
    response: {},
  })
  .post(
    '/email/challenge',
    async ({ body }) => {
      const result = Auth.emailChallenge(body.email)
    },
    {
      body: 'emailChallengeReqBody',
      response: {},
    },
  )
  .post('/email/password', async () => {}, {
    body: 'emailPasswordReqBody',
    response: {},
  })
  .post('/email/reset', async () => {}, {
    body: 'emailResetReqBody',
    response: {},
  })
  .get('/validate', async () => {})
