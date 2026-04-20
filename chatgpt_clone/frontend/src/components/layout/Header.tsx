import { useState, useRef, useEffect } from 'react';
import type { ChatMode } from '@/types';

interface HeaderProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  onToggleSidebar: () => void;
  onGoHome: () => void;
  hasMessages?: boolean;
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
}

export function Header({ mode, onModeChange, onToggleSidebar, onGoHome, hasMessages, theme, onThemeChange }: HeaderProps) {
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModeChange = (newMode: ChatMode) => {
    if (hasMessages && newMode !== mode) {
      const confirmed = window.confirm(
        `当前对话使用的是"${mode === 'chat' ? '对话' : '推理'}模式"。\n\n切换模式后，新消息将使用"${newMode === 'chat' ? '对话' : '推理'}模式"发送。\n\n是否继续？`
      );
      if (!confirmed) return;
    }
    onModeChange(newMode);
  };

  const themeIcon = {
    light: '☀️',
    dark: '🌙',
    system: '💻',
  };

  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-between px-2 sm:px-4">
      {/* Left: Menu Button & Logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="切换侧边栏"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title="返回首页"
        >
          <span className="text-xl hidden sm:inline">🤖</span>
          <h1 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">DeepSeek Chat</h1>
        </button>
      </div>

      {/* Center: Mode Switch */}
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => handleModeChange('chat')}
          className={`px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            mode === 'chat'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span className="hidden sm:inline">💬 </span>对话
        </button>
        <button
          onClick={() => handleModeChange('reasoner')}
          className={`px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            mode === 'reasoner'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <span className="hidden sm:inline">🧠 </span>推理
        </button>
      </div>

      {/* Right: Theme Toggle */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowThemeMenu(!showThemeMenu)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="切换主题"
        >
          <span className="text-lg">{themeIcon[theme]}</span>
        </button>

        {showThemeMenu && (
          <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
            <button
              onClick={() => { onThemeChange('light'); setShowThemeMenu(false); }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${theme === 'light' ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
            >
              ☀️ 浅色
            </button>
            <button
              onClick={() => { onThemeChange('dark'); setShowThemeMenu(false); }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${theme === 'dark' ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
            >
              🌙 深色
            </button>
            <button
              onClick={() => { onThemeChange('system'); setShowThemeMenu(false); }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${theme === 'system' ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
            >
              💻 跟随系统
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
