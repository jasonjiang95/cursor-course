import { useSessionStore } from '../../stores/sessionStore'

function DbIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
      <ellipse cx="12" cy="6" rx="7" ry="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 6v5c0 1.7 3.1 3 7 3s7-1.3 7-3V6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H12l-4 4v-4H4a2 2 0 01-2-2V6a2 2 0 012-2zm3 9h10v-2H7v2zm0-4h14V6H7v3z" />
    </svg>
  )
}

export function SessionSidebar() {
  const sessions = useSessionStore((s) => s.sessions)
  const currentSessionId = useSessionStore((s) => s.currentSessionId)
  const createSession = useSessionStore((s) => s.createSession)
  const selectSession = useSessionStore((s) => s.selectSession)
  const loading = useSessionStore((s) => s.loading)
  const ready = useSessionStore((s) => s.ready)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
          <div
            style={{
              flexShrink: 0,
              color: 'var(--accent)',
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DbIcon />
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-h)' }}>
              数据分析助理
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              NL2SQL Agent
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled={!ready || loading}
          onClick={() => void createSession()}
          style={{
            width: '100%',
            padding: '0.52rem 0.85rem',
            borderRadius: 8,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            cursor: !ready || loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '0.82rem',
            opacity: !ready || loading ? 0.55 : 1,
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
          }}
        >
          + 新建会话
        </button>
      </div>
      <nav
        aria-label="会话列表"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.5rem',
        }}
      >
        {sessions.map((s) => {
          const selected = s.id === currentSessionId
          return (
            <button
              key={s.id}
              type="button"
              disabled={loading}
              onClick={() => void selectSession(s.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                textAlign: 'left',
                padding: '0.52rem 0.75rem',
                marginBottom: 4,
                borderRadius: 8,
                border: selected ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                background: selected ? 'var(--accent-bg)' : 'transparent',
                cursor: loading ? 'wait' : 'pointer',
                fontSize: '0.86rem',
                color: selected ? 'var(--text-h)' : 'var(--text)',
              }}
            >
              <span style={{ color: selected ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>
                <ChatIcon />
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.title || '未命名会话'}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
