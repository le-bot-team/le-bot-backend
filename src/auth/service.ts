import { Elysia } from 'elysia'

import {
  emailChallengeValidator,
  emailCodeValidator,
  emailPasswordValidator,
} from './validation/email'
import {
  phoneChallengeValidator,
  phoneCodeValidator,
  phonePasswordValidator,
} from './validation/phone'

export const authService = new Elysia({ name: 'auth/service' })
  .state({
    accessTokenToUserIdMap: new Map<string, bigint>(),
    accessTokenCreatedAtMap: new Map<string, Date>(),
    emailToCodeMap: new Map<string, string>(),
    userIdToAccessTokenMap: new Map<number, string>(),
  })
  .model({
    emailChallenge: emailChallengeValidator,
    emailCode: emailCodeValidator,
    emailPassword: emailPasswordValidator,
    phoneChallenge: phoneChallengeValidator,
    phoneCode: phoneCodeValidator,
    phonePassword: phonePasswordValidator,
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
