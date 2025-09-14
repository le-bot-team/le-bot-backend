import { Elysia } from 'elysia'

import { ApiWrapper } from './api'
import { wsRequestValidator, wsQueryValidator } from './validation/websocket'

export const chatService = new Elysia({ name: 'chat/service' })
  .model({
    wsRequest: wsRequestValidator,
    wsQuery: wsQueryValidator,
  })
  .state({
    wsIdToUserIdMap: new Map<string, bigint>(),
    wsIdToApiWrapperMap: new Map<string, ApiWrapper>(),
  })
