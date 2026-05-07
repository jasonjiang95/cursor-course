import { useEffect, useMemo, useRef, useState } from 'react'

import { useSessionStore } from '../../stores/sessionStore'
import type { ChatMessage, VizPayload } from '../../types/chat'
import { VizPanel } from './VizPanel'

type DisplayTab = 'chart' | 'table'
type ChartSubtype = 'bar' | 'line' | 'pie'

function pickLastAssistantArtifact(
  messages: ChatMessage[],
): { sql: string | null; viz: VizPayload | null } {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'assistant' && (m.sql || m.viz_payload)) {
      return { sql: m.sql ?? null, viz: m.viz_payload ?? null }
    }
  }
  return { sql: null, viz: null }
}

function SqlBlock({ sql }: { sql: string }) {
  return (
    <section style={{ marginBottom: '0.75rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          marginBottom: 6,
        }}
      >
        <span style={{ fontFamily: 'var(--mono)', opacity: 0.85 }}>&lt;&gt;</span>
        执行的 SQL
      </div>
      <pre
        style={{
          margin: 0,
          padding: '0.65rem 0.75rem',
          fontSize: '0.75rem',
          lineHeight: 1.45,
          overflowX: 'auto',
          borderRadius: 8,
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          color: '#d1d5db',
          fontFamily: 'var(--mono)',
        }}
      >
        <code>{sql}</code>
      </pre>
    </section>
  )
}

export function DataVizPanel() {
  const currentSessionId = useSessionStore((s) => s.currentSessionId)
  const messagesBySessionId = useSessionStore((s) => s.messagesBySessionId)

  const { sql, viz } = useMemo(() => {
    if (!currentSessionId) return { sql: null as string | null, viz: null as VizPayload | null }
    return pickLastAssistantArtifact(messagesBySessionId[currentSessionId] ?? [])
  }, [currentSessionId, messagesBySessionId])

  const [displayTab, setDisplayTab] = useState<DisplayTab>('chart')
  const [chartSubtype, setChartSubtype] = useState<ChartSubtype>('bar')

  const vizFingerprint = viz
    ? `${viz.chartType}:${viz.xKey}:${viz.yKey}:${viz.rows?.length ?? 0}`
    : ''

  const didInitSubtype = useRef<string>('')
  useEffect(() => {
    if (!viz || vizFingerprint === didInitSubtype.current) return
    didInitSubtype.current = vizFingerprint
    if (viz.chartType === 'table') {
      setDisplayTab('table')
      setChartSubtype('bar')
    } else if (viz.chartType === 'bar' || viz.chartType === 'line' || viz.chartType === 'pie') {
      setChartSubtype(viz.chartType)
      setDisplayTab('chart')
    }
  }, [viz, vizFingerprint])

  const effectiveViz: VizPayload | null = useMemo(() => {
    if (!viz || !viz.rows?.length) return null
    if (displayTab === 'table') {
      return { ...viz, chartType: 'table', title: viz.title ?? undefined }
    }
    return { ...viz, chartType: chartSubtype, title: viz.title ?? undefined }
  }, [viz, displayTab, chartSubtype])

  const CHART_BTN: { key: ChartSubtype; label: string }[] = [
    { key: 'bar', label: '柱状图' },
    { key: 'line', label: '折线图' },
    { key: 'pie', label: '饼图' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: 'var(--panel-viz)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 1rem',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-h)' }}>
          数据可视化
        </span>
        <div
          role="tablist"
          aria-label="视图切换"
          style={{
            display: 'flex',
            borderRadius: 8,
            border: '1px solid var(--border)',
            overflow: 'hidden',
            fontSize: '0.78rem',
          }}
        >
          {(
            [
              { key: 'chart' as const, label: '图表' },
              { key: 'table' as const, label: '表格' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={displayTab === key}
              onClick={() => setDisplayTab(key)}
              style={{
                padding: '0.35rem 0.85rem',
                border: 'none',
                cursor: 'pointer',
                background:
                  displayTab === key ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                color: displayTab === key ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: displayTab === key ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: '0.75rem 1rem',
        }}
      >
        {sql ? <SqlBlock sql={sql} /> : null}

        {displayTab === 'chart' && effectiveViz && effectiveViz.chartType !== 'table' ? (
          <div
            role="tablist"
            aria-label="图表类型"
            style={{ display: 'flex', gap: 8, marginBottom: '0.65rem', flexWrap: 'wrap' }}
          >
            {CHART_BTN.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setChartSubtype(key)}
                aria-pressed={chartSubtype === key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0.38rem 0.72rem',
                  fontSize: '0.8rem',
                  borderRadius: 8,
                  border:
                    chartSubtype === key ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background:
                    chartSubtype === key ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                  color: chartSubtype === key ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: chartSubtype === key ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--result-bg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '0.55rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-h)',
              borderBottom: '1px solid var(--border)',
              background: 'rgba(0,0,0,0.15)',
            }}
          >
            查询结果
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0.5rem 0.75rem 0.75rem' }}>
            {effectiveViz ? (
              <VizPanel viz={effectiveViz} />
            ) : (
              <div
                style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                }}
              >
                {sql && !viz
                  ? '当前回复未返回可视化数据（viz_payload）；仅展示上方 SQL。'
                  : '与助手对话后，将在此展示图表或表格。'}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 'auto',
            paddingTop: '0.65rem',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border-soft)',
          }}
        >
          API：<code style={{ fontSize: 'inherit' }}>{import.meta.env.VITE_API_BASE_URL ?? '—'}</code>
        </div>
      </div>
    </div>
  )
}
