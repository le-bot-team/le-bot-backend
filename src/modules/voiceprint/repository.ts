import { and, DrizzleQueryError, eq } from 'drizzle-orm'

import { db } from '@/database'
import { persons } from '@/database/schema'

export const getPersonsByUserIdNoExcept = async (userId: string) => {
  try {
    return db.select().from(persons).where(eq(persons.userId, userId))
  } catch (error) {
    if (!(error instanceof DrizzleQueryError)) {
      throw error
    }
  }
  return []
}

export const getPersonByUserIdAndIdNoExcept = async (userId: string, personId: string) => {
  try {
    return (
      await db
        .select()
        .from(persons)
        .where(and(eq(persons.userId, userId), eq(persons.id, personId)))
        .limit(1)
    )[0]
  } catch (error) {
    if (!(error instanceof DrizzleQueryError)) {
      throw error
    }
  }
}

export const insertPersonNoExcept = async (data: typeof persons.$inferInsert) => {
  try {
    return db.insert(persons).values(data).returning()
  } catch (error) {
    if (!(error instanceof DrizzleQueryError)) {
      throw error
    }
  }
  return []
}

export const updatePerson = async (
  userId: string,
  personId: string,
  data: Partial<typeof persons.$inferInsert>,
) =>
  db
    .update(persons)
    .set(data)
    .where(and(eq(persons.id, personId), eq(persons.userId, userId)))
    .returning()

export const deletePersonByUserAndId = async (userId: string, personId: string) =>
  db
    .delete(persons)
    .where(and(eq(persons.id, personId), eq(persons.userId, userId)))
    .returning({ id: persons.id })
