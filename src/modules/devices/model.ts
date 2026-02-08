import { t } from 'elysia'

import { buildSuccessRespBody, errorRespBody } from '@/utils/model'

const deviceSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  createdAt: t.Nullable(t.String()),
  updatedAt: t.Nullable(t.String()),
  identifier: t.String(),
  ownerId: t.String({ format: 'uuid' }),
  type: t.Union([t.Literal('robot')]),
  model: t.String(),
  name: t.Nullable(t.String()),
  status: t.Nullable(t.Unknown()),
  config: t.Nullable(t.Unknown()),
})

export const ownerDevicesRespBody = buildSuccessRespBody(
  t.Object({
    devices: t.Array(deviceSchema),
  }),
)

export { errorRespBody }

export type Device = typeof deviceSchema.static
export type OwnerDevicesResp = typeof ownerDevicesRespBody.static
