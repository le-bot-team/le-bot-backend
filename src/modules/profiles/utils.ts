import { eq } from 'drizzle-orm'
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql'

import { userProfiles } from '@/database/schema'

export const getUserProfileById = async (db: BunSQLDatabase, id: string) =>
  (await db.select().from(userProfiles).where(eq(userProfiles.id, id)))[0]
