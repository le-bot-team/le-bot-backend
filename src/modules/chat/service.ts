import { Elysia } from 'elysia'

import { log } from '@/log'
import { getUserIdByAccessToken } from '@/modules/auth/utils'

import type { WsRequest } from './model'
import { getUserProfileById } from './repository'
import { ApiWrapper } from './wrapper'

export abstract class Chat {
  /**
   * Authenticate a WebSocket connection by validating the access token
   * and fetching the user's profile.
   * Returns null if authentication fails.
   */
  static async authenticateConnection(token: string) {
    const userId = await getUserIdByAccessToken(token)
    if (!userId) {
      log.warn('Unauthorized WsClient connection attempt')
      return null
    }
    const selectedUser = await getUserProfileById(userId)
    if (!selectedUser) {
      log.warn({ userId }, 'User not found for WsClient')
      return null
    }
    return { userId, nickname: selectedUser.nickname ?? '' }
  }

  /**
   * Handle incoming WebSocket message by dispatching to the appropriate
   * ApiWrapper method based on the message action.
   */
  static async handleMessage(
    wsId: string,
    userId: string,
    apiWrapper: ApiWrapper,
    message: WsRequest,
  ) {
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
        log.warn({ userId, wsId, message }, 'Invalid WsClient action')
        return false
      }
    }
    return true
  }
}

export const chatService = new Elysia({ name: 'chat/service' }).state({
  wsIdToUserIdMap: new Map<string, string>(),
  wsIdToApiWrapperMap: new Map<string, ApiWrapper>(),
})
