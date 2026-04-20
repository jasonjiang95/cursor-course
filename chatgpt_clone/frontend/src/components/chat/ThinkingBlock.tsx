import { useState, useEffect } from 'react';

interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
}

export function ThinkingBlock({ content, isStreaming }: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    }
  }, [isStreaming]);

  if (!content) return null;

  const charCount = content.length;
  const lineCount = content.split('\n').length;

  return (
    <div className="mb-3 border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden bg-purple-50/50 dark:bg-purple-900/20">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 sm:px-4 py-2 bg-purple-100/50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base sm:text-lg">🧠</span>
          <span className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300">
            思考过程
          </span>
          {isStreaming ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-purple-500">思考中...</span>
            </span>
          ) : (
            <span className="text-xs text-purple-500 dark:text-purple-400">
              ({lineCount} 行, {charCount} 字符)
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-purple-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="px-3 sm:px-4 py-3 border-t border-purple-200 dark:border-purple-800 max-h-64 sm:max-h-96 overflow-y-auto">
          <div className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 whitespace-pre-wrap leading-relaxed font-mono">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
