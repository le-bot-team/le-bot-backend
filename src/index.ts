import { swagger } from '@elysiajs/swagger'
import { Elysia } from 'elysia'

import { authRoute } from '@auth/route'
import { chatRoute } from '@chat/route'
import { log } from '@log'

const app = new Elysia()
  .use(log.into())
  .use(swagger())
  .onError((ctx) => {
    ctx.log?.error(ctx, ctx.error.toString())
    return 'onError'
  })
  .use(authRoute)
  .use(chatRoute)
  .listen(3000)

console.info('')
log.info(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`)
