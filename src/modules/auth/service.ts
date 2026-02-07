import { redis } from 'bun'
import { Elysia } from 'elysia'
import nodemailer from 'nodemailer'

import { log } from '@/log'
import { buildAccessTokenRedisKey, buildChallengeCodeRedisKey } from '@/modules/auth/utils'
import { buildSuccessResponse } from '@/utils/common'

const ACCESS_TOKEN_TTL = 86400 // 24 hours in seconds
const CHALLENGE_CODE_TTL = 300 // 5 minutes in seconds

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
  await redis.set(buildAccessTokenRedisKey(token), userId, 'EX', ACCESS_TOKEN_TTL)
}

export const deleteAccessToken = async (token: string): Promise<void> => {
  await redis.del(buildAccessTokenRedisKey(token))
}

export abstract class Auth {
  static async emailChallenge(email: string) {
    const code = Bun.randomUUIDv7().slice(0, 6).toUpperCase()
    await redis.set(buildChallengeCodeRedisKey(email), code, 'EX', CHALLENGE_CODE_TTL)
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
      return {
        success: false,
        message: 'Failed to send email',
      }
    }
  }

  static async verifyEmailCode(email: string, code: string): Promise<boolean> {
    const storedCode = await redis.get(buildChallengeCodeRedisKey(email))
    return !!storedCode && storedCode === code
  }

  static async deleteEmailCode(email: string): Promise<void> {
    await redis.del(buildChallengeCodeRedisKey(email))
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
        await redis.expire(buildAccessTokenRedisKey(accessToken), ACCESS_TOKEN_TTL)
      },
      async resolve({ headers }) {
        const accessToken = headers['x-access-token'] as string
        const userId = await getUserIdByAccessToken(accessToken)
        return { userId }
      },
    },
  })
