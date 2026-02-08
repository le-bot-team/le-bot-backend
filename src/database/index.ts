import { drizzle } from 'drizzle-orm/bun-sql'
import { sql } from 'drizzle-orm'

export const db = drizzle(Bun.env.DATABASE_URL)

export const checkDbConnection = async () => {
  try {
    await db.execute(sql`SELECT 1`)
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}
