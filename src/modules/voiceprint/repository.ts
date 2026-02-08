import { and, eq } from 'drizzle-orm'

import { db } from '@/database'
import { persons } from '@/database/schema'

export const getPersonsByUserId = async (userId: string) =>
  db.select().from(persons).where(eq(persons.userId, userId))

export const getPersonByUserAndId = async (userId: string, personId: string) =>
  (
    await db
      .select()
      .from(persons)
      .where(and(eq(persons.userId, userId), eq(persons.id, personId)))
      .limit(1)
  )[0]

export const insertPerson = async (data: typeof persons.$inferInsert) =>
  db.insert(persons).values(data).returning()

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
