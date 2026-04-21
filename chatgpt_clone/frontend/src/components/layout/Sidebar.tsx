import type { Conversation } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onClose?: () => void;
}

export function Sidebar({
  isOpen,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onClose,
}: SidebarProps) {
  if (!isOpen) return null;

  const handleSelectConversation = (id: string) => {
    onSelectConversation(id);
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <aside className="fixed md:relative z-50 md:z-auto w-72 md:w-72 h-full backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 border-r border-white/30 dark:border-gray-700/50 flex flex-col shadow-2xl md:shadow-none">
        {/* Mobile close button */}
        <div className="md:hidden flex justify-end p-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-xl transition-all"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            开始新对话
          </button>
        </div>

        {/* Section Title */}
        <div className="px-4 py-2">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">历史记录</h3>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                  <span className="text-2xl">💬</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">暂无对话记录</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">开始新对话吧</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer transition-all duration-300 ${
                    currentConversationId === conv.id
                      ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-300/50 dark:border-blue-700/50 shadow-lg shadow-blue-500/10'
                      : 'hover:bg-white/50 dark:hover:bg-gray-800/50 border border-transparent'
                  }`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    conv.mode === 'reasoner' 
                      ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20' 
                      : 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20'
                  }`}>
                    <span className="text-lg">{conv.mode === 'reasoner' ? '🧠' : '💬'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {conv.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${conv.mode === 'reasoner' ? 'bg-purple-400' : 'bg-blue-400'}`}></span>
                      {conv.mode === 'reasoner' ? '推理' : '对话'}
                      {conv.messages.length > 0 && <span>· {conv.messages.length} 条</span>}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all"
                    aria-label="删除对话"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/20 dark:border-gray-700/30">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>DeepSeek AI · 在线</span>
          </div>
        </div>
      </aside>
    </>
  );
}
