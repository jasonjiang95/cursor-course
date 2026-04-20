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
    <div className={`flex gap-2 sm:gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium ${
          isUser ? 'bg-blue-500' : 'bg-green-600'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[85%] sm:max-w-[80%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* Role Label */}
        <div className={`text-xs text-gray-500 mb-1 ${isUser ? 'text-right' : ''}`}>
          {isUser ? '你' : 'DeepSeek'}
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
          className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
          ) : hasContent ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownRenderer content={message.content} />
            </div>
          ) : isStreaming ? (
            <LoadingDots />
          ) : null}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.created_at).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
