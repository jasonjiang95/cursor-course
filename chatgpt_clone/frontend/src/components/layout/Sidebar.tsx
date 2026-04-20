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
        className="md:hidden fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <aside className="fixed md:relative z-50 md:z-auto w-72 md:w-64 h-full border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col">
        {/* Mobile close button */}
        <div className="md:hidden flex justify-end p-2">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新对话
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          <div className="space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
                暂无对话记录
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    currentConversationId === conv.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <span className="text-sm flex-shrink-0">
                    {conv.mode === 'reasoner' ? '🧠' : '💬'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                      {conv.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {conv.mode === 'reasoner' ? '推理模式' : '对话模式'}
                      {conv.messages.length > 0 && ` · ${conv.messages.length} 条消息`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-all"
                    aria-label="删除对话"
                  >
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            DeepSeek Chat v1.0
          </div>
        </div>
      </aside>
    </>
  );
}
