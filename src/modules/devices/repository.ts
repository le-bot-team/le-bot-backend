import { eq } from 'drizzle-orm'

import { db } from '@/database'
import { devices } from '@/database/schema'

export const getDevicesByOwnerId = async (ownerId: string) =>
  db.select().from(devices).where(eq(devices.ownerId, ownerId))
