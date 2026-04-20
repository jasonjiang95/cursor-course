import { useChatStore } from '@/stores/chatStore';
import { useChat } from '@/hooks/useChat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export function ChatWindow() {
  const { getCurrentConversation, isLoading, mode } = useChatStore();
  const { sendMessage, stopGeneration } = useChat();

  const conversation = getCurrentConversation();
  const messages = conversation?.messages || [];

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white mb-2">
            欢迎使用 DeepSeek Chat
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md text-sm sm:text-base">
            {mode === 'reasoner' 
              ? '推理模式已开启，AI 将展示详细的思考过程'
              : '对话模式已开启，开始和 AI 愉快地聊天吧'
            }
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
            <SuggestionCard 
              icon="💡" 
              text="解释量子计算的基本原理" 
              onClick={() => sendMessage("解释量子计算的基本原理")}
            />
            <SuggestionCard 
              icon="📝" 
              text="帮我写一首关于春天的诗" 
              onClick={() => sendMessage("帮我写一首关于春天的诗")}
            />
            <SuggestionCard 
              icon="🔢" 
              text="9.11 和 9.8 哪个大？" 
              onClick={() => sendMessage("9.11 和 9.8 哪个大？")}
            />
            <SuggestionCard 
              icon="💻" 
              text="用 Python 写一个快速排序" 
              onClick={() => sendMessage("用 Python 写一个快速排序")}
            />
          </div>
        </div>
      ) : (
        <MessageList messages={messages} />
      )}
      <ChatInput 
        onSend={sendMessage} 
        onStop={stopGeneration}
        disabled={false} 
        isGenerating={isLoading}
      />
    </div>
  );
}

function SuggestionCard({ icon, text, onClick }: { icon: string; text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 sm:p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-left"
    >
      <span className="text-xl flex-shrink-0">{icon}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
    </button>
  );
}
