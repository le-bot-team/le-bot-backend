import { Elysia } from 'elysia'

import { authService } from '../auth/service'

import { chatService } from './service'
import { CozeWsEventType, CozeWsWrapper } from './types/coze'

export const chatRoute = new Elysia({ prefix: '/api/v1/chat' })
  .use(authService)
  .use(chatService)
  .ws('/ws', {
    body: 'wsRequest',
    query: 'wsQuery',
    open(ws) {
      const { query, store } = ws.data
      const userId = store.accessTokenToUserIdMap.get(query.token) ?? 0n
      console.log({ userId })
      // if (!userId) {
      //   ws.close(1008, 'Unauthorized')
      //   return
      // }
      store.wsIdToUserIdMap.set(ws.id, userId)
      const cozeWsWrapper = new CozeWsWrapper(
        ws,
        process.env.ACCESS_TOKEN ?? '',
        process.env.BOT_ID ?? '',
      )
      store.wsIdToWsWrapperMap.set(ws.id, cozeWsWrapper)
    },
    close(ws) {
      const { store } = ws.data
      const cozeWsWrapper = store.wsIdToWsWrapperMap.get(ws.id)
      if (cozeWsWrapper) {
        cozeWsWrapper.destroy()
        store.wsIdToWsWrapperMap.delete(ws.id)
      }
      const userId = store.wsIdToUserIdMap.get(ws.id)
      store.wsIdToUserIdMap.delete(ws.id)
      console.log(`WebSocket closed: ${ws.id}, User ID: ${userId}`)
    },
    message(ws, message) {
      const { query, store } = ws.data
      const cozeWsWrapper = store.wsIdToWsWrapperMap.get(ws.id)
      if (!cozeWsWrapper) {
        ws.close(1008, 'Cannot find related Coze WebSocket wrapper')
        return
      }

      const userId = store.accessTokenToUserIdMap.get(query.token)
      if (!userId) {
        ws.close(1008, 'Unauthorized')
        return
      }
      console.log({ userId, id: message.id })

      switch (message.action) {
        case 'updateConfig': {
          cozeWsWrapper.sendEvent(message.id, CozeWsEventType.chatUpdate, {
            data: {
              chat_config: {
                auto_save_history: true,
                conversation_id: message.data.conversationId,
                extra_params: message.data.location,
                user_id: userId,
              },
              input_audio: {
                format: 'wav',
                codec: 'pcm',
                sample_rate: message.data.sampleRate?.input ?? 24000,
                channel: 1,
                bit_depth: 16,
              },
              output_audio: {
                codec: 'pcm',
                speech_rate: message.data.speechRate ?? 0,
                voice_id: message.data.voiceId ?? '7426725529589596187',
              },
            },
          })
          break
        }
        case 'inputAudioStream': {
          cozeWsWrapper.sendEvent(
            message.id,
            CozeWsEventType.inputAudioBufferAppend,
            {
              data: {
                delta: message.data.buffer,
              },
            },
          )
          break
        }
        case 'inputAudioComplete': {
          cozeWsWrapper.clearErrorList()
          cozeWsWrapper.sendEvent(
            message.id,
            CozeWsEventType.inputAudioBufferComplete,
          )
          break
        }
        case 'clearContext': {
          cozeWsWrapper.sendEvent(
            message.id,
            CozeWsEventType.conversationClear,
          )
          break
        }
        case 'cancelOutput': {
          cozeWsWrapper.sendEvent(
            message.id,
            CozeWsEventType.conversationChatCancel,
          )
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
