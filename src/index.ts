import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { fromTypes, openapi } from '@elysiajs/openapi'
import { staticPlugin } from '@elysiajs/static'
import { env } from '@yolk-oss/elysia-env'

import packageJson from 'package.json'
import { log } from '@/log'
import { authRoute } from '@/modules/auth'
import { chatRoute } from '@/modules/chat'
import { deviceRoute } from '@/modules/devices'
import { profileRoute } from '@/modules/profiles'
import { voiceprintRoute } from '@/modules/voiceprint'

const staticFilesPrefix = '/public'

const app = new Elysia()
  .use(log.into())
  .use(
    env({
      APP_ID: t.String({ minLength: 1, description: 'App ID for the bot' }),
      CHAT_API_URL: t.String({
        description: 'Chat AI backend URL (e.g. http://localhost:8000)',
      }),
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
      SMTP_FROM: t.String({
        description: 'Email address used in the From field when sending emails',
      }),
      SMTP_HOST: t.String({ description: 'SMTP server host' }),
      SMTP_PORT: t.Number({ description: 'SMTP server port, usually 25' }),
      SMTP_PASSWORD: t.String({ description: 'SMTP server password' }),
      SMTP_USERNAME: t.String({ description: 'SMTP server username' }),
      TTL_ACCESS_TOKEN: t.Number({
        default: 86400,
        description: 'Access token TTL in seconds (default 24 hours)',
      }),
      TTL_CHALLENGE_CODE: t.Number({
        default: 300,
        description: 'Email challenge code TTL in seconds (default 5 minutes)',
      }),
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
            'This is the API documentation for the backend of Lebot, ' + 'a companion ai robot.',
        },
      },
      exclude: {
        paths: [`${staticFilesPrefix}/*`],
      },
      references: fromTypes(Bun.env.NODE_ENV === 'production' ? 'dist/index.d.ts' : 'src/index.ts'),
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
