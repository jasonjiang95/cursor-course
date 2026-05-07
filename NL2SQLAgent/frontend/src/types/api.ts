/**
 * REST 请求/响应体 —— 与后端 `app/schemas/chat.py` 一一对应。
 * 路径前缀：`GET /health`；其余为 `/api/v1/...`。
 */

import type { ChatMessage, SessionSummary } from './chat'

export type { ChatMessage, SessionSummary, VizPayload, Role } from './chat'

export type HealthResponse = {
  status: 'ok'
}

/** `SessionsListResponse` */
export type SessionsListResponse = {
  sessions: SessionSummary[]
}

/** `MessagesListResponse` */
export type MessagesListResponse = {
  messages: ChatMessage[]
}

/** `ChatRoundResponse` */
export type ChatRoundResponse = {
  user_message: ChatMessage
  assistant_message: ChatMessage
}

/** `CreateSessionBody` */
export type CreateSessionBody = {
  title?: string | null
}

/** `PatchSessionBody` */
export type PatchSessionBody = {
  title: string
}

/** `ChatRequestBody` */
export type ChatRequestBody = {
  content: string
}
