import { defineConfig } from 'drizzle-kit'

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  dbCredentials: {
    url:
      Bun.env.DATABASE_URL ?? 'postgresql://lebot:lebot@localhost:5432/lebot',
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/database/schema.ts',
})
