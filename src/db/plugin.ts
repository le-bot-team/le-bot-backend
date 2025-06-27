import { drizzle } from 'drizzle-orm/node-postgres'
import { Elysia } from 'elysia'

export const dbInstance = new Elysia({ name: 'db/instance' }).resolve(
  { as: 'scoped' },
  () => ({
    db: drizzle(process.env.DATABASE_URL),
  }),
)
