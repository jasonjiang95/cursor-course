import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMode, Conversation, Message } from '@/types';
import { 
  getConversations as apiGetConversations, 
  getConversation as apiGetConversation,
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  type ConversationListItem 
} from '@/services/api';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  mode: ChatMode;
  isLoading: boolean;
  isInitialized: boolean;
  abortController: AbortController | null;
  
  // Actions
  setMode: (mode: ChatMode) => void;
  createConversation: () => Promise<string>;
  setCurrentConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  appendToMessage: (conversationId: string, messageId: string, content: string, isReasoning?: boolean) => void;
  setLoading: (loading: boolean) => void;
  getCurrentConversation: () => Conversation | undefined;
  loadConversations: () => Promise<void>;
  updateConversationId: (oldId: string, newId: string) => void;
  setAbortController: (controller: AbortController | null) => void;
  stopGeneration: () => void;
  clearCurrentConversation: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  mode: 'chat',
  isLoading: false,
  isInitialized: false,
  abortController: null,

  setMode: (mode) => {
    const { currentConversationId, conversations } = get();
    
    if (currentConversationId) {
      const currentConv = conversations.find(c => c.id === currentConversationId);
      if (currentConv && currentConv.messages.length === 0) {
        set((state) => ({
          mode,
          conversations: state.conversations.map((conv) =>
            conv.id === currentConversationId ? { ...conv, mode } : conv
          ),
        }));
        return;
      }
    }
    
    set({ mode });
  },

  createConversation: async () => {
    const currentMode = get().mode;
    
    try {
      const newConv = await apiCreateConversation("新对话", currentMode);
      
      const conversation: Conversation = {
        id: newConv.id,
        title: newConv.title,
        mode: newConv.mode as ChatMode,
        messages: [],
        created_at: newConv.created_at,
        updated_at: newConv.updated_at,
      };
      
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        currentConversationId: conversation.id,
      }));
      
      return conversation.id;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      const id = uuidv4();
      const now = new Date().toISOString();
      const conversation: Conversation = {
        id,
        title: '新对话',
        mode: currentMode,
        messages: [],
        created_at: now,
        updated_at: now,
      };
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        currentConversationId: id,
      }));
      return id;
    }
  },

  setCurrentConversation: async (id) => {
    const { conversations } = get();
    let targetConv = conversations.find(c => c.id === id);
    
    // 总是从 API 加载最新的对话内容
    try {
      const fullConv = await apiGetConversation(id);
      set((state) => ({
        conversations: state.conversations.map(c => 
          c.id === id ? {
            ...c,
            messages: fullConv.messages.map(m => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              reasoning_content: m.reasoning_content,
              created_at: m.created_at,
            })),
          } : c
        ),
        currentConversationId: id,
        mode: fullConv.mode as ChatMode,
      }));
      return;
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
    
    if (targetConv) {
      set({ 
        currentConversationId: id,
        mode: targetConv.mode 
      });
    } else {
      set({ currentConversationId: id });
    }
  },

  deleteConversation: async (id) => {
    try {
      await apiDeleteConversation(id);
    } catch (error) {
      console.error('Failed to delete conversation from server:', error);
    }
    
    set((state) => {
      const newConversations = state.conversations.filter((c) => c.id !== id);
      const newCurrentId = state.currentConversationId === id
        ? (newConversations[0]?.id || null)
        : state.currentConversationId;
      
      let newMode = state.mode;
      if (state.currentConversationId === id && newCurrentId) {
        const newCurrentConv = newConversations.find(c => c.id === newCurrentId);
        if (newCurrentConv) {
          newMode = newCurrentConv.mode;
        }
      }
      
      return {
        conversations: newConversations,
        currentConversationId: newCurrentId,
        mode: newMode,
      };
    });
  },

  addMessage: (conversationId, message) => {
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id === conversationId) {
          const isFirstUserMessage = conv.messages.length === 0 && message.role === 'user';
          return {
            ...conv,
            messages: [...conv.messages, message],
            title: isFirstUserMessage ? message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '') : conv.title,
            updated_at: new Date().toISOString(),
          };
        }
        return conv;
      }),
    }));
  },

  updateMessage: (conversationId, messageId, updates) => {
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: conv.messages.map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
          };
        }
        return conv;
      }),
    }));
  },

  appendToMessage: (conversationId, messageId, content, isReasoning = false) => {
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: conv.messages.map((msg) => {
              if (msg.id === messageId) {
                if (isReasoning) {
                  return { ...msg, reasoning_content: (msg.reasoning_content || '') + content };
                }
                return { ...msg, content: msg.content + content };
              }
              return msg;
            }),
          };
        }
        return conv;
      }),
    }));
  },

  setLoading: (loading) => set({ isLoading: loading }),

  getCurrentConversation: () => {
    const state = get();
    return state.conversations.find((c) => c.id === state.currentConversationId);
  },

  loadConversations: async () => {
    try {
      const convList = await apiGetConversations();
      const conversations: Conversation[] = convList.map(item => ({
        id: item.id,
        title: item.title,
        mode: item.mode as ChatMode,
        messages: [],
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
      
      set({ 
        conversations,
        isInitialized: true,
      });
    } catch (error) {
      console.error('Failed to load conversations:', error);
      set({ isInitialized: true });
    }
  },

  updateConversationId: (oldId, newId) => {
    set((state) => ({
      conversations: state.conversations.map(conv => 
        conv.id === oldId ? { ...conv, id: newId } : conv
      ),
      currentConversationId: state.currentConversationId === oldId ? newId : state.currentConversationId,
    }));
  },

  setAbortController: (controller) => {
    set({ abortController: controller });
  },

  stopGeneration: () => {
    const { abortController, currentConversationId, conversations } = get();
    if (abortController) {
      abortController.abort();
      
      // 给当前正在流式输出的消息添加停止标记
      if (currentConversationId) {
        const currentConv = conversations.find(c => c.id === currentConversationId);
        if (currentConv) {
          const streamingMessage = currentConv.messages.find(m => m.isStreaming);
          if (streamingMessage) {
            set((state) => ({
              conversations: state.conversations.map((conv) => {
                if (conv.id === currentConversationId) {
                  return {
                    ...conv,
                    messages: conv.messages.map((msg) => {
                      if (msg.id === streamingMessage.id) {
                        return {
                          ...msg,
                          isStreaming: false,
                          content: msg.content ? msg.content + '\n\n[已停止生成]' : '[已停止生成]',
                          reasoning_content: msg.reasoning_content ? msg.reasoning_content + '\n\n[思考已中断]' : msg.reasoning_content,
                        };
                      }
                      return msg;
                    }),
                  };
                }
                return conv;
              }),
            }));
          }
        }
      }
      
      set({ abortController: null, isLoading: false });
    }
  },

  clearCurrentConversation: () => {
    set({ currentConversationId: null });
  },
}));
