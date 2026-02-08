import { redis } from 'bun'
import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import nodemailer from 'nodemailer'

import { db } from '@/database'
import { userProfiles, users } from '@/database/schema'
import { log } from '@/log'
import { buildAccessTokenRedisKey, buildChallengeCodeRedisKey } from '@/modules/auth/utils'
import { buildErrorResponse, buildSuccessResponse } from '@/utils/common'

const transport = nodemailer.createTransport({
  host: Bun.env.SMTP_HOST,
  port: Bun.env.SMTP_PORT,
  auth: {
    user: Bun.env.SMTP_USERNAME,
    pass: Bun.env.SMTP_PASSWORD,
  },
})

export const getUserIdByAccessToken = async (token: string): Promise<string | null> => {
  return await redis.get(buildAccessTokenRedisKey(token))
}

export const setAccessToken = async (token: string, userId: string): Promise<void> => {
  await redis.set(buildAccessTokenRedisKey(token), userId, 'EX', Number(Bun.env.TTL_ACCESS_TOKEN))
}

export const deleteAccessToken = async (token: string): Promise<void> => {
  await redis.del(buildAccessTokenRedisKey(token))
}

export abstract class Auth {
  static async emailChallenge(email: string) {
    const code = Bun.randomUUIDv7().slice(0, 6).toUpperCase()
    await redis.set(buildChallengeCodeRedisKey(email), code, 'EX', Number(Bun.env.TTL_CHALLENGE_CODE))
    try {
      await transport.sendMail({
        from: 'Le Bot Official <noreply@studio26f.org>',
        to: email,
        subject: '[Le Bot] 校验您的电子邮件地址 Verify your email address',
        html: (await Bun.file('src/modules/auth/assets/emailChallenge.html').text()).replace(
          '{{VERIFY_CODE}}',
          code,
        ),
      })
      return buildSuccessResponse(null)
    } catch (e) {
      log.error(e, 'Failed to send email')
      return buildErrorResponse(500, 'Failed to send email')
    }
  }

  static async verifyEmailCode(email: string, code: string): Promise<boolean> {
    const storedCode = await redis.get(buildChallengeCodeRedisKey(email))
    return !!storedCode && storedCode === code
  }

  static async deleteEmailCode(email: string): Promise<void> {
    await redis.del(buildChallengeCodeRedisKey(email))
  }

  static async verifyEmailAndLogin(email: string, code: string) {
    if (!(await Auth.verifyEmailCode(email, code))) {
      return buildErrorResponse(400, 'Invalid code')
    }

    const selectedUser = (
      await db.select().from(users).where(eq(users.email, email)).limit(1)
    )[0]

    if (!selectedUser) {
      const insertedUser = (
        await db
          .insert(users)
          .values({ email })
          .returning({ id: users.id })
      )[0]
      if (!insertedUser) {
        return buildErrorResponse(500, 'Failed to create user')
      }
      if (
        !(
          await db
            .insert(userProfiles)
            .values({ id: insertedUser.id })
            .returning({ id: users.id })
        ).length
      ) {
        return buildErrorResponse(500, 'Failed to create user')
      }

      const accessToken = Bun.randomUUIDv7()
      await setAccessToken(accessToken, insertedUser.id)
      return buildSuccessResponse({
        accessToken,
        isNew: true,
        noPassword: true,
      })
    }

    if (selectedUser.passwordHash?.length) {
      await Auth.deleteEmailCode(email)
    }
    const accessToken = Bun.randomUUIDv7()
    await setAccessToken(accessToken, selectedUser.id)
    return buildSuccessResponse({
      accessToken,
      isNew: false,
      noPassword: !selectedUser.passwordHash?.length,
    })
  }

  static async loginWithPassword(email: string, password: string) {
    const selectedUser = (
      await db.select().from(users).where(eq(users.email, email)).limit(1)
    )[0]
    if (!selectedUser) {
      return buildErrorResponse(404, 'User not found')
    }
    if (!selectedUser.passwordHash?.length) {
      return buildErrorResponse(400, 'No password set, please use code to sign in')
    }
    if (!(await Bun.password.verify(password, selectedUser.passwordHash))) {
      return buildErrorResponse(401, 'Invalid password')
    }

    const accessToken = Bun.randomUUIDv7()
    await setAccessToken(accessToken, selectedUser.id)
    log.info({ accessToken }, 'Access Token:')
    return buildSuccessResponse({
      accessToken,
      isNew: false,
      noPassword: false,
    })
  }

  static async resetPassword(email: string, code: string, newPassword: string) {
    if (!(await Auth.verifyEmailCode(email, code))) {
      return buildErrorResponse(400, 'Invalid code')
    }
    const selectedUser = (
      await db.select().from(users).where(eq(users.email, email))
    )[0]
    if (!selectedUser) {
      return buildErrorResponse(404, 'User not found')
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
      return buildErrorResponse(500, 'Failed to update password')
    }
    await Auth.deleteEmailCode(email)
    return buildSuccessResponse()
  }
}

export const authService = new Elysia({ name: 'auth/service' })
  .macro({
    checkAccessToken: {
      async beforeHandle({ headers }) {
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

        log.info({ accessToken }, 'Access Token:')

        const userId = await getUserIdByAccessToken(accessToken)
        if (!userId) {
          return {
            status: 401,
            body: {
              success: false,
              message: 'Invalid access token',
            },
          }
        }
        // Refresh TTL on valid access
        await redis.expire(buildAccessTokenRedisKey(accessToken), Number(Bun.env.TTL_ACCESS_TOKEN))
      },
      async resolve({ headers }) {
        const accessToken = headers['x-access-token'] as string
        const userId = await getUserIdByAccessToken(accessToken)
        return { userId }
      },
    },
  })
