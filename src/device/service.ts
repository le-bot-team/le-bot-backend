import { Elysia } from 'elysia'
import { ownerDevicesValidation } from 'src/device/validation/user'

export const deviceService = new Elysia({ name: 'device/service' }).model({
  ownerDevices: ownerDevicesValidation,
})
