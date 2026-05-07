import { useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'

import type { VizPayload } from '../../types/chat'

export type VizChartKind = Exclude<VizPayload['chartType'], never>

/** 多列演示行；表格视图会展示全部列；图表仍使用 xKey / yKey。 */
export const DEMO_ROWS: Record<string, unknown>[] = [
  { region: '华东', amount: 120, share: '28%' },
  { region: '华北', amount: 95, share: '22%' },
  { region: '华南', amount: 140, share: '33%' },
  { region: '西南', amount: 78, share: '17%' },
]

const DEMO_BASE = {
  kind: 'echarts' as const,
  seriesName: '销售额',
  xKey: 'region',
  yKey: 'amount',
  rows: DEMO_ROWS,
}

/** 与各 `chartType` 对应的演示 `VizPayload`（仍为规则组装 option，非整段手写 LLM option）。 */
export function demoPayloadFor(chartType: VizChartKind): VizPayload {
  switch (chartType) {
    case 'bar':
      return {
        ...DEMO_BASE,
        chartType: 'bar',
        title: '各地区销售额 · 柱状图',
      }
    case 'line':
      return {
        ...DEMO_BASE,
        chartType: 'line',
        title: '各地区销售额 · 折线图',
      }
    case 'pie':
      return {
        ...DEMO_BASE,
        chartType: 'pie',
        title: '各地区销售额占比 · 饼图',
        seriesName: '销售额',
      }
    case 'table':
      return {
        ...DEMO_BASE,
        chartType: 'table',
        title: '各地区销售数据 · 表格',
        seriesName: undefined,
      }
  }
}

/** @deprecated 使用 `demoPayloadFor('bar')` */
export const demoViz: VizPayload = demoPayloadFor('bar')

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const CHART_TEXT = '#9ca3af'
const CHART_LINE = '#374151'
const ACCENT = '#3b82f6'

function buildOption(viz: VizPayload): EChartsOption | null {
  const { chartType, xKey, yKey, title, seriesName, rows } = viz

  if (chartType === 'pie') {
    const data = rows.map((row) => ({
      name: String(row[xKey] ?? ''),
      value: toNumber(row[yKey]),
    }))
    return {
      backgroundColor: 'transparent',
      textStyle: { color: CHART_TEXT },
      title: title
        ? { text: title, left: 'center', textStyle: { color: '#e5e7eb', fontSize: 14 } }
        : undefined,
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1f2937',
        borderColor: CHART_LINE,
        textStyle: { color: '#f3f4f6' },
      },
      series: [
        {
          type: 'pie',
          radius: '60%',
          name: seriesName ?? 'series',
          data,
          itemStyle: { borderColor: '#16171e', borderWidth: 1 },
          label: { color: CHART_TEXT },
        },
      ],
    }
  }

  if (chartType === 'line' || chartType === 'bar') {
    const categories = rows.map((row) => String(row[xKey] ?? ''))
    const values = rows.map((row) => toNumber(row[yKey]))
    return {
      backgroundColor: 'transparent',
      textStyle: { color: CHART_TEXT },
      title: title
        ? { text: title, left: 'center', textStyle: { color: '#e5e7eb', fontSize: 14 } }
        : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1f2937',
        borderColor: CHART_LINE,
        textStyle: { color: '#f3f4f6' },
      },
      grid: { left: 48, right: 16, bottom: 32, top: title ? 48 : 28 },
      xAxis: {
        type: 'category',
        data: categories,
        boundaryGap: chartType === 'bar',
        axisLine: { lineStyle: { color: CHART_LINE } },
        axisLabel: { color: CHART_TEXT },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: CHART_LINE, type: 'dashed' } },
        axisLabel: { color: CHART_TEXT },
      },
      series: [
        {
          type: chartType,
          name: seriesName ?? '值',
          data: values,
          itemStyle: chartType === 'bar' ? { color: ACCENT } : undefined,
          lineStyle: chartType === 'line' ? { color: ACCENT, width: 2 } : undefined,
          areaStyle:
            chartType === 'line' ? { color: 'rgba(59, 130, 246, 0.12)' } : undefined,
        },
      ],
    }
  }

  return null
}

function tableColumnKeys(rows: Record<string, unknown>[], xKey: string, yKey: string): string[] {
  const fromData = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const priority = [xKey, yKey].filter((k) => fromData.includes(k))
  const rest = fromData.filter((k) => !priority.includes(k)).sort()
  return [...priority, ...rest]
}

type VizPanelProps = {
  viz: VizPayload | null
}

export function VizPanel({ viz }: VizPanelProps) {
  const option = useMemo(() => (viz ? buildOption(viz) : null), [viz])

  if (!viz) {
    return (
      <div
        style={{
          padding: '1.25rem',
          color: 'var(--text-muted)',
          fontSize: '0.86rem',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        暂无图表数据
      </div>
    )
  }

  if (viz.chartType === 'table') {
    const { title, rows, xKey, yKey } = viz
    const columns = tableColumnKeys(rows, xKey, yKey)

    return (
      <div style={{ padding: '0.5rem 0', overflow: 'auto', maxHeight: '100%' }}>
        {title ? (
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-h)',
              margin: '0 0 0.65rem',
            }}
          >
            {title}
          </div>
        ) : null}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8rem',
          }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  style={{
                    textAlign: col === yKey ? 'right' : 'left',
                    borderBottom: '1px solid var(--border)',
                    padding: '0.4rem 0.5rem',
                    whiteSpace: 'nowrap',
                    color: '#9ca3af',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td
                    key={col}
                    style={{
                      textAlign: col === yKey ? 'right' : 'left',
                      borderBottom: '1px solid var(--border)',
                      padding: '0.45rem 0.5rem',
                      color: 'var(--text-h)',
                    }}
                  >
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!option) return null

  return (
    <div style={{ padding: '0.25rem 0', width: '100%', boxSizing: 'border-box', flex: 1, minHeight: 220 }}>
      <ReactECharts option={option} style={{ height: 'min(340px, 42vh)', minHeight: 220 }} notMerge lazyUpdate />
    </div>
  )
}

const MODE_TABS: { key: VizChartKind; label: string }[] = [
  { key: 'bar', label: '柱状图' },
  { key: 'line', label: '折线图' },
  { key: 'pie', label: '饼图' },
  { key: 'table', label: '表格' },
]

/** 右侧栏：切换四种演示视图（Phase 2 mock；Phase 4 可改为绑消息里的 `viz_payload`）。 */
export function VizPanelWithModeSwitch() {
  const [mode, setMode] = useState<VizChartKind>('bar')
  const viz = useMemo(() => demoPayloadFor(mode), [mode])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        role="tablist"
        aria-label="图表类型"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '0.5rem 0.75rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
        }}
      >
        {MODE_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            style={{
              padding: '0.35rem 0.6rem',
              fontSize: '0.8rem',
              borderRadius: 6,
              border:
                mode === key
                  ? '1px solid var(--accent-border)'
                  : '1px solid var(--border)',
              background: mode === key ? 'var(--accent-bg)' : 'transparent',
              color: 'var(--text-h)',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <VizPanel viz={viz} />
      </div>
    </div>
  )
}
