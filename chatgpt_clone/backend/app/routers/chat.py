"""
聊天路由
提供流式和非流式聊天接口
"""

import json
import asyncio
from queue import Queue, Empty
from threading import Thread
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import ChatRequest, MessageCreate, ConversationCreate
from app.services.deepseek_service import deepseek_service
from app.services.chat_service import chat_service

router = APIRouter()


def generate_sse_event(event_type: str, data: str) -> str:
    """生成 SSE 格式的事件"""
    event_data = json.dumps({"type": event_type, "data": data}, ensure_ascii=False)
    return f"data: {event_data}\n\n"


def run_deepseek_stream(messages: list, enable_thinking: bool, event_queue: Queue, stop_flag: list):
    """在线程中运行 DeepSeek 流式调用"""
    try:
        for event in deepseek_service.chat_stream_sync(messages, enable_thinking):
            if stop_flag[0]:
                break
            event_queue.put(event)
        event_queue.put(None)  # 结束标记
    except Exception as e:
        event_queue.put({"type": "error", "data": str(e)})
        event_queue.put(None)


async def stream_chat_response(
    request: Request,
    messages: list, 
    enable_thinking: bool, 
    db: Session,
    conversation_id: str,
    user_message: str
):
    """流式响应生成器"""
    
    # 保存用户消息到数据库
    chat_service.add_message(db, conversation_id, MessageCreate(
        role="user",
        content=user_message
    ))
    
    # 先创建空的 AI 消息占位
    ai_message = chat_service.create_empty_assistant_message(db, conversation_id)
    
    # 收集完整响应
    full_content = ""
    full_reasoning = ""
    update_counter = 0
    client_disconnected = False
    
    # 使用队列和线程来实现可中断的流式调用
    event_queue = Queue()
    stop_flag = [False]
    
    thread = Thread(target=run_deepseek_stream, args=(messages, enable_thinking, event_queue, stop_flag))
    thread.start()
    
    try:
        while True:
            # 检测客户端是否断开连接
            if await request.is_disconnected():
                client_disconnected = True
                stop_flag[0] = True
                break
            
            # 非阻塞地从队列获取事件
            try:
                event = event_queue.get_nowait()
            except Empty:
                await asyncio.sleep(0.01)
                continue
            
            if event is None:
                break
                
            if event["type"] == "reasoning":
                full_reasoning += event["data"]
            elif event["type"] == "content":
                full_content += event["data"]
            
            yield generate_sse_event(event["type"], event["data"])
            
            # 每收到 10 个 chunk 更新一次数据库
            update_counter += 1
            if update_counter >= 10:
                chat_service.update_message_content(
                    db, ai_message.id, full_content, full_reasoning
                )
                update_counter = 0
    finally:
        stop_flag[0] = True
        thread.join(timeout=1)
    
    # 最终更新确保所有内容都保存
    if client_disconnected:
        stopped_content = full_content + "\n\n[已停止生成]" if full_content else "[已停止生成]"
        stopped_reasoning = full_reasoning + "\n\n[思考已中断]" if full_reasoning else ""
        chat_service.update_message_content(
            db, ai_message.id, stopped_content, stopped_reasoning
        )
    else:
        chat_service.update_message_content(
            db, ai_message.id, full_content, full_reasoning
        )


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest, req: Request, db: Session = Depends(get_db)):
    """
    流式聊天接口
    
    - mode: "chat" 使用对话模式，"reasoner" 使用思考模式
    - conversation_id: 可选，如果不传则创建新对话
    - 返回 SSE 流式响应
    
    SSE 事件格式:
    - type: "reasoning" - 思考过程内容
    - type: "content" - 正式回复内容  
    - type: "done" - 完成标记
    - type: "error" - 错误信息
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="消息内容不能为空")
    
    # 获取或创建对话
    conversation_id = request.conversation_id
    if conversation_id:
        conversation = chat_service.get_conversation(db, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="对话不存在")
    else:
        # 创建新对话
        conversation = chat_service.create_conversation(db, ConversationCreate(
            title="新对话",
            mode=request.mode
        ))
        conversation_id = conversation.id
    
    # 获取对话历史
    history_messages = chat_service.get_conversation_messages(db, conversation_id)
    
    # 构建消息列表（包含历史消息）
    messages = []
    for msg in history_messages:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.message})
    
    # 判断是否启用思考模式
    enable_thinking = request.mode == "reasoner"
    
    # 生成包含 conversation_id 的响应头
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Conversation-Id": conversation_id,
    }
    
    return StreamingResponse(
        stream_chat_response(req, messages, enable_thinking, db, conversation_id, request.message),
        media_type="text/event-stream",
        headers=headers
    )


@router.post("/chat")
async def chat_sync(request: ChatRequest, db: Session = Depends(get_db)):
    """
    非流式聊天接口
    
    返回完整的响应内容
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="消息内容不能为空")
    
    # 获取或创建对话
    conversation_id = request.conversation_id
    if conversation_id:
        conversation = chat_service.get_conversation(db, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="对话不存在")
    else:
        conversation = chat_service.create_conversation(db, ConversationCreate(
            title="新对话",
            mode=request.mode
        ))
        conversation_id = conversation.id
    
    # 保存用户消息
    chat_service.add_message(db, conversation_id, MessageCreate(
        role="user",
        content=request.message
    ))
    
    # 获取对话历史
    history_messages = chat_service.get_conversation_messages(db, conversation_id)
    messages = [{"role": msg.role, "content": msg.content} for msg in history_messages]
    
    enable_thinking = request.mode == "reasoner"
    result = deepseek_service.chat_sync(messages, enable_thinking)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    # 保存 AI 回复
    chat_service.add_message(db, conversation_id, MessageCreate(
        role="assistant",
        content=result["content"],
        reasoning_content=result.get("reasoning_content")
    ))
    
    return {
        "conversation_id": conversation_id,
        "content": result["content"],
        "reasoning_content": result.get("reasoning_content")
    }
