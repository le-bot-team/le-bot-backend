import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import nodemailer from 'nodemailer'

import { dbInstance } from '@db/plugin'
import { userProfiles, users } from '@db/schema'
import { log } from '@log'

import { authService } from './service'

export const authRoute = new Elysia({ prefix: '/api/v1/auth' })
  .use(authService)
  .use(dbInstance)
  .post(
    '/email/code',
    async ({ body: { email, code }, db, store }) => {
      const storedCode = store.emailToCodeMap.get(email)
      if (!storedCode || storedCode !== code) {
        return {
          success: false,
          message: 'Invalid code',
        }
      }

      const selectedUsersResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
      if (!selectedUsersResult.length) {
        const insertResult = await db
          .insert(users)
          .values({
            email,
          })
          .returning({ id: users.id })
        if (!insertResult.length) {
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
                id: insertResult[0].id,
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
        store.accessTokenToUserIdMap.set(accessToken, insertResult[0].id)
        return {
          success: true,
          data: {
            accessToken,
            isNew: true,
            noPassword: true,
          },
        }
      } else {
        const user = selectedUsersResult[0]
        if (user.passwordHash?.length) {
          store.emailToCodeMap.delete(storedCode)
        }
        const accessToken = Bun.randomUUIDv7()
        store.accessTokenCreatedAtMap.set(accessToken, new Date())
        store.accessTokenToUserIdMap.set(accessToken, user.id)
        return {
          success: true,
          data: {
            accessToken,
            isNew: false,
            noPassword: !user.passwordHash?.length,
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
          host: process.env.SMTP_HOST,
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
    async ({ body: { email, password }, db, store }) => {
      const selectedUsersResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
      if (!selectedUsersResult.length) {
        return {
          success: false,
          message: 'User not found',
        }
      }
      const user = selectedUsersResult[0]
      if (!user.passwordHash?.length) {
        return {
          success: false,
          message: 'No password set, please use code to sign in',
        }
      }
      if (!(await Bun.password.verify(password, user.passwordHash))) {
        return {
          success: false,
          message: 'Invalid password',
        }
      }
      const accessToken = Bun.randomUUIDv7()
      store.accessTokenCreatedAtMap.set(accessToken, new Date())
      store.accessTokenToUserIdMap.set(accessToken, user.id)

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
    async ({ body: { email, code, newPassword }, db, store }) => {
      const storedCode = store.emailToCodeMap.get(email)
      if (!storedCode || storedCode !== code) {
        return {
          success: false,
          message: 'Invalid code',
        }
      }
      const selectedUsersResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
      if (!selectedUsersResult.length) {
        return {
          success: false,
          message: 'User not found',
        }
      }
      const user = selectedUsersResult[0]
      const updateResult = await db
        .update(users)
        .set({
          passwordHash: await Bun.password.hash(newPassword, {
            algorithm: 'bcrypt',
          }),
        })
        .where(eq(users.id, user.id))
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
