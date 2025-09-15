import { createPinoLogger } from '@bogeychan/elysia-logger'

export const log = createPinoLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
})
