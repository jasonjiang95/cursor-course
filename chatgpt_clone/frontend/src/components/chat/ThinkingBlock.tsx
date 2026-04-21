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
    <div className="mb-4 rounded-2xl overflow-hidden backdrop-blur-sm bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-300/30 dark:border-purple-700/30 shadow-lg shadow-purple-500/5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-purple-500/10 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <span className="text-sm">🧠</span>
          </div>
          <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
            思考过程
          </span>
          {isStreaming ? (
            <span className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">思考中...</span>
            </span>
          ) : (
            <span className="text-xs text-purple-500 dark:text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">
              {lineCount} 行 · {charCount} 字符
            </span>
          )}
        </div>
        <div className={`w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg
            className="w-4 h-4 text-purple-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-4 sm:px-5 py-4 border-t border-purple-300/20 dark:border-purple-700/20 max-h-80 overflow-y-auto">
          <div className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap leading-relaxed font-mono bg-white/50 dark:bg-gray-900/50 rounded-xl p-4">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
