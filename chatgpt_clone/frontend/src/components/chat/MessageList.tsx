import { useEffect, useRef } from 'react';
import type { Message } from '@/types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 sm:py-6">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
