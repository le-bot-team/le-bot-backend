import { t } from 'elysia'

export const ownerDevicesValidation = t.Object({
  owner_id: t.String({ format: 'uuid' }),
})
