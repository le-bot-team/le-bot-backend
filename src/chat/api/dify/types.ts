export interface DifyStreamMessage {
  event: string
  conversation_id: string
  message_id: string
  created_at: number
  task_id: string
  id: string
  answer: string
  from_variable_selector: string[]
}