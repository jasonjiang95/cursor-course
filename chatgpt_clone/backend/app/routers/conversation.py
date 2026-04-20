"""
对话管理路由
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import (
    ConversationCreate, 
    ConversationUpdate, 
    ConversationResponse,
    ConversationListItem
)
from app.services.chat_service import chat_service

router = APIRouter()


@router.get("/conversations", response_model=List[ConversationListItem])
def get_conversations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """获取对话列表"""
    conversations = chat_service.get_conversations(db, skip=skip, limit=limit)
    result = []
    for conv in conversations:
        result.append(ConversationListItem(
            id=conv.id,
            title=conv.title,
            mode=conv.mode,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            message_count=len(conv.messages)
        ))
    return result


@router.post("/conversations", response_model=ConversationResponse)
def create_conversation(data: ConversationCreate, db: Session = Depends(get_db)):
    """创建新对话"""
    conversation = chat_service.create_conversation(db, data)
    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        mode=conversation.mode,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[]
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """获取对话详情（包含消息）"""
    conversation = chat_service.get_conversation(db, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        mode=conversation.mode,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[{
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "role": msg.role,
            "content": msg.content,
            "reasoning_content": msg.reasoning_content,
            "created_at": msg.created_at
        } for msg in conversation.messages]
    )


@router.put("/conversations/{conversation_id}", response_model=ConversationResponse)
def update_conversation(conversation_id: str, data: ConversationUpdate, db: Session = Depends(get_db)):
    """更新对话"""
    conversation = chat_service.update_conversation(db, conversation_id, data)
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        mode=conversation.mode,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[{
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "role": msg.role,
            "content": msg.content,
            "reasoning_content": msg.reasoning_content,
            "created_at": msg.created_at
        } for msg in conversation.messages]
    )


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """删除对话"""
    success = chat_service.delete_conversation(db, conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="对话不存在")
    return {"success": True, "message": "对话已删除"}
