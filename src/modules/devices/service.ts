import { Elysia } from 'elysia'
import { ownerDevicesValidation } from './model'

export const deviceService = new Elysia({ name: 'device/service' }).model({
  ownerDevices: ownerDevicesValidation,
})
