import { useState } from 'react';

interface CodeBlockProps {
  children: string;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  
  const language = className?.replace('language-', '') || 'text';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 flex items-center gap-2">
        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? '已复制!' : '复制'}
        </button>
      </div>
      <pre className={`${className} rounded-lg overflow-x-auto`}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
