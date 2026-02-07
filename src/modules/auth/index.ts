import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'

import { db } from '@/database'
import { userProfiles, users } from '@/database/schema'
import { log } from '@/log'

import { authModel } from './model'
import { Auth, authService, setAccessToken } from './service'

export const authRoute = new Elysia({ prefix: '/api/v1/auth', tags: ['Auth'] })
  .use(authModel)
  .use(authService)
  .post(
    '/email/code',
    async ({ body: { email, code } }) => {
      if (!(await Auth.verifyEmailCode(email, code))) {
        return {
          success: false,
          message: 'Invalid code',
        }
      }

      const selectedUser = (
        await db.select().from(users).where(eq(users.email, email)).limit(1)
      )[0]
      if (!selectedUser) {
        const insertedUser = (
          await db
            .insert(users)
            .values({
              email,
            })
            .returning({ id: users.id })
        )[0]
        if (!insertedUser) {
          return {
            success: false,
            message: 'Failed to create user',
          }
        }
        if (
          !(
            await db
              .insert(userProfiles)
              .values({
                id: insertedUser.id,
              })
              .returning({ id: users.id })
          ).length
        ) {
          return {
            success: false,
            message: 'Failed to create user',
          }
        }

        const accessToken = Bun.randomUUIDv7()
        await setAccessToken(accessToken, insertedUser.id)
        return {
          success: true,
          data: {
            accessToken,
            isNew: true,
            noPassword: true,
          },
        }
      } else {
        if (selectedUser.passwordHash?.length) {
          await Auth.deleteEmailCode(email)
        }
        const accessToken = Bun.randomUUIDv7()
        await setAccessToken(accessToken, selectedUser.id)
        return {
          success: true,
          data: {
            accessToken,
            isNew: false,
            noPassword: !selectedUser.passwordHash?.length,
          },
        }
      }
    },
    {
      body: 'emailCodeReqBody',
    },
  )
  .post(
    '/email/challenge',
    async ({ body: { email } }) => {
      return await Auth.emailChallenge(email)
    },
    { body: 'emailChallengeReqBody' },
  )
  .post(
    '/email/password',
    async ({ body: { email, password } }) => {
      const selectedUser = (
        await db.select().from(users).where(eq(users.email, email)).limit(1)
      )[0]
      if (!selectedUser) {
        return {
          success: false,
          message: 'User not found',
        }
      }
      if (!selectedUser.passwordHash?.length) {
        return {
          success: false,
          message: 'No password set, please use code to sign in',
        }
      }
      if (!(await Bun.password.verify(password, selectedUser.passwordHash))) {
        return {
          success: false,
          message: 'Invalid password',
        }
      }
      const accessToken = Bun.randomUUIDv7()
      await setAccessToken(accessToken, selectedUser.id)

      log.info({ accessToken }, 'Access Token:')
      return {
        success: true,
        data: {
          accessToken,
          isNew: false,
          noPassword: false,
        },
      }
    },
    { body: 'emailPasswordReqBody' },
  )
  .post(
    '/email/reset',
    async ({ body: { email, code, newPassword } }) => {
      if (!(await Auth.verifyEmailCode(email, code))) {
        return {
          success: false,
          message: 'Invalid code',
        }
      }
      const selectedUser = (
        await db.select().from(users).where(eq(users.email, email))
      )[0]
      if (!selectedUser) {
        return {
          success: false,
          message: 'User not found',
        }
      }
      const updateResult = await db
        .update(users)
        .set({
          passwordHash: await Bun.password.hash(newPassword, {
            algorithm: 'bcrypt',
          }),
        })
        .where(eq(users.id, selectedUser.id))
        .returning({ id: users.id })
      if (!updateResult.length) {
        return {
          success: false,
          message: 'Failed to update password',
        }
      }
      await Auth.deleteEmailCode(email)
      return {
        success: true,
      }
    },
    {
      body: 'emailResetReqBody',
    },
  )
  .get(
    '/validate',
    () => ({
      success: true,
    }),
    {
      checkAccessToken: true,
    },
  )
