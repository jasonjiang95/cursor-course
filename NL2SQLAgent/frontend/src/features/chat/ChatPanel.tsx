import { useEffect, useRef } from 'react'

import { useSessionStore } from '../../stores/sessionStore'
import type { ChatMessage } from '../../types/chat'
import { ChatMarkdown } from './ChatMarkdown'
import { ChatInput } from './ChatInput'

export function ChatPanel() {
  const currentSessionId = useSessionStore((s) => s.currentSessionId)
  const messagesBySessionId = useSessionStore((s) => s.messagesBySessionId)
  const sendMessage = useSessionStore((s) => s.sendMessage)
  const loading = useSessionStore((s) => s.loading)
  const ready = useSessionStore((s) => s.ready)
  const scrollRef = useRef<HTMLDivElement>(null)

  const messages =
    currentSessionId != null ? (messagesBySessionId[currentSessionId] ?? []) : []

  const scrollKey =
    messages.length > 0
      ? `${messages.length}-${messages[messages.length - 1]?.id ?? ''}-${messages[messages.length - 1]?.content?.length ?? 0}`
      : '0'

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [scrollKey])

  async function handleSend(text: string) {
    if (currentSessionId == null || !ready) return
    await sendMessage(text)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <header
        style={{
          flexShrink: 0,
          padding: '0.65rem 1rem',
          borderBottom: '1px solid var(--border)',
          fontSize: '0.92rem',
          fontWeight: 600,
          color: 'var(--text-h)',
          background: 'rgba(0,0,0,0.12)',
        }}
      >
        对话
      </header>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          textAlign: 'left',
        }}
      >
        {!ready ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>加载完成后可对话。</p>
        ) : currentSessionId == null ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>请选择或新建会话后开始对话。</p>
        ) : messages.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.65 }}>
            试着问「数据库里有哪些表？」或「按区域汇总销售额」；右侧将展示 SQL 与图表。
          </p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>
      <ChatInput
        onSend={(t) => void handleSend(t)}
        disabled={currentSessionId == null || !ready}
        submitting={loading}
      />
    </div>
  )
}

function MessageBubble({ message: m }: { message: ChatMessage }) {
  const isUser = m.role === 'user'
  return (
    <div
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: 'min(100%, 40rem)',
        padding: isUser ? '0.55rem 0.75rem' : '0.85rem 1rem',
        borderRadius: 12,
        background: isUser ? 'var(--bubble-user)' : 'var(--bubble-assistant)',
        border: `1px solid ${isUser ? 'rgba(59, 130, 246, 0.35)' : 'var(--border)'}`,
        color: 'var(--text-h)',
        fontSize: '0.9rem',
        lineHeight: 1.5,
        boxShadow: isUser ? 'none' : 'var(--shadow)',
      }}
    >
      {isUser ? (
        <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
      ) : (
        <ChatMarkdown text={m.content} />
      )}
      {m.error ? (
        <div style={{ marginTop: 10, color: '#f87171', fontSize: '0.85rem' }}>{m.error}</div>
      ) : null}
      {m.role === 'assistant' && m.sql ? (
        <details className="chat-sql" style={{ marginTop: 12 }}>
          <summary
            style={{
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              userSelect: 'none',
              listStyle: 'none',
            }}
          >
            <span style={{ fontFamily: 'var(--mono)', marginRight: 6, opacity: 0.85 }}>
              &lt;&gt;
            </span>
            执行的 SQL
          </summary>
          <pre
            style={{
              margin: '0.5rem 0 0',
              padding: '0.6rem 0.7rem',
              fontSize: '0.76rem',
              overflowX: 'auto',
              borderRadius: 8,
              background: 'var(--code-bg)',
              border: '1px solid var(--border)',
              color: '#d1d5db',
              fontFamily: 'var(--mono)',
              lineHeight: 1.45,
            }}
          >
            <code>{m.sql}</code>
          </pre>
        </details>
      ) : null}
    </div>
  )
}
