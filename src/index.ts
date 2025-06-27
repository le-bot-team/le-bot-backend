import { swagger } from '@elysiajs/swagger'
import { Elysia } from 'elysia'

import { authRoute } from './auth/route'
import { chatRoute } from './chat/route'

const app = new Elysia()
  .use(swagger())
  .onError(({ error, code }) => {
    if (code === 'NOT_FOUND') {
      return 'Not Found :('
    }
    console.error(error)
  })
  .use(authRoute)
  .use(chatRoute)
  .listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
)
