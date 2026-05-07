import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useChatStore } from '@/stores/chatStore';
import { chatStream } from '@/services/api';

export function useChat() {
  const {
    currentConversationId,
    createConversation,
    addMessage,
    updateMessage,
    appendToMessage,
    setLoading,
    mode,
    updateConversationId,
    setAbortController,
    stopGeneration,
    isLoading,
  } = useChatStore();

  const sendMessage = useCallback(async (content: string) => {
    let convId = currentConversationId;
    
    if (!convId) {
      convId = await createConversation();
    }

    const userMessageId = uuidv4();
    addMessage(convId, {
      id: userMessageId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    });

    const aiMessageId = uuidv4();
    addMessage(convId, {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      reasoning_content: '',
      isStreaming: true,
      created_at: new Date().toISOString(),
    });

    setLoading(true);

    const abortController = new AbortController();
    setAbortController(abortController);

    await chatStream({
      message: content,
      mode,
      conversationId: convId,
      signal: abortController.signal,
      onReasoning: (text) => {
        appendToMessage(convId!, aiMessageId, text, true);
      },
      onContent: (text) => {
        appendToMessage(convId!, aiMessageId, text, false);
      },
      onDone: (newConversationId) => {
        if (newConversationId && newConversationId !== convId) {
          updateConversationId(convId!, newConversationId);
        }
        updateMessage(convId!, aiMessageId, { isStreaming: false });
        setLoading(false);
        setAbortController(null);
      },
      onError: (error) => {
        updateMessage(convId!, aiMessageId, { 
          isStreaming: false,
          content: `错误: ${error}`
        });
        setLoading(false);
        setAbortController(null);
      },
    });
  }, [currentConversationId, createConversation, addMessage, updateMessage, appendToMessage, setLoading, mode, updateConversationId, setAbortController]);

  return { sendMessage, stopGeneration, isLoading };
}
