import { eq } from 'drizzle-orm'

import { db } from '@/database'
import { userProfiles } from '@/database/schema'

export const getUserProfileById = async (id: string) =>
  (
    await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, id))
      .limit(1)
  )[0]
