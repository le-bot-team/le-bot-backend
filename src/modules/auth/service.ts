import { redis } from 'bun'
import { Elysia } from 'elysia'
import nodemailer from 'nodemailer'

import { log } from '@/log'
import { buildErrorResponse, buildSuccessResponse } from '@/utils/common'

import {
  createNewUserAndProfile,
  getUserByEmailNoExcept,
  updatePasswordByEmail,
} from './repository'
import {
  buildAccessTokenRedisKey,
  buildChallengeCodeRedisKey,
  getUserIdByAccessToken,
} from './utils'

const transport = nodemailer.createTransport({
  host: Bun.env.SMTP_HOST,
  port: Bun.env.SMTP_PORT,
  auth: {
    user: Bun.env.SMTP_USERNAME,
    pass: Bun.env.SMTP_PASSWORD,
  },
})

const consumeEmailCode = async (email: string, code: string): Promise<boolean> => {
  const storedCode = await redis.getdel(buildChallengeCodeRedisKey(email))
  return !!storedCode && storedCode === code
}

const setAccessToken = async (token: string, userId: string): Promise<void> => {
  await redis.setex(buildAccessTokenRedisKey(token), Bun.env.TTL_ACCESS_TOKEN, userId)
}

export abstract class Auth {
  static async emailChallenge(email: string) {
    const bytes = crypto.getRandomValues(new Uint8Array(3))
    const code = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 6)
      .toUpperCase()
    await redis.setex(buildChallengeCodeRedisKey(email), Bun.env.TTL_CHALLENGE_CODE, code)
    try {
      await transport.sendMail({
        from: Bun.env.SMTP_FROM,
        to: email,
        subject: '[Le Bot] 校验您的电子邮件地址 Verify your email address',
        html: (await Bun.file('src/modules/auth/assets/emailChallenge.html').text()).replace(
          '{{VERIFY_CODE}}',
          code,
        ),
      })
      return buildSuccessResponse()
    } catch (e) {
      log.error(e, 'Failed to send email')
      return buildErrorResponse(500, 'Failed to send email')
    }
  }

  static async verifyEmailAndLogin(email: string, code: string) {
    if (!(await consumeEmailCode(email, code))) {
      return buildErrorResponse(400, 'Invalid code')
    }

    const selectedUser = await getUserByEmailNoExcept(email)
    if (!selectedUser) {
      const newUserId = await createNewUserAndProfile(email)
      const accessToken = Bun.randomUUIDv7()
      await setAccessToken(accessToken, newUserId)
      return buildSuccessResponse({
        accessToken,
        isNew: true,
        noPassword: true,
      })
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
    const selectedUser = await getUserByEmailNoExcept(email)
    if (!selectedUser || !selectedUser.passwordHash?.length) {
      return buildErrorResponse(401, 'Invalid email or password')
    }
    if (!(await Bun.password.verify(password, selectedUser.passwordHash))) {
      return buildErrorResponse(401, 'Invalid email or password')
    }

    const accessToken = Bun.randomUUIDv7()
    await setAccessToken(accessToken, selectedUser.id)

    return buildSuccessResponse({
      accessToken,
      isNew: false,
      noPassword: false,
    })
  }

  static async resetPassword(email: string, code: string, newPassword: string) {
    if (!(await consumeEmailCode(email, code))) {
      return buildErrorResponse(400, 'Invalid code')
    }
    const passwordHash = await Bun.password.hash(newPassword, {
      algorithm: 'bcrypt',
    })
    const updateResult = await updatePasswordByEmail(email, passwordHash)
    if (!updateResult.length) {
      return buildErrorResponse(404, 'User not found')
    }
    return buildSuccessResponse()
  }
}

// noinspection JSUnusedGlobalSymbols
export const authService = new Elysia({ name: 'auth/service' }).macro({
  resolveAccessToken: {
    async resolve({ headers }) {
      const accessToken = headers['x-access-token']
      if (!accessToken) {
        return buildErrorResponse(401, 'Missing access token')
      }

      const userId = await getUserIdByAccessToken(accessToken)
      if (!userId) {
        return buildErrorResponse(401, 'Invalid access token')
      }

      // Refresh TTL on valid access
      await redis.expire(buildAccessTokenRedisKey(accessToken), Number(Bun.env.TTL_ACCESS_TOKEN))
      return { userId }
    },
  },
})
