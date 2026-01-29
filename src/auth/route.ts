import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import nodemailer from 'nodemailer'

import { db } from '@/database'
import { userProfiles, users } from '@/database/schema'
import { log } from '@/log'

import { authService } from './service'

export const authRoute = new Elysia({ prefix: '/api/v1/auth' })
  .use(authService)
  .post(
    '/email/code',
    async ({ body: { email, code }, store }) => {
      const storedCode = store.emailToCodeMap.get(email)
      if (!storedCode || storedCode !== code) {
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
        store.accessTokenCreatedAtMap.set(accessToken, new Date())
        store.accessTokenToUserIdMap.set(accessToken, insertedUser.id)
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
          store.emailToCodeMap.delete(storedCode)
        }
        const accessToken = Bun.randomUUIDv7()
        store.accessTokenCreatedAtMap.set(accessToken, new Date())
        store.accessTokenToUserIdMap.set(accessToken, selectedUser.id)
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
      body: 'emailCode',
    },
  )
  .post(
    '/email/challenge',
    async ({ body: { email }, store }) => {
      const code = Bun.randomUUIDv7().slice(0, 6).toUpperCase()
      store.emailToCodeMap.set(email, code)
      try {
        const transporter = nodemailer.createTransport({
          host: Bun.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT),
          auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD,
          },
        })
        await transporter.sendMail({
          from: 'Le Bot Official <noreply@studio26f.org>',
          to: email,
          subject: '[Le Bot] 校验您的电子邮件地址 Verify your email address',
          html: (
            await Bun.file('src/auth/assets/emailChallenge.html').text()
          ).replace('{{VERIFY_CODE}}', code),
        })
        return {
          success: true,
        }
      } catch (e) {
        log.error(e, 'Failed to send email')
        return {
          success: false,
          message: 'Failed to send email',
        }
      }
    },
    { body: 'emailChallenge' },
  )
  .post(
    '/email/password',
    async ({ body: { email, password }, store }) => {
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
      store.accessTokenCreatedAtMap.set(accessToken, new Date())
      store.accessTokenToUserIdMap.set(accessToken, selectedUser.id)

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
    { body: 'emailPassword' },
  )
  .post(
    '/email/reset',
    async ({ body: { email, code, newPassword }, store }) => {
      const storedCode = store.emailToCodeMap.get(email)
      if (!storedCode || storedCode !== code) {
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
      store.emailToCodeMap.delete(storedCode)
      return {
        success: true,
      }
    },
    {
      body: 'emailReset',
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
