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
    <div className="flex-1 flex flex-col overflow-hidden">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          {/* Hero Section */}
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 animate-float">
              <span className="text-5xl">🤖</span>
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg animate-bounce-slow">
              <span className="text-sm">✨</span>
            </div>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              欢迎使用 DeepSeek AI
            </span>
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 max-w-md text-base sm:text-lg mb-2">
            {mode === 'reasoner' 
              ? '🧠 推理模式已开启，AI 将展示详细的思考过程'
              : '💬 对话模式已开启，开始和 AI 愉快地聊天吧'
            }
          </p>
          
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-10">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>AI 助手已就绪</span>
          </div>
          
          {/* Suggestion Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full">
            <SuggestionCard 
              icon="💡" 
              title="探索知识"
              text="解释量子计算的基本原理" 
              onClick={() => sendMessage("解释量子计算的基本原理")}
              gradient="from-amber-500/10 to-orange-500/10"
              borderColor="border-amber-200/50 dark:border-amber-700/30"
            />
            <SuggestionCard 
              icon="📝" 
              title="创意写作"
              text="帮我写一首关于春天的诗" 
              onClick={() => sendMessage("帮我写一首关于春天的诗")}
              gradient="from-pink-500/10 to-rose-500/10"
              borderColor="border-pink-200/50 dark:border-pink-700/30"
            />
            <SuggestionCard 
              icon="🔢" 
              title="逻辑推理"
              text="9.11 和 9.8 哪个大？" 
              onClick={() => sendMessage("9.11 和 9.8 哪个大？")}
              gradient="from-blue-500/10 to-cyan-500/10"
              borderColor="border-blue-200/50 dark:border-blue-700/30"
            />
            <SuggestionCard 
              icon="💻" 
              title="编程助手"
              text="用 Python 写一个快速排序" 
              onClick={() => sendMessage("用 Python 写一个快速排序")}
              gradient="from-green-500/10 to-emerald-500/10"
              borderColor="border-green-200/50 dark:border-green-700/30"
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

interface SuggestionCardProps {
  icon: string;
  title: string;
  text: string;
  onClick: () => void;
  gradient: string;
  borderColor: string;
}

function SuggestionCard({ icon, title, text, onClick, gradient, borderColor }: SuggestionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-start gap-4 p-5 backdrop-blur-sm bg-gradient-to-br ${gradient} hover:scale-[1.02] rounded-2xl transition-all duration-300 text-left border ${borderColor} hover:shadow-xl hover:shadow-blue-500/10`}
    >
      <div className="w-12 h-12 rounded-xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{text}</p>
      </div>
      <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
