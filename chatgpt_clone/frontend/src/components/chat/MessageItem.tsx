import type { Message } from '@/types';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { LoadingDots } from '@/components/common/LoadingDots';
import { ThinkingBlock } from './ThinkingBlock';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;
  const hasContent = message.content.length > 0;

  return (
    <div className={`flex gap-3 sm:gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white text-sm font-bold">U</span>
          </div>
        ) : (
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-lg">🤖</span>
            </div>
            {isStreaming && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
            )}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[85%] sm:max-w-[80%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* Role Label */}
        <div className={`text-xs font-medium mb-2 ${isUser ? 'text-right text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {isUser ? '你' : 'DeepSeek AI'}
          {isStreaming && <span className="ml-2 text-gray-400">正在输入...</span>}
        </div>

        {/* Thinking Block (for AI messages in reasoner mode) */}
        {!isUser && message.reasoning_content && (
          <ThinkingBlock 
            content={message.reasoning_content} 
            isStreaming={isStreaming && !hasContent}
          />
        )}

        {/* Message Bubble */}
        <div
          className={`rounded-3xl px-5 py-4 shadow-lg ${
            isUser
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20'
              : 'backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 border border-white/30 dark:border-gray-700/50 shadow-gray-500/10'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{message.content}</p>
          ) : hasContent ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700">
              <MarkdownRenderer content={message.content} />
            </div>
          ) : isStreaming ? (
            <LoadingDots />
          ) : null}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-gray-400 mt-2 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
