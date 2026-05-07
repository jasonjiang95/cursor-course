/** 与后端 `app/schemas/chat.py` 及 FastAPI JSON 输出字段名一致（snake_case）。 */

export type Role = 'user' | 'assistant'

/** 对应 `VizPayload`；未返回的可选键可能缺省（与 Pydantic `model_dump` 行为一致）。 */
export type VizPayload = {
  kind: 'echarts'
  chartType: 'bar' | 'line' | 'pie' | 'table'
  title?: string | null
  seriesName?: string | null
  xKey: string
  yKey: string
  rows: Record<string, unknown>[]
}

/**
 * 对应 `ChatMessage`。用户消息通常 `sql`/`viz_payload`/`error` 为 `null`；
 * 助手消息由 `extra` 展开，字段可能为字符串、`viz` 对象或 `null`。
 */
export interface ChatMessage {
  id: string
  role: Role
  content: string
  created_at: string
  sql?: string | null
  viz_payload?: VizPayload | null
  error?: string | null
}

/** 对应 `SessionSummary`：`title` 缺省或 DB 为 null 时后端归一为 `""`。 */
export interface SessionSummary {
  id: string
  title: string
  created_at: string
  updated_at: string
}
