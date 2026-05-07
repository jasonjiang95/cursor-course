import type { AnchorHTMLAttributes, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type ChatMarkdownProps = {
  text: string
  className?: string
}

/**
 * 助手正文支持 Markdown（加粗、列表、代码围栏等）。
 */
export function ChatMarkdown({ text, className }: ChatMarkdownProps) {
  return (
    <div className={className ?? 'chat-md'}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MdLink }}>
        {text}
      </ReactMarkdown>
    </div>
  )
}

function MdLink({
  href,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  )
}
