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
    <header className="h-16 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-white/20 dark:border-gray-700/50 flex items-center justify-between px-3 sm:px-6 shadow-lg shadow-blue-500/5">
      {/* Left: Menu Button & Logo */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2.5 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
          aria-label="切换侧边栏"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={onGoHome}
          className="flex items-center gap-3 hover:opacity-80 transition-all duration-300 group"
          title="返回首页"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-105">
              <span className="text-white text-lg">🤖</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              DeepSeek AI
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-0.5">智能对话助手</p>
          </div>
        </button>
      </div>

      {/* Center: Mode Switch */}
      <div className="flex items-center backdrop-blur-md bg-white/50 dark:bg-gray-800/50 rounded-2xl p-1.5 shadow-inner border border-white/30 dark:border-gray-700/30">
        <button
          onClick={() => handleModeChange('chat')}
          className={`px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 ${
            mode === 'chat'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30 scale-105'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
        >
          <span className="mr-1.5">💬</span>
          <span className="hidden sm:inline">对话模式</span>
          <span className="sm:hidden">对话</span>
        </button>
        <button
          onClick={() => handleModeChange('reasoner')}
          className={`px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 ${
            mode === 'reasoner'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 scale-105'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
        >
          <span className="mr-1.5">🧠</span>
          <span className="hidden sm:inline">推理模式</span>
          <span className="sm:hidden">推理</span>
        </button>
      </div>

      {/* Right: Theme Toggle */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowThemeMenu(!showThemeMenu)}
          className="p-2.5 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
          aria-label="切换主题"
        >
          <span className="text-xl">{themeIcon[theme]}</span>
        </button>

        {showThemeMenu && (
          <div className="absolute right-0 top-full mt-2 backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-white/30 dark:border-gray-700/50 rounded-2xl shadow-2xl py-2 min-w-[140px] z-50 overflow-hidden">
            <button
              onClick={() => { onThemeChange('light'); setShowThemeMenu(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-gray-700/50 flex items-center gap-3 transition-colors ${theme === 'light' ? 'text-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'}`}
            >
              ☀️ 浅色模式
            </button>
            <button
              onClick={() => { onThemeChange('dark'); setShowThemeMenu(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-gray-700/50 flex items-center gap-3 transition-colors ${theme === 'dark' ? 'text-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'}`}
            >
              🌙 深色模式
            </button>
            <button
              onClick={() => { onThemeChange('system'); setShowThemeMenu(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-gray-700/50 flex items-center gap-3 transition-colors ${theme === 'system' ? 'text-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'}`}
            >
              💻 跟随系统
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
