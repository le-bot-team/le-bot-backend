import { Elysia } from 'elysia'

import { authService } from './service'

export const getUserId = new Elysia({name: 'auth/getUserId'})
  .use(authService)
  .guard({
    checkAccessToken: true,
  })
  .resolve(({ headers, store: { accessTokenToUserIdMap } }) => ({
    userId: accessTokenToUserIdMap.get((headers['x-access-token'] as string)),
  }))
