import { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useTheme } from '@/hooks/useTheme';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  
  const { theme, setTheme } = useTheme();

  const {
    mode,
    setMode,
    conversations,
    currentConversationId,
    setCurrentConversation,
    createConversation,
    deleteConversation,
    getCurrentConversation,
    loadConversations,
    isInitialized,
    clearCurrentConversation,
  } = useChatStore();

  useEffect(() => {
    if (!isInitialized) {
      loadConversations();
    }
  }, [isInitialized, loadConversations]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentConversation = getCurrentConversation();
  const hasMessages = (currentConversation?.messages.length ?? 0) > 0;

  const handleNewConversation = async () => {
    await createConversation();
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleSelectConversation = async (id: string) => {
    await setCurrentConversation(id);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const handleGoHome = () => {
    clearCurrentConversation();
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header
        mode={mode}
        onModeChange={setMode}
        onToggleSidebar={handleToggleSidebar}
        onGoHome={handleGoHome}
        hasMessages={hasMessages}
        theme={theme}
        onThemeChange={setTheme}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onClose={handleCloseSidebar}
        />
        <ChatWindow />
      </div>
    </div>
  );
}
