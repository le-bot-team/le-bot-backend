import { Elysia } from 'elysia'

import { ApiWrapper } from './wrapper'
import { wsRequestValidator, wsQueryValidator } from './model'

export const chatService = new Elysia({ name: 'chat/service' })
  .model({
    wsRequest: wsRequestValidator,
    wsQuery: wsQueryValidator,
  })
  .state({
    wsIdToUserIdMap: new Map<string, string>(),
    wsIdToApiWrapperMap: new Map<string, ApiWrapper>(),
  })
