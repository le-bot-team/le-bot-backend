import { swagger } from '@elysiajs/swagger'
import { staticPlugin } from '@elysiajs/static'
import { env } from '@yolk-oss/elysia-env'
import { Elysia, t } from 'elysia'

import { authRoute } from '@auth/route'
import { chatRoute } from '@chat/route'
import { log } from '@log'

const app = new Elysia()
  .use(log.into())
  // SMTP_HOST=smtp.office365.com;SMTP_PASSWORD=Gzysb233;SMTP_USERNAME=noreply@studio26f.org;DIFY_API_KEY=app-c0wbyvrpKIrva3lzGjxencRD
  .use(
    env({
      ACCESS_TOKEN: t.String({minLength: 32, maxLength: 32, description: 'Access token for the bot'}),
      APP_ID: t.String({minLength: 1, description: 'App ID for the bot'}),
      DATABASE_URL: t.String({description: 'Database connection URL'}),
      SMTP_HOST: t.String({description: 'SMTP server host'}),
      SMTP_PASSWORD: t.String({description: 'SMTP server password'}),
      SMTP_USERNAME: t.String({description: 'SMTP server username'}),
      DIFY_API_KEY: t.String({description: 'Dify API key for AI services'}),
    }),
  )
  .use(swagger())
  .use(staticPlugin())
  .onError((ctx) => {
    ctx.log?.error(ctx, ctx.error.toString())
    return 'onError'
  })
  .use(authRoute)
  .use(chatRoute)
  .listen(3000)

console.info('')
log.info(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`)
