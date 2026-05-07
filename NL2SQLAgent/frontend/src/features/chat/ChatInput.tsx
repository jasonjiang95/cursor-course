import { useState, type FormEvent } from 'react'

type ChatInputProps = {
  onSend: (text: string) => void
  disabled?: boolean
  submitting?: boolean
}

export function ChatInput({ onSend, disabled, submitting }: ChatInputProps) {
  const [value, setValue] = useState('')

  function flushSend() {
    const t = value.trim()
    if (!t || disabled || submitting) return false
    setValue('')
    onSend(t)
    return true
  }

  function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    flushSend()
  }

  const inactive = disabled || submitting

  return (
    <form
      onSubmit={onSubmit}
      style={{
        flexShrink: 0,
        padding: '0.75rem 1rem',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end',
        background: 'var(--panel-chat)',
      }}
    >
      <textarea
        value={value}
        disabled={inactive}
        placeholder={submitting ? '等待回复…' : '输入问题…'}
        rows={2}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            flushSend()
          }
        }}
        style={{
          flex: 1,
          resize: 'none',
          padding: '0.5rem 0.65rem',
          borderRadius: 8,
          border: '1px solid var(--border)',
          fontFamily: 'inherit',
          fontSize: '0.9rem',
          background: 'var(--code-bg)',
          color: 'var(--text-h)',
          minHeight: '2.75rem',
        }}
      />
      <button
        type="submit"
        disabled={inactive || !value.trim()}
        style={{
          padding: '0.55rem 1rem',
          borderRadius: 8,
          border: '1px solid var(--accent-border)',
          background: 'var(--accent)',
          color: '#fff',
          cursor: inactive ? 'not-allowed' : 'pointer',
          fontWeight: 500,
          opacity: inactive ? 0.6 : 1,
        }}
      >
        {submitting ? '…' : '发送'}
      </button>
    </form>
  )
}
