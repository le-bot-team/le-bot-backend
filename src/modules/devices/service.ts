import { Elysia } from 'elysia'

import { buildSuccessResponse } from '@/utils/common'

import { getDevicesByOwnerId } from './repository'

export abstract class Devices {
  static async getOwnerDevices(userId: string) {
    const ownerDevices = await getDevicesByOwnerId(userId)
    return buildSuccessResponse({ devices: ownerDevices })
  }
}

export const deviceService = new Elysia({ name: 'device/service' })
