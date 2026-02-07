import { t, type TSchema } from 'elysia'

export const buildSuccessRespBody = <T extends TSchema>(dataSchema?: T) => {
  return t.Object({
    success: t.Literal(true),
    data: dataSchema ?? t.Undefined(),
  })
}

export const errorRespBody = t.Object({
  success: t.Literal(false),
  message: t.String(),
})
