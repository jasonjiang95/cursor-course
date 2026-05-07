import type { ReactNode } from 'react'

type AppLayoutProps = {
  sidebar: ReactNode
  chat: ReactNode
  viz: ReactNode
}

export function AppLayout({ sidebar, chat, viz }: AppLayoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        width: '100%',
        overflow: 'hidden',
        fontFamily: 'var(--sans)',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      <aside
        style={{
          width: 'clamp(240px, 26vw, 280px)',
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: 'var(--sidebar-bg)',
        }}
      >
        {sidebar}
      </aside>
      <section
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border)',
          minHeight: 0,
          background: 'var(--panel-chat)',
        }}
      >
        {chat}
      </section>
      <aside
        style={{
          flex: '0 0 auto',
          minWidth: 320,
          width: 'min(440px, 36vw)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {viz}
      </aside>
    </div>
  )
}
