import { DrizzleQueryError, eq } from 'drizzle-orm'

import { db } from '@/database'
import { userProfiles } from '@/database/schema'

export const getUserProfileByIdNoExcept = async (id: string) => {
  try {
    return (await db.select().from(userProfiles).where(eq(userProfiles.id, id)).limit(1))[0]
  } catch (error) {
    if (!(error instanceof DrizzleQueryError)) {
      throw error
    }
  }
}

export const updateUserProfile = async (
  id: string,
  data: Partial<typeof userProfiles.$inferInsert>,
) =>
  db
    .update(userProfiles)
    .set(data)
    .where(eq(userProfiles.id, id))
    .returning({ id: userProfiles.id })
