import { and, eq } from 'drizzle-orm'

import { db } from '@/database'
import { persons } from '@/database/schema'

export const getPersonByUserAndId = async (userId: string, personId: string) =>
  (
    await db
      .select()
      .from(persons)
      .where(and(eq(persons.userId, userId), eq(persons.id, personId)))
      .limit(1)
  )[0]
