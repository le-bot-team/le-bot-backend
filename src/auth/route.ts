import { Elysia } from 'elysia'

import { authService } from './service'

export const authRoute = new Elysia({ prefix: '/api/v1/auth' })
  .use(authService)
  .post(
    '/email/code',
    async ({ body: { email, code }, error, store }) => {
      const storedCode = store.emailCodeMap.get(email)
      if (!storedCode || storedCode !== code) {
        return error(400, {
          success: false,
          message: 'Invalid code',
        })
      }

      const userId = store.emailIdMap.get(email)
      if (!userId) {
        return error(400, {
          success: false,
          message: 'Invalid email',
        })
      }

      return {
        success: true,
        message: `Signed in as ${userId}`,
      }
    },
    {
      body: 'signInEmailCode',
    },
  )
