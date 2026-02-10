import { and, eq } from 'drizzle-orm'

import { db } from '@/database'
import { persons, userProfiles } from '@/database/schema'

export const getUserProfileById = async (id: string) =>
  (await db.select().from(userProfiles).where(eq(userProfiles.id, id)).limit(1))[0]

export const getPersonByUserAndId = async (userId: string, personId: string) =>
  (
    await db
      .select()
      .from(persons)
      .where(and(eq(persons.userId, userId), eq(persons.id, personId)))
      .limit(1)
  )[0]
