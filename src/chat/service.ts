import { Elysia } from 'elysia'
import { wsRequestValidator, wsQueryValidator } from './validation/websocket'
import { CozeWsWrapper } from './types/coze'

export const chatService = new Elysia({ name: 'chat/service' }).model({
  wsRequest: wsRequestValidator,
  wsQuery: wsQueryValidator,
}).state({
  wsIdToUserIdMap: new Map<string, bigint>(),
  wsIdToWsWrapperMap: new Map<string, CozeWsWrapper>()
})
