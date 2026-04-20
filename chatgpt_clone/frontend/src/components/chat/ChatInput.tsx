import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
}

export function ChatInput({ onSend, onStop, disabled, isGenerating }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled && !isGenerating) {
      onSend(trimmed);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 sm:px-4 py-3 sm:py-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 sm:gap-3 bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 sm:px-4 py-2 sm:py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            disabled={disabled || isGenerating}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 text-sm leading-6"
          />
          
          {isGenerating ? (
            <button
              onClick={onStop}
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 cursor-pointer transition-colors"
              title="停止生成"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={disabled || !input.trim()}
              className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                disabled || !input.trim()
                  ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
              }`}
              title="发送消息"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 text-center mt-2 hidden sm:block">
          DeepSeek 可能会产生错误信息，请仔细核实重要内容
        </p>
      </div>
    </div>
  );
}
