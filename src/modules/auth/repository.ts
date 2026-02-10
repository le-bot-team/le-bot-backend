import { DrizzleQueryError, eq } from 'drizzle-orm'

import { db } from '@/database'
import { users, userProfiles } from '@/database/schema'

export const getUserByEmailNoExcept = async (email: string) => {
  try {
    return (await db.select().from(users).where(eq(users.email, email)).limit(1))[0]
  } catch (error) {
    if (!(error instanceof DrizzleQueryError)) {
      throw error
    }
  }
}

export const createNewUserAndProfile = async (email: string) => {
  return await db.transaction(async (tx) => {
    const insertedUser = (await tx.insert(users).values({ email }).returning({ id: users.id }))[0]
    if (!insertedUser) {
      throw new Error('Failed to create user')
    }
    const insertedProfile = (
      await tx.insert(userProfiles).values({ id: insertedUser.id }).returning()
    )[0]
    if (!insertedProfile) {
      throw new Error('Failed to create user profile')
    }
    return insertedUser.id
  })
}

export const updatePasswordByEmail = async (email: string, passwordHash: string) =>
  db.update(users).set({ passwordHash }).where(eq(users.email, email)).returning({ id: users.id })
