import { Elysia } from 'elysia'

import { log } from '@/log'

import { chatModel } from './model'
import { Chat, chatService } from './service'
import { WsEstablishConnectionResponseSuccess } from './types'
import { ApiWrapper } from './wrapper'

export const chatRoute = new Elysia({ prefix: '/api/v1/chat', tags: ['Chat'] })
  .use(chatModel)
  .use(chatService)
  .ws('/ws', {
    body: 'wsRequest',
    query: 'wsQuery',
    open: async (ws) => {
      const { query, store } = ws.data
      const auth = await Chat.authenticateConnection(query.token)
      if (!auth) {
        ws.close(1008, 'Unauthorized')
        return
      }
      log.debug({ userId: auth.userId, wsId: ws.id }, 'WsClient opened')
      store.wsIdToUserIdMap.set(ws.id, auth.userId)
      store.wsIdToApiWrapperMap.set(
        ws.id,
        new ApiWrapper(ws, auth.userId, auth.nickname, ''),
      )
      ws.send(new WsEstablishConnectionResponseSuccess(ws.id))
    },
    close: (ws) => {
      const { store } = ws.data
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
      const { store } = ws.data
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

      const handled = await Chat.handleMessage(ws.id, userId, apiWrapper, message)
      if (!handled) {
        ws.close(1003, 'Invalid action')
      }
    },
  })
