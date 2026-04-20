"""
DeepSeek API 服务封装
支持对话模式和思考模式的流式输出
"""

import json
from typing import AsyncGenerator, List, Dict, Any
from openai import OpenAI

from app.config import settings


class DeepSeekService:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL
        )
        self.model = settings.DEEPSEEK_MODEL
    
    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        enable_thinking: bool = False
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        异步流式聊天接口
        """
        for event in self.chat_stream_sync(messages, enable_thinking):
            yield event
    
    def chat_stream_sync(
        self,
        messages: List[Dict[str, str]],
        enable_thinking: bool = False
    ):
        """
        同步流式聊天接口（供线程调用）
        
        Args:
            messages: 消息列表 [{"role": "user", "content": "..."}]
            enable_thinking: 是否启用思考模式
        
        Yields:
            SSE 事件 {"type": "reasoning|content|done|error", "data": "..."}
        """
        try:
            # 构建请求参数
            request_params = {
                "model": self.model,
                "messages": messages,
                "stream": True,
            }
            
            # 如果启用思考模式，添加 thinking 参数
            if enable_thinking:
                request_params["extra_body"] = {"thinking": {"type": "enabled"}}
            
            # 调用 API
            response = self.client.chat.completions.create(**request_params)
            
            # 处理流式响应
            for chunk in response:
                if not chunk.choices:
                    continue
                    
                delta = chunk.choices[0].delta
                finish_reason = chunk.choices[0].finish_reason
                
                # 处理思考内容
                if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                    yield {
                        "type": "reasoning",
                        "data": delta.reasoning_content
                    }
                
                # 处理正式回复内容
                if hasattr(delta, 'content') and delta.content:
                    yield {
                        "type": "content",
                        "data": delta.content
                    }
                
                # 检查是否完成
                if finish_reason == "stop":
                    yield {
                        "type": "done",
                        "data": ""
                    }
                    
        except Exception as e:
            yield {
                "type": "error",
                "data": str(e)
            }
    
    def chat_sync(
        self,
        messages: List[Dict[str, str]],
        enable_thinking: bool = False
    ) -> Dict[str, Any]:
        """
        非流式聊天接口
        
        Returns:
            {"content": "...", "reasoning_content": "..."}
        """
        try:
            request_params = {
                "model": self.model,
                "messages": messages,
                "stream": False,
            }
            
            if enable_thinking:
                request_params["extra_body"] = {"thinking": {"type": "enabled"}}
            
            response = self.client.chat.completions.create(**request_params)
            
            message = response.choices[0].message
            result = {
                "content": message.content or "",
                "reasoning_content": None
            }
            
            if hasattr(message, 'reasoning_content') and message.reasoning_content:
                result["reasoning_content"] = message.reasoning_content
            
            return result
            
        except Exception as e:
            return {
                "content": "",
                "reasoning_content": None,
                "error": str(e)
            }


# 单例实例
deepseek_service = DeepSeekService()
