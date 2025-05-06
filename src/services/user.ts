import { Elysia, t } from 'elysia'

export const authService = new Elysia({ name: 'auth/service' })
  .state({
    accessTokenToUserIdMap: new Map<string, number>(),
    accessTokenCreatedAtMap: new Map<string, Date>(),
    userIdToAccessTokenMap: new Map<number, string>(),
  })
  .model({
    signInEmailCode: t.Object({
      email: t.String({ format: 'email' }),
      code: t.String({ maxLength: 6, minLength: 6 }),
    }),
    signInEmailPassword: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 8 }),
    }),
    signInPhoneCode: t.Object({
      phone: t.String({ format: 'phone' }),
      code: t.String({ maxLength: 6, minLength: 6 }),
    }),
    signInPhonePassword: t.Object({
      phone: t.String({ format: 'phone' }),
      password: t.String({ minLength: 8 }),
    }),
  })
  .macro({
    checkAccessToken: (enabled: boolean) => {
      if (!enabled) {
        return
      }

      return {
        beforeHandle({ headers, store }) {
          if (!headers['x-access-token']) {
            return {
              status: 401,
              body: {
                success: false,
                message: 'Missing access token',
              },
            }
          }
          const accessToken = headers['x-access-token']

          const createdAt = store.accessTokenCreatedAtMap.get(accessToken)
          const userId = store.accessTokenToUserIdMap.get(accessToken)
          if (!createdAt || !userId) {
            store.accessTokenToUserIdMap.delete(accessToken)
            store.accessTokenCreatedAtMap.delete(accessToken)
            return {
              status: 401,
              body: {
                success: false,
                message: 'Invalid access token',
              },
            }
          }
          const now = new Date()
          const diff = now.getTime() - createdAt.getTime()
          if (diff > 24 * 3600 * 1000) {
            store.accessTokenToUserIdMap.delete(accessToken)
            store.accessTokenCreatedAtMap.delete(accessToken)
            return {
              status: 401,
              body: {
                success: false,
                message: 'Access token expired',
              },
            }
          }
          store.accessTokenCreatedAtMap.set(accessToken, new Date())
        },
      }
    },
  })
