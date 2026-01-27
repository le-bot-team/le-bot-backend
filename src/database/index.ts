import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'

export const db = drizzle({
  connection: {
    connectionString: process.env['DATABASE_URL'],
    ssl: false,
  },
})

export const checkDbConnection = async () => {
  try {
    await db.execute(sql`SELECT 1`)
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}
