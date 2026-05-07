import type { HealthResponse, ChatMode, SSEEvent, Conversation, Message } from '@/types';

const API_BASE = '/api';

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json();
}

// ==================== 对话管理 API ====================

export interface ConversationListItem {
  id: string;
  title: string;
  mode: ChatMode;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export async function getConversations(): Promise<ConversationListItem[]> {
  const response = await fetch(`${API_BASE}/conversations`);
  if (!response.ok) {
    throw new Error(`Failed to get conversations: ${response.status}`);
  }
  return response.json();
}

export async function createConversation(title: string = "新对话", mode: ChatMode = "chat"): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, mode }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create conversation: ${response.status}`);
  }
  return response.json();
}

export async function getConversation(conversationId: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}`);
  if (!response.ok) {
    throw new Error(`Failed to get conversation: ${response.status}`);
  }
  return response.json();
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete conversation: ${response.status}`);
  }
}

// ==================== 聊天 API ====================

export interface ChatStreamOptions {
  message: string;
  mode: ChatMode;
  conversationId?: string;
  onReasoning?: (content: string) => void;
  onContent?: (content: string) => void;
  onDone?: (conversationId: string) => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
}

export async function chatStream(options: ChatStreamOptions): Promise<void> {
  const { message, mode, conversationId, onReasoning, onContent, onDone, onError, signal } = options;

  try {
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        mode,
        conversation_id: conversationId,
      }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const newConversationId = response.headers.get('X-Conversation-Id') || conversationId || '';

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6)) as SSEEvent;
              
              switch (eventData.type) {
                case 'reasoning':
                  onReasoning?.(eventData.data);
                  break;
                case 'content':
                  onContent?.(eventData.data);
                  break;
                case 'done':
                  onDone?.(newConversationId);
                  break;
                case 'error':
                  onError?.(eventData.data);
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', line, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      onDone?.('');
      return;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    onError?.(errorMessage);
  }
}

export interface ChatSyncOptions {
  message: string;
  mode: ChatMode;
  conversationId?: string;
}

export interface ChatSyncResponse {
  conversation_id: string;
  content: string;
  reasoning_content?: string;
}

export async function chatSync(options: ChatSyncOptions): Promise<ChatSyncResponse> {
  const { message, mode, conversationId } = options;

  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      mode,
      conversation_id: conversationId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return response.json();
}
