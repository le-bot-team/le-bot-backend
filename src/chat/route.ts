import { Elysia } from 'elysia'

import { authService } from '@auth/service'
import { log } from '@log'

import { ApiWrapper } from './api'
import { chatService } from './service'

export const chatRoute = new Elysia({ prefix: '/api/v1/chat' })
  .use(log.into())
  .use(authService)
  .use(chatService)
  .ws('/ws', {
    body: 'wsRequest',
    query: 'wsQuery',
    open: (ws) => {
      const { log, query, store } = ws.data
      const userId = store.accessTokenToUserIdMap.get(query.token) ?? 1n
      // if (!userId) {
      //   ws.close(1008, 'Unauthorized')
      //   return
      // }
      log.debug({ userId, wsId: ws.id }, 'WsClient opened')
      store.wsIdToUserIdMap.set(ws.id, userId)
      store.wsIdToApiWrapperMap.set(ws.id, new ApiWrapper(ws, userId, ''))
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
        ws.close(1008, 'Unauthorized')
        return
      }
      const apiWrapper = store.wsIdToApiWrapperMap.get(ws.id)
      if (!apiWrapper) {
        ws.close(1008, 'ASR API not found')
        return
      }

      switch (message.action) {
        case 'updateConfig': {
          await apiWrapper.updateConfig(message)
          break
        }
        case 'inputAudioStream': {
          log.info({ messageId: message.id }, 'WsAction inputAudioStream')
          apiWrapper.inputAudioStream(message.data.buffer)
          break
        }
        case 'inputAudioComplete': {
          log.info({ messageId: message.id }, 'WsAction inputAudioComplete')
          apiWrapper.inputAudioComplete(message.data.buffer)
          break
        }
        case 'clearContext': {
          log.debug({ messageId: message.id }, 'clearContext')
          break
        }
        case 'cancelOutput': {
          log.debug({ messageId: message.id }, 'cancelOutput')
          break
        }
        default: {
          ws.close(1003, 'Invalid action')
          break
        }
      }
      ws.send({
        action: message.action,
        time: Date.now(),
      })
    },
  })
