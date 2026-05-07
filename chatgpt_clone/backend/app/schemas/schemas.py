from pydantic import BaseModel
from typing import Optional, Literal, List
from datetime import datetime


class ChatRequest(BaseModel):
    """聊天请求"""
    conversation_id: Optional[str] = None
    message: str
    mode: Literal["chat", "reasoner"] = "chat"


class ChatMessage(BaseModel):
    """聊天消息"""
    role: Literal["user", "assistant", "system"]
    content: str


class SSEEvent(BaseModel):
    """SSE 事件"""
    type: Literal["reasoning", "content", "done", "error"]
    data: str


class ConversationCreate(BaseModel):
    """创建对话请求"""
    title: Optional[str] = "新对话"
    mode: Literal["chat", "reasoner"] = "chat"


class ConversationUpdate(BaseModel):
    """更新对话请求"""
    title: Optional[str] = None
    mode: Optional[Literal["chat", "reasoner"]] = None


class MessageCreate(BaseModel):
    """创建消息请求"""
    role: Literal["user", "assistant"]
    content: str
    reasoning_content: Optional[str] = None


class MessageResponse(BaseModel):
    """消息响应"""
    id: str
    conversation_id: str
    role: str
    content: str
    reasoning_content: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    """对话响应"""
    id: str
    title: str
    mode: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True


class ConversationListItem(BaseModel):
    """对话列表项"""
    id: str
    title: str
    mode: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True
