import { eq } from 'drizzle-orm'

import { db } from '@/database'
import { userProfiles } from '@/database/schema'

export const getUserProfileById = async (id: string) =>
  (await db.select().from(userProfiles).where(eq(userProfiles.id, id)))[0]

export const updateUserProfile = async (
  id: string,
  data: Partial<typeof userProfiles.$inferInsert>,
) =>
  db
    .update(userProfiles)
    .set(data)
    .where(eq(userProfiles.id, id))
    .returning({ id: userProfiles.id })
