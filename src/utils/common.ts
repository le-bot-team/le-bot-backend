import { DrizzleError, DrizzleQueryError, TransactionRollbackError } from 'drizzle-orm'
import { ElysiaCustomStatusResponse, status } from 'elysia'

import { log } from '@/log'
import { errorRespBody } from '@/utils/model'

export const handleUncaughtError = <Code extends Parameters<typeof status>[0]>(
  error: unknown,
  fallbackCode: Code,
  fallbackMessage: string,
): ElysiaCustomStatusResponse<Code, typeof errorRespBody.static> => {
  if (
    error instanceof DrizzleError ||
    error instanceof DrizzleQueryError ||
    error instanceof TransactionRollbackError
  ) {
    log.error(error, 'Database error occurred')
    return buildErrorResponse(fallbackCode, fallbackMessage)
  }
  // For non-database errors, still log but return the original message
  log.error(error, 'Unexpected error occurred')
  return buildErrorResponse(fallbackCode, (error as Error).message)
}

export function generateSequence(begin: number, end: number): Generator<number>
export function generateSequence(begin: bigint, end: bigint): Generator<bigint>
export function* generateSequence(begin: number | bigint, end: number | bigint) {
  if (typeof begin !== typeof end) {
    throw new TypeError('buildSequence requires begin and end to be the same type')
  }

  if (typeof begin === 'bigint') {
    const start = begin
    const stop = end as bigint
    const step = start < stop ? 1n : -1n
    for (let i = start; step > 0n ? i < stop : i > stop; i += step) {
      yield i
    }
    return
  }

  const start = begin as number
  const stop = end as number
  const step = start < stop ? 1 : -1
  for (let i = start; step > 0 ? i < stop : i > stop; i += step) {
    yield i
  }
}

export const buildSuccessResponse = <T>(data?: T) => {
  return status(200, {
    success: true as const,
    data,
  })
}

export const buildErrorResponse = <Code extends Parameters<typeof status>[0]>(
  code: Code,
  message: string,
): ElysiaCustomStatusResponse<Code, typeof errorRespBody.static> =>
  status(code, {
    success: false,
    message,
  })
