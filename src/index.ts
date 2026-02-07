import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { fromTypes, openapi } from '@elysiajs/openapi'
import { staticPlugin } from '@elysiajs/static'
import { env } from '@yolk-oss/elysia-env'

import packageJson from 'package.json'
import { authRoute } from '@/auth/route'
import { chatRoute } from '@/chat/route'
import { deviceRoute } from '@/device/route'
import { log } from '@/log'
import { profileRoute } from '@/profile/route'
import { voiceprintRoute } from '@/voiceprint/route'

const staticFilesPrefix = '/public'

const app = new Elysia()
  .use(log.into())
  .use(
    env({
      APP_ID: t.String({ minLength: 1, description: 'App ID for the bot' }),
      DATABASE_URL: t.String({
        default: 'postgresql://lebot:lebot@localhost:5432/lebot',
        description: 'Database connection URL',
      }),
      OPENSPEECH_ACCESS_TOKEN: t.String({
        minLength: 32,
        maxLength: 32,
        description: 'Access token for the bot',
      }),
      REDIS_URL: t.String({
        default: 'redis://localhost:6379',
        description: 'Redis connection URL',
      }),
      SMTP_HOST: t.String({ description: 'SMTP server host' }),
      SMTP_PORT: t.Number({ description: 'SMTP server port, usually 25' }),
      SMTP_PASSWORD: t.String({ description: 'SMTP server password' }),
      SMTP_USERNAME: t.String({ description: 'SMTP server username' }),
      VPR_URL: t.String({ description: 'Voiceprint Recognition service URL' }),
    }),
  )
  .use(
    openapi({
      documentation: {
        info: {
          title: 'Lebot API',
          version: packageJson.version,
          description:
            'This is the API documentation for the backend of Lebot, ' +
            'a companion ai robot.',
        },
      },
      exclude: {
        paths: [`${staticFilesPrefix}/*`],
      },
      references: fromTypes(
        Bun.env.NODE_ENV === 'production'
          ? 'dist/index.d.ts'
          : 'src/index.ts',
      ),
    }),
  )
  .use(staticPlugin({ prefix: staticFilesPrefix }))
  .use(cors())
  .use(authRoute)
  .use(chatRoute)
  .use(deviceRoute)
  .use(profileRoute)
  .use(voiceprintRoute)
  .onError((ctx) => {
    ctx.log?.error(ctx, ctx.error.toString())
    return 'onError'
  })
  .listen(3000)

log.info(`🦊 ElysiaJS is running at ${app.server?.url}`)
log.info(`⚡️ Check OpenAPI docs at ${app.server?.url}swagger`)
