import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'

import { authService } from '@auth/service'
import { dbInstance } from '@db/plugin'
import { userProfiles } from '@db/schema'
import { log } from '@log'

import { ApiWrapper } from './api'
import { chatService } from './service'
import { WsEstablishConnectionResponseSuccess } from '@chat/types/websocket'

export const chatRoute = new Elysia({ prefix: '/api/v1/chat' })
  .use(log.into())
  .use(authService)
  .use(dbInstance)
  .use(chatService)
  .ws('/ws', {
    body: 'wsRequest',
    query: 'wsQuery',
    open: async (ws) => {
      const { log, query, store, db } = ws.data
      const userId = store.accessTokenToUserIdMap.get(query.token)
      if (userId === undefined) {
        log.warn({ wsId: ws.id }, 'Unauthorized WsClient connection attempt')
        ws.close(1008, 'Unauthorized')
        return
      }
      const selectedUsersResult = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, Number(userId)))
      if (!selectedUsersResult.length) {
        log.warn({ userId, wsId: ws.id }, 'User not found for WsClient')
        ws.close(1008, 'User not found')
      }
      log.debug({ userId, wsId: ws.id }, 'WsClient opened')
      store.wsIdToUserIdMap.set(ws.id, userId)
      store.wsIdToApiWrapperMap.set(
        ws.id,
        new ApiWrapper(ws, userId, selectedUsersResult[0].nickname ?? '', ''),
      )
      ws.send(new WsEstablishConnectionResponseSuccess(ws.id))
    },
    close: (ws) => {
      const { log, store } = ws.data
      const apiWrapper = store.wsIdToApiWrapperMap.get(ws.id)
      if (apiWrapper) {
        apiWrapper.destroy()
        store.wsIdToApiWrapperMap.delete(ws.id)
      }
      const userId = store.wsIdToUserIdMap.get(ws.id)
      store.wsIdToUserIdMap.delete(ws.id)
      log.debug({ userId, wsId: ws.id }, 'WsClient closed')
    },
    message: async (ws, message) => {
      const { log, store } = ws.data
      const userId = store.wsIdToUserIdMap.get(ws.id)
      if (!userId) {
        log.warn({ wsId: ws.id }, 'Unauthorized WsClient message attempt')
        ws.close(1008, 'Unauthorized')
        return
      }
      const apiWrapper = store.wsIdToApiWrapperMap.get(ws.id)
      if (!apiWrapper) {
        log.error({ userId, wsId: ws.id }, 'ApiWrapper not found for WsClient')
        ws.close(1008, 'ASR API not found')
        return
      }

      switch (message.action) {
        case 'updateConfig': {
          await apiWrapper.updateConfig(message)
          break
        }
        case 'inputAudioStream': {
          await apiWrapper.inputAudioStream(message.data.buffer)
          break
        }
        case 'inputAudioComplete': {
          log.info({ messageId: message.id }, '[WsAction] Input audio complete')
          apiWrapper.inputAudioComplete(message.data.buffer)
          break
        }
        case 'clearContext': {
          break
        }
        case 'cancelOutput': {
          break
        }
        default: {
          log.warn({ userId, wsId: ws.id, message }, 'Invalid WsClient action')
          ws.close(1003, 'Invalid action')
          break
        }
      }
    },
  })
