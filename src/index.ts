import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { swagger } from '@elysiajs/swagger'
import { env } from '@yolk-oss/elysia-env'
import { Elysia, t } from 'elysia'

import { authRoute } from '@auth/route'
import { chatRoute } from '@chat/route'
import { log } from '@log'
import { profileRoute } from '@profile/route'

const app = new Elysia()
  .use(log.into())
  .use(
    env({
      OPENSPEECH_ACCESS_TOKEN: t.String({
        minLength: 32,
        maxLength: 32,
        description: 'Access token for the bot',
      }),
      APP_ID: t.String({ minLength: 1, description: 'App ID for the bot' }),
      DATABASE_URL: t.String({ description: 'Database connection URL' }),
      DIFY_API_KEY: t.String({ description: 'Dify API key for AI services' }),
      DIFY_URL: t.String({ description: 'Dify endpoint URL' }),
      SMTP_HOST: t.String({ description: 'SMTP server host' }),
      SMTP_PASSWORD: t.String({ description: 'SMTP server password' }),
      SMTP_USERNAME: t.String({ description: 'SMTP server username' }),
      VPR_URL: t.String({ description: 'Voiceprint Recognition service URL' }),
    }),
  )
  .use(cors())
  .use(staticPlugin())
  .use(swagger())
  .onError((ctx) => {
    ctx.log?.error(ctx, ctx.error.toString())
    return 'onError'
  })
  .use(authRoute)
  .use(chatRoute)
  .use(profileRoute)
  .listen(3000)

console.info('')
log.info(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`)
