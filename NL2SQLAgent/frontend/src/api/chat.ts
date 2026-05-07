import type { ChatMessage, ChatRequestBody, ChatRoundResponse } from '../types/api'
import { apiV1Path, fetchJson, getApiBase } from './client'

/** `POST /api/v1/sessions/{session_id}/chat` */
export async function postChat(
  sessionId: string,
  body: ChatRequestBody,
): Promise<ChatRoundResponse> {
  return fetchJson<ChatRoundResponse>(
    apiV1Path(`/sessions/${encodeURIComponent(sessionId)}/chat`),
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}

export type ChatStreamHandler = {
  onUser: (m: ChatMessage) => void
  onAssistantStart: () => void
  onDelta: (text: string) => void
  onDone: (r: ChatRoundResponse) => void
  onErrorLine?: (message: string) => void
}

type StreamPayload =
  | { type: 'user'; message: ChatMessage }
  | { type: 'assistant_start' }
  | { type: 'delta'; text: string }
  | { type: 'done'; user_message: ChatMessage; assistant_message: ChatMessage }
  | { type: 'error'; message: string }

/** 从单个 SSE 事件块提取 data 行合并后的字符串（可多行 data，按规范用换行拼接） */
function extractSseDataPayload(block: string): string | null {
  const parts: string[] = []
  for (const rawLine of block.split(/\n/)) {
    const line = rawLine.replace(/\r$/, '')
    if (line === '' || line.startsWith(':')) continue
    if (line.startsWith('data:')) {
      parts.push(line.slice(5).replace(/^ ?/, ''))
    }
  }
  if (parts.length === 0) return null
  return parts.join('\n')
}

/** 让出主线程，避免同一轮同步处理大量 delta 时 React 合并更新导致「一口气出字」 */
function yieldPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

async function dispatchPayload(h: ChatStreamHandler, jsonStr: string): Promise<void> {
  if (!jsonStr.trim()) return
  let ev: StreamPayload
  try {
    ev = JSON.parse(jsonStr) as StreamPayload
  } catch {
    throw new Error('无法解析 SSE data JSON')
  }
  if (ev.type === 'user') {
    h.onUser(ev.message)
    return
  }
  if (ev.type === 'assistant_start') {
    h.onAssistantStart()
    return
  }
  if (ev.type === 'delta') {
    h.onDelta(ev.text)
    await yieldPaint()
    return
  }
  if (ev.type === 'done') {
    h.onDone({
      user_message: ev.user_message,
      assistant_message: ev.assistant_message,
    })
    return
  }
  if (ev.type === 'error') {
    h.onErrorLine?.(ev.message)
    throw new Error(ev.message)
  }
}

/** `POST /api/v1/sessions/{session_id}/chat/stream`，响应为 SSE（`text/event-stream`，`data:` JSON） */
export async function postChatStream(
  sessionId: string,
  body: ChatRequestBody,
  h: ChatStreamHandler,
): Promise<void> {
  const url = `${getApiBase()}${apiV1Path(`/sessions/${encodeURIComponent(sessionId)}/chat/stream`)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let msg = res.statusText
    try {
      const j: unknown = await res.json()
      if (typeof j === 'object' && j !== null && 'detail' in j) {
        const d = (j as { detail: unknown }).detail
        msg = typeof d === 'string' ? d : JSON.stringify(d)
      }
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status}: ${msg}`)
  }

  if (!res.body) {
    throw new Error('响应无正文（流式 chat 不可用）')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (value) {
      buffer += decoder.decode(value, { stream: true })
    }
    buffer = buffer.replace(/\r\n/g, '\n')
    while (true) {
      const sep = buffer.indexOf('\n\n')
      if (sep === -1) break
      const block = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const payloadStr = extractSseDataPayload(block)
      if (payloadStr != null) {
        await dispatchPayload(h, payloadStr.trim())
      }
    }
    if (done) break
  }

  const tail = buffer.trim()
  if (tail) {
    const p = extractSseDataPayload(tail)
    if (p?.trim()) {
      try {
        await dispatchPayload(h, p.trim())
      } catch {
        /* 末尾可能为半截 JSON，忽略 */
      }
    }
  }
}