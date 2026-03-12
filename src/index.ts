import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { fromTypes, openapi } from '@elysiajs/openapi'
import { staticPlugin } from '@elysiajs/static'
import { env } from '@yolk-oss/elysia-env'
import { resolve } from 'node:path'

import packageJson from 'package.json'
import { log } from '@/log'
import { authRoute } from '@/modules/auth'
import { chatRoute } from '@/modules/chat'
import { deviceRoute } from '@/modules/devices'
import { profileRoute } from '@/modules/profiles'
import { voiceprintRoute } from '@/modules/voiceprint'
import { handleUncaughtError } from '@/utils/common'

const staticFilesPrefix = '/public'
const indexHtmlPath = resolve('public', 'index.html')

const app = new Elysia()
  .use(log.into())
  .use(
    env({
      CHAT_API_URL: t.String({
        description: 'Chat AI backend URL (e.g. http://localhost:8000)',
      }),
      DATABASE_URL: t.String({
        description: 'Database connection URL',
      }),
      OPENSPEECH_ACCESS_TOKEN: t.String({
        minLength: 32,
        maxLength: 32,
        description: 'Openspeech Access token for authentication',
      }),
      OPENSPEECH_APP_ID: t.String({
        minLength: 1,
        description: 'Openspeech App ID',
      }),
      REDIS_URL: t.Optional(
        t.String({
          description: 'Redis connection URL',
        }),
      ),
      SMTP_FROM: t.String({
        description: 'Email address used in the From field when sending emails',
      }),
      SMTP_HOST: t.String({ description: 'SMTP server host' }),
      SMTP_PASSWORD: t.String({ description: 'SMTP server password' }),
      SMTP_PORT: t.Number({ description: 'SMTP server port, usually 25' }),
      SMTP_USERNAME: t.String({ description: 'SMTP server username' }),
      TTL_ACCESS_TOKEN: t.Number({
        description: 'Access token TTL in seconds (default 24 hours)',
      }),
      TTL_CHALLENGE_CODE: t.Number({
        description: 'Email challenge code TTL in seconds (default 5 minutes)',
      }),
      VPR_THRESHOLD: t.Number({
        minimum: 0,
        maximum: 1,
        description: 'Voiceprint recognition similarity threshold (0.0 ~ 1.0)',
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
      references: fromTypes(Bun.env.NODE_ENV === 'production' ? 'dist/index.d.ts' : 'src/index.ts'),
      exclude: {
        paths: [`${staticFilesPrefix}/*`],
      },
    }),
  )
  .use(
    staticPlugin({
      prefix: staticFilesPrefix,
      // Use regex patterns instead of strings to work around an
      // @elysiajs/static v1.4.7 bug: shouldIgnore() checks
      // pattern.includes(file) instead of file.includes(pattern),
      // so string patterns never match. Regex uses pattern.test(file)
      // which works correctly.
      // Exclude .html files to prevent Bun's HTML bundler
      // (await import()) from breaking absolute asset paths in the
      // built frontend output.
      ignorePatterns: [/\.DS_Store/, /\.git/, /\.env/, /\.html$/],
    }),
  )
  .use(cors())
  .use(authRoute)
  .use(chatRoute)
  .use(deviceRoute)
  .use(profileRoute)
  .use(voiceprintRoute)
  // Serve index.html as a raw file via Bun.file() to bypass Bun's HTML
  // bundler. This is the root cause fix for path resolution errors when
  // embedding the frontend build output in the backend.
  .get(`${staticFilesPrefix}/index.html`, () => new Response(Bun.file(indexHtmlPath)))
  .get(staticFilesPrefix, () => new Response(Bun.file(indexHtmlPath)))
  .onError(({ error }) => {
    return handleUncaughtError(error, 500, 'Internal server error')
  })
  .listen(3000)

log.info(`🦊 ElysiaJS is running at ${app.server?.url}`)
log.info(`⚡️ Check OpenAPI docs at ${app.server?.url}swagger`)
