interface DifyEventBase {
  conversation_id: string
  message_id: string
  created_at: number
  task_id: string
}

export interface DifyEventMessage extends DifyEventBase {
  event: 'message'
  id: string
  answer: string
  from_variable_selector: string[]
}

export interface DifyEventNodeFinished {
  event: 'node_finished'
  workflow_run_id: string
  data: {
    id: string
    node_id: string
    node_type: string
    title:
      | 'ask_city'
      | 'casual_conversation'
      | 'emotional_companionship'
      | 'summary_weather_information'
      | 'tell_story'
    index: number
    predecessor_node_id: string
    inputs: Record<string, string>
    process_data: {
      model_mode: string
      model_name: string
      model_provider: string
      prompts: {
        role: 'system' | 'user' | 'assistant'
        text: string
        files: string[]
      }[]
    }
    outputs: {
      text: string
      usage: {
        prompt_tokens: number
        prompt_unit_price: string
        prompt_price_unit: string
        prompt_price: string
        completion_tokens: number
        completion_unit_price: string
        completion_price_unit: string
        completion_price: string
        total_tokens: number
        total_price: string
        currency: string
        latency: number
      }
    }
    status: string
    error: string | null
    elapsed_time: number
    execution_metadata: {
      total_tokens: number
      total_price: string
      currency: string
    }
    created_at: number
    finished_at: number
    files: string[]
    parallel_id: string | null
    parallel_start_node_id: string | null
    parent_parallel_id: string | null
    parent_parallel_start_node_id: string | null
    iteration_id: string | null
    loop_id: string | null
  }
}

export type DifyEvent = DifyEventMessage | DifyEventNodeFinished
