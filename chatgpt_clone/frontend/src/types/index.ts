export type ChatMode = 'chat' | 'reasoner';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning_content?: string;
  isStreaming?: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  mode: ChatMode;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export interface ChatRequest {
  conversation_id?: string;
  message: string;
  mode: ChatMode;
}

export interface SSEEvent {
  type: 'reasoning' | 'content' | 'done' | 'error';
  data: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
}
