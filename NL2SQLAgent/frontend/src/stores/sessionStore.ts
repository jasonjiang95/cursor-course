import { create } from 'zustand'

import { postChatStream } from '../api/chat'
import {
  createSession as apiCreateSession,
  listMessages,
  listSessions,
} from '../api/sessions'
import type { ChatMessage, SessionSummary } from '../types/chat'

/** 流式回合中占位助手气泡 id（done 时用服务端正式消息替换最后两条） */
export const STREAMING_ASSISTANT_ID = '__streaming__'

type SessionState = {
  sessions: SessionSummary[]
  currentSessionId: string | null
  messagesBySessionId: Record<string, ChatMessage[]>
  loading: boolean
  ready: boolean
  error: string | null

  hydrate: () => Promise<void>
  clearError: () => void
  createSession: () => Promise<void>
  selectSession: (id: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messagesBySessionId: {},
  loading: false,
  ready: false,
  error: null,

  clearError: () => set({ error: null }),

  hydrate: async () => {
    set({ loading: true, error: null, ready: false })
    try {
      let { sessions } = await listSessions()
      if (sessions.length === 0) {
        const created = await apiCreateSession({})
        sessions = [created]
      }
      const currentId = sessions[0]?.id ?? null

      const messagesBySessionId: Record<string, ChatMessage[]> = {}
      for (const s of sessions) {
        messagesBySessionId[s.id] = []
      }

      if (currentId) {
        const { messages } = await listMessages(currentId)
        messagesBySessionId[currentId] = messages
      }

      set({
        sessions,
        currentSessionId: currentId,
        messagesBySessionId,
        loading: false,
        ready: true,
      })
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : '无法连接后端（请确认已启动 backend、VITE_API_BASE_URL 与 CORS 正确）。'
      set({ error: msg, loading: false, ready: false })
    }
  },

  createSession: async () => {
    set({ loading: true, error: null })
    try {
      const s = await apiCreateSession({})
      set((st) => ({
        sessions: [s, ...st.sessions],
        currentSessionId: s.id,
        messagesBySessionId: { ...st.messagesBySessionId, [s.id]: [] },
        loading: false,
      }))
    } catch (e: unknown) {
      set({
        error: e instanceof Error ? e.message : '新建会话失败',
        loading: false,
      })
    }
  },

  selectSession: async (id: string) => {
    set({ loading: true, error: null, currentSessionId: id })
    try {
      const { messages } = await listMessages(id)
      set((st) => ({
        messagesBySessionId: { ...st.messagesBySessionId, [id]: messages },
        loading: false,
      }))
    } catch (e: unknown) {
      set({
        error: e instanceof Error ? e.message : '加载消息失败',
        loading: false,
      })
    }
  },

  sendMessage: async (content: string) => {
    const sid = get().currentSessionId
    if (!sid) return
    set({ loading: true, error: null })

    let streamedAssistant = ''

    try {
      await postChatStream(
        sid,
        { content },
        {
          onUser: (userMsg) => {
            set((st) => ({
              messagesBySessionId: {
                ...st.messagesBySessionId,
                [sid]: [...(st.messagesBySessionId[sid] ?? []), userMsg],
              },
            }))
          },
          onAssistantStart: () => {
            set((st) => ({
              messagesBySessionId: {
                ...st.messagesBySessionId,
                [sid]: [
                  ...(st.messagesBySessionId[sid] ?? []),
                  {
                    id: STREAMING_ASSISTANT_ID,
                    role: 'assistant',
                    content: '',
                    created_at: new Date().toISOString(),
                  },
                ],
              },
            }))
          },
          onDelta: (piece) => {
            streamedAssistant += piece
            set((st) => {
              const msgs = [...(st.messagesBySessionId[sid] ?? [])]
              const idx = msgs.findIndex((m) => m.id === STREAMING_ASSISTANT_ID)
              if (idx >= 0) {
                msgs[idx] = {
                  ...msgs[idx],
                  content: streamedAssistant,
                }
              }
              return {
                messagesBySessionId: { ...st.messagesBySessionId, [sid]: msgs },
              }
            })
          },
          onDone: (round) => {
            set((st) => {
              const prev = [...(st.messagesBySessionId[sid] ?? [])]
              const tail = prev.length >= 2 ? prev.slice(0, -2) : prev
              return {
                loading: false,
                messagesBySessionId: {
                  ...st.messagesBySessionId,
                  [sid]: [...tail, round.user_message, round.assistant_message],
                },
              }
            })
          },
        },
      )
      const next = await listSessions()
      set({ sessions: next.sessions })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '发送失败'
      set({ error: msg, loading: false })
      try {
        const { messages } = await listMessages(sid)
        set((st) => ({
          messagesBySessionId: { ...st.messagesBySessionId, [sid]: messages },
        }))
      } catch {
        /* ignore */
      }
    }
  },
}))
