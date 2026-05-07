import type {
  CreateSessionBody,
  MessagesListResponse,
  PatchSessionBody,
  SessionSummary,
  SessionsListResponse,
} from '../types/api'
import { apiV1Path, fetchJson } from './client'

/** `GET /api/v1/sessions` */
export async function listSessions(): Promise<SessionsListResponse> {
  return fetchJson<SessionsListResponse>(apiV1Path('/sessions'))
}

/** `POST /api/v1/sessions` */
export async function createSession(body: CreateSessionBody = {}): Promise<SessionSummary> {
  return fetchJson<SessionSummary>(apiV1Path('/sessions'), {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** `PATCH /api/v1/sessions/{session_id}` */
export async function patchSession(
  sessionId: string,
  body: PatchSessionBody,
): Promise<SessionSummary> {
  return fetchJson<SessionSummary>(apiV1Path(`/sessions/${encodeURIComponent(sessionId)}`), {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/** `DELETE /api/v1/sessions/{session_id}` → 204 */
export async function deleteSession(sessionId: string): Promise<void> {
  await fetchJson<void>(apiV1Path(`/sessions/${encodeURIComponent(sessionId)}`), {
    method: 'DELETE',
  })
}

/** `GET /api/v1/sessions/{session_id}/messages` */
export async function listMessages(sessionId: string): Promise<MessagesListResponse> {
  return fetchJson<MessagesListResponse>(
    apiV1Path(`/sessions/${encodeURIComponent(sessionId)}/messages`),
  )
}
