"""
聊天业务逻辑服务
"""

from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import Conversation, Message
from app.schemas.schemas import ConversationCreate, ConversationUpdate, MessageCreate


class ChatService:
    
    @staticmethod
    def get_conversations(db: Session, skip: int = 0, limit: int = 100) -> List[Conversation]:
        """获取对话列表"""
        return db.query(Conversation).order_by(Conversation.updated_at.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_conversation(db: Session, conversation_id: str) -> Optional[Conversation]:
        """获取单个对话"""
        return db.query(Conversation).filter(Conversation.id == conversation_id).first()
    
    @staticmethod
    def create_conversation(db: Session, data: ConversationCreate) -> Conversation:
        """创建对话"""
        conversation = Conversation(
            title=data.title,
            mode=data.mode
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation
    
    @staticmethod
    def update_conversation(db: Session, conversation_id: str, data: ConversationUpdate) -> Optional[Conversation]:
        """更新对话"""
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            return None
        
        if data.title is not None:
            conversation.title = data.title
        if data.mode is not None:
            conversation.mode = data.mode
        
        conversation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(conversation)
        return conversation
    
    @staticmethod
    def delete_conversation(db: Session, conversation_id: str) -> bool:
        """删除对话"""
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            return False
        
        db.delete(conversation)
        db.commit()
        return True
    
    @staticmethod
    def add_message(db: Session, conversation_id: str, data: MessageCreate) -> Optional[Message]:
        """添加消息"""
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            return None
        
        message = Message(
            conversation_id=conversation_id,
            role=data.role,
            content=data.content,
            reasoning_content=data.reasoning_content
        )
        db.add(message)
        
        # 如果是第一条用户消息，更新对话标题
        if data.role == "user":
            existing_messages = db.query(Message).filter(
                Message.conversation_id == conversation_id,
                Message.role == "user"
            ).count()
            if existing_messages == 0:
                title = data.content[:30] + ("..." if len(data.content) > 30 else "")
                conversation.title = title
        
        conversation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(message)
        return message
    
    @staticmethod
    def get_conversation_messages(db: Session, conversation_id: str) -> List[Message]:
        """获取对话的所有消息"""
        return db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at).all()
    
    @staticmethod
    def update_message_content(db: Session, message_id: str, content: str, reasoning_content: str = None) -> Optional[Message]:
        """更新消息内容"""
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            return None
        
        message.content = content
        if reasoning_content is not None:
            message.reasoning_content = reasoning_content
        
        db.commit()
        return message
    
    @staticmethod
    def create_empty_assistant_message(db: Session, conversation_id: str) -> Optional[Message]:
        """创建空的 AI 消息占位"""
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            return None
        
        message = Message(
            conversation_id=conversation_id,
            role="assistant",
            content="",
            reasoning_content=""
        )
        db.add(message)
        conversation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(message)
        return message


chat_service = ChatService()
