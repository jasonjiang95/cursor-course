import { useEffect } from 'react'

import { DataVizPanel } from './features/charts/DataVizPanel'
import { ChatPanel } from './features/chat/ChatPanel'
import { SessionSidebar } from './features/sessions/SessionSidebar'
import { AppLayout } from './layouts/AppLayout'
import { useSessionStore } from './stores/sessionStore'

function ApiStatusBar() {
  const loading = useSessionStore((s) => s.loading)
  const ready = useSessionStore((s) => s.ready)
  const error = useSessionStore((s) => s.error)
  const clearError = useSessionStore((s) => s.clearError)

  if (error) {
    return (
      <div
        role="alert"
        style={{
          padding: '0.5rem 1rem',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#fca5a5',
          borderBottom: '1px solid rgba(239, 68, 68, 0.35)',
          fontSize: '0.82rem',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ wordBreak: 'break-word' }}>{error}</span>
        <button
          type="button"
          onClick={() => clearError()}
          style={{
            flexShrink: 0,
            background: 'transparent',
            border: '1px solid rgba(239,68,68,0.45)',
            color: '#fca5a5',
            borderRadius: 6,
            padding: '0.2rem 0.6rem',
            cursor: 'pointer',
          }}
        >
          关闭
        </button>
      </div>
    )
  }

  if (!ready || loading) {
    return (
      <div
        style={{
          padding: '0.35rem 1rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          background: 'var(--sidebar-bg)',
        }}
      >
        {ready ? '处理中…' : '正在连接后端并加载会话…'}
      </div>
    )
  }

  return null
}

export default function App() {
  const hydrate = useSessionStore((s) => s.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <ApiStatusBar />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <AppLayout sidebar={<SessionSidebar />} chat={<ChatPanel />} viz={<DataVizPanel />} />
      </div>
    </div>
  )
}
