import { redis } from 'bun'
import nodemailer from 'nodemailer'

import { log } from '@/log'
import { buildChallengeCodeRedisKey } from '@/modules/auth/utils'

const transport = nodemailer.createTransport({
  host: Bun.env.SMTP_HOST,
  port: Bun.env.SMTP_PORT,
  auth: {
    user: Bun.env.SMTP_USERNAME,
    pass: Bun.env.SMTP_PASSWORD,
  },
})

export abstract class Auth {
  static async emailChallenge(email: string) {
    const code = Bun.randomUUIDv7().slice(0, 6).toUpperCase()
    await redis.set(buildChallengeCodeRedisKey(email), code, 'EX', 300)
    try {
      await transport.sendMail({
        from: 'Le Bot Official <noreply@studio26f.org>',
        to: email,
        subject: '[Le Bot] 校验您的电子邮件地址 Verify your email address',
        html: (
          await Bun.file('src/auth/assets/emailChallenge.html').text()
        ).replace('{{VERIFY_CODE}}', code),
      })
      return buildSuccessResponse(null, 'Challenge code sent to email')
    } catch (e) {
      log.error(e, 'Failed to send email')
      return {
        success: false,
        message: 'Failed to send email',
      }
    }
  }
}
