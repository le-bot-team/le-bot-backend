import { createPinoLogger } from '@bogeychan/elysia-logger'

export const log = createPinoLogger({
  level: Bun.env.NODE_ENV === 'production' ? 'info' : 'debug',
})
