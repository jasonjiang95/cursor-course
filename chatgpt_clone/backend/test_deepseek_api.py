# -*- coding: utf-8 -*-
"""
DeepSeek API 测试脚本
用于测试 deepseek-chat 模型的对话模式和思考模式
"""

import sys
import io

# 设置标准输出编码为 UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from openai import OpenAI

# DeepSeek API 配置
API_KEY = "sk-d66af7f6e00a43fa88a00de8821aa394"
BASE_URL = "https://api.deepseek.com"

client = OpenAI(api_key=API_KEY, base_url=BASE_URL)


def print_separator(title: str):
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60 + "\n")


def test_chat_mode_stream():
    """测试1: 对话模式 - 流式输出 (deepseek-chat, 无思考过程)"""
    print_separator("测试1: 对话模式 - 流式输出")
    
    messages = [{"role": "user", "content": "你好，请简单介绍一下你自己"}]
    
    print(f"请求参数:")
    print(f"  model: deepseek-chat")
    print(f"  messages: {messages}")
    print(f"  stream: True")
    print()
    
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        stream=True
    )
    
    content = ""
    chunk_count = 0
    first_chunk = None
    last_chunk = None
    
    print("流式响应 chunks:")
    for chunk in response:
        chunk_count += 1
        if chunk_count == 1:
            first_chunk = chunk
            print(f"\n[第1个chunk详细结构]:")
            print(f"  chunk.id: {chunk.id}")
            print(f"  chunk.model: {chunk.model}")
            print(f"  chunk.object: {chunk.object}")
            print(f"  chunk.created: {chunk.created}")
            print(f"  chunk.choices[0].index: {chunk.choices[0].index}")
            print(f"  chunk.choices[0].delta: {chunk.choices[0].delta}")
            print(f"  chunk.choices[0].finish_reason: {chunk.choices[0].finish_reason}")
            # 检查 delta 的字段
            delta = chunk.choices[0].delta
            print(f"  delta.model_fields: {delta.model_fields.keys() if hasattr(delta, 'model_fields') else 'N/A'}")
            print()
        
        last_chunk = chunk
        delta = chunk.choices[0].delta
        
        if hasattr(delta, 'content') and delta.content:
            content += delta.content
            print(delta.content, end="", flush=True)
    
    print("\n")
    print(f"\n[最后一个chunk]:")
    print(f"  finish_reason: {last_chunk.choices[0].finish_reason}")
    
    print(f"\n[统计]:")
    print(f"  总chunk数: {chunk_count}")
    print(f"  内容长度: {len(content)}")
    
    return content


def test_thinking_mode_stream():
    """测试2: 思考模式 - 流式输出 (deepseek-chat + thinking参数)"""
    print_separator("测试2: 思考模式 - 流式输出 (使用 thinking 参数)")
    
    messages = [{"role": "user", "content": "9.11 和 9.8 哪个更大？"}]
    
    print(f"请求参数:")
    print(f"  model: deepseek-chat")
    print(f"  messages: {messages}")
    print(f"  stream: True")
    print(f'  extra_body: {{"thinking": {{"type": "enabled"}}}}')
    print()
    
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        stream=True,
        extra_body={"thinking": {"type": "enabled"}}
    )
    
    reasoning_content = ""
    content = ""
    chunk_count = 0
    first_chunk = None
    reasoning_started = False
    content_started = False
    
    print("流式响应:")
    for chunk in response:
        chunk_count += 1
        delta = chunk.choices[0].delta
        
        if chunk_count == 1:
            first_chunk = chunk
            print(f"\n[第1个chunk详细结构]:")
            print(f"  chunk.id: {chunk.id}")
            print(f"  chunk.model: {chunk.model}")
            print(f"  chunk.choices[0].delta: {delta}")
            # 尝试获取所有属性
            try:
                delta_dict = delta.model_dump()
                print(f"  delta.model_dump(): {delta_dict}")
            except:
                pass
            print(f"  hasattr reasoning_content: {hasattr(delta, 'reasoning_content')}")
            print()
        
        # 检查是否有 reasoning_content
        if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
            if not reasoning_started:
                print("\n[思考过程开始]")
                reasoning_started = True
            reasoning_content += delta.reasoning_content
            print(delta.reasoning_content, end="", flush=True)
        
        # 检查正常内容
        if hasattr(delta, 'content') and delta.content:
            if not content_started:
                print("\n\n[正式回复开始]")
                content_started = True
            content += delta.content
            print(delta.content, end="", flush=True)
    
    print("\n")
    print(f"\n[统计]:")
    print(f"  总chunk数: {chunk_count}")
    print(f"  思考内容长度: {len(reasoning_content)}")
    print(f"  回复内容长度: {len(content)}")
    
    return reasoning_content, content


def test_reasoner_model_stream():
    """测试3: 推理模式 - 使用 deepseek-reasoner 模型"""
    print_separator("测试3: 推理模式 - 使用 deepseek-reasoner 模型")
    
    messages = [{"role": "user", "content": "strawberry 这个单词里有多少个字母 r？"}]
    
    print(f"请求参数:")
    print(f"  model: deepseek-reasoner")
    print(f"  messages: {messages}")
    print(f"  stream: True")
    print()
    
    response = client.chat.completions.create(
        model="deepseek-reasoner",
        messages=messages,
        stream=True
    )
    
    reasoning_content = ""
    content = ""
    chunk_count = 0
    reasoning_started = False
    content_started = False
    
    print("流式响应:")
    for chunk in response:
        chunk_count += 1
        delta = chunk.choices[0].delta
        
        if chunk_count == 1:
            print(f"\n[第1个chunk详细结构]:")
            print(f"  chunk.id: {chunk.id}")
            print(f"  chunk.model: {chunk.model}")
            try:
                delta_dict = delta.model_dump()
                print(f"  delta.model_dump(): {delta_dict}")
            except:
                pass
            print()
        
        # 检查 reasoning_content
        if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
            if not reasoning_started:
                print("\n[思考过程开始]")
                reasoning_started = True
            reasoning_content += delta.reasoning_content
            print(delta.reasoning_content, end="", flush=True)
        
        # 检查正常内容
        if hasattr(delta, 'content') and delta.content:
            if not content_started:
                print("\n\n[正式回复开始]")
                content_started = True
            content += delta.content
            print(delta.content, end="", flush=True)
    
    print("\n")
    print(f"\n[统计]:")
    print(f"  总chunk数: {chunk_count}")
    print(f"  思考内容长度: {len(reasoning_content)}")
    print(f"  回复内容长度: {len(content)}")
    
    return reasoning_content, content


def test_non_stream():
    """测试4: 非流式输出 - 查看完整响应结构"""
    print_separator("测试4: 非流式输出 - 完整响应结构")
    
    messages = [{"role": "user", "content": "1+1等于多少？"}]
    
    print(f"请求参数:")
    print(f"  model: deepseek-chat")
    print(f"  messages: {messages}")
    print(f"  stream: False")
    print()
    
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        stream=False
    )
    
    print("[完整响应结构]:")
    print(f"  response.id: {response.id}")
    print(f"  response.model: {response.model}")
    print(f"  response.object: {response.object}")
    print(f"  response.created: {response.created}")
    print(f"  response.choices[0].index: {response.choices[0].index}")
    print(f"  response.choices[0].message.role: {response.choices[0].message.role}")
    print(f"  response.choices[0].message.content: {response.choices[0].message.content}")
    print(f"  response.choices[0].finish_reason: {response.choices[0].finish_reason}")
    print(f"  response.usage: {response.usage}")
    
    return response


def test_thinking_non_stream():
    """测试5: 思考模式非流式输出"""
    print_separator("测试5: 思考模式 - 非流式输出")
    
    messages = [{"role": "user", "content": "2+3等于多少？请仔细思考"}]
    
    print(f"请求参数:")
    print(f"  model: deepseek-chat")
    print(f"  messages: {messages}")
    print(f"  stream: False")
    print(f'  extra_body: {{"thinking": {{"type": "enabled"}}}}')
    print()
    
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        stream=False,
        extra_body={"thinking": {"type": "enabled"}}
    )
    
    print("[完整响应结构]:")
    print(f"  response.id: {response.id}")
    print(f"  response.model: {response.model}")
    
    message = response.choices[0].message
    print(f"  message.role: {message.role}")
    print(f"  message.content: {message.content}")
    
    # 检查是否有 reasoning_content
    if hasattr(message, 'reasoning_content'):
        print(f"  message.reasoning_content: {message.reasoning_content[:200] if message.reasoning_content and len(message.reasoning_content) > 200 else message.reasoning_content}...")
    
    # 打印 message 的所有字段
    try:
        msg_dict = message.model_dump()
        print(f"  message.model_dump() keys: {msg_dict.keys()}")
        for key, value in msg_dict.items():
            if value is not None:
                print(f"    {key}: {str(value)[:100]}{'...' if len(str(value)) > 100 else ''}")
    except:
        pass
    
    print(f"  finish_reason: {response.choices[0].finish_reason}")
    print(f"  usage: {response.usage}")
    
    return response


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print(" DeepSeek API 接口测试")
    print("=" * 60)
    
    results = {}
    
    try:
        # 测试1: 对话模式流式
        print("\n>>> 开始测试1...")
        results['test1_chat_stream'] = test_chat_mode_stream()
        
        # 测试2: 思考模式流式 (thinking参数)
        print("\n>>> 开始测试2...")
        results['test2_thinking_stream'] = test_thinking_mode_stream()
        
        # 测试3: reasoner模型
        print("\n>>> 开始测试3...")
        results['test3_reasoner_stream'] = test_reasoner_model_stream()
        
        # 测试4: 非流式
        print("\n>>> 开始测试4...")
        results['test4_non_stream'] = test_non_stream()
        
        # 测试5: 思考模式非流式
        print("\n>>> 开始测试5...")
        results['test5_thinking_non_stream'] = test_thinking_non_stream()
        
    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()
    
    print_separator("测试完成")
    print("所有测试已完成，请查看上面的输出结果")
