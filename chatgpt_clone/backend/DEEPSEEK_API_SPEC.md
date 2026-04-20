# DeepSeek API 接口规范文档

基于实际测试结果整理的 API 接口规范，用于前后端对接。

## 1. API 配置

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-xxx",
    base_url="https://api.deepseek.com"
)
```

## 2. 两种模式对比

| 特性 | 对话模式 | 思考模式 |
|------|----------|----------|
| 模型 | `deepseek-chat` | `deepseek-chat` + thinking 参数 |
| 思考过程 | ❌ 无 | ✅ 有 `reasoning_content` |
| 响应模型 | `deepseek-chat` | `deepseek-reasoner` |
| 适用场景 | 日常对话 | 复杂推理问题 |

## 3. 流式响应结构

### 3.1 对话模式 (无思考过程)

**请求参数:**
```python
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "你好"}],
    stream=True
)
```

**响应 Chunk 结构:**
```python
# 第一个 chunk
{
    "id": "f3ededfd-ef90-4aa6-875e-9f3a611f1aa0",
    "model": "deepseek-chat",
    "object": "chat.completion.chunk",
    "created": 1776683792,
    "choices": [{
        "index": 0,
        "delta": {
            "content": "",           # 首个 chunk 为空，后续为内容片段
            "role": "assistant",     # 仅首个 chunk 有
            "function_call": None,
            "tool_calls": None,
            "refusal": None
        },
        "finish_reason": None        # 最后一个 chunk 为 "stop"
    }]
}
```

**流式处理:**
```python
content = ""
for chunk in response:
    delta = chunk.choices[0].delta
    if delta.content:
        content += delta.content
```

### 3.2 思考模式 (有思考过程)

**请求参数:**
```python
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "9.11和9.8哪个更大？"}],
    stream=True,
    extra_body={"thinking": {"type": "enabled"}}
)
```

**关键发现:**
- 返回的 `chunk.model` 会变成 `deepseek-reasoner`
- delta 中会额外包含 `reasoning_content` 字段

**响应 Chunk 结构:**
```python
# 带思考过程的 chunk
{
    "id": "714dad0c-264d-4186-9402-7fc3e417d7b9",
    "model": "deepseek-reasoner",  # 注意：模型名称变化
    "object": "chat.completion.chunk",
    "choices": [{
        "index": 0,
        "delta": {
            "content": None,                  # 思考阶段为 None
            "reasoning_content": "让我分析...", # 思考内容
            "role": "assistant",
            "function_call": None,
            "tool_calls": None,
            "refusal": None
        },
        "finish_reason": None
    }]
}
```

**流式处理:**
```python
reasoning_content = ""
content = ""

for chunk in response:
    delta = chunk.choices[0].delta
    
    # 处理思考过程
    if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
        reasoning_content += delta.reasoning_content
    
    # 处理正式回复
    if hasattr(delta, 'content') and delta.content:
        content += delta.content
```

**响应顺序:**
1. 先输出所有 `reasoning_content` (思考过程)
2. 再输出所有 `content` (正式回复)
3. 最后一个 chunk 的 `finish_reason` 为 `"stop"`

## 4. 非流式响应结构

### 4.1 对话模式

```python
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "1+1等于多少？"}],
    stream=False
)
```

**响应结构:**
```python
{
    "id": "d1f9fcc0-4a79-48eb-a6d0-a7b0dddf9303",
    "model": "deepseek-chat",
    "object": "chat.completion",
    "created": 1776683864,
    "choices": [{
        "index": 0,
        "message": {
            "role": "assistant",
            "content": "1 + 1 = 2"
        },
        "finish_reason": "stop"
    }],
    "usage": {
        "completion_tokens": 16,
        "prompt_tokens": 10,
        "total_tokens": 26
    }
}
```

### 4.2 思考模式

```python
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "2+3等于多少？"}],
    stream=False,
    extra_body={"thinking": {"type": "enabled"}}
)
```

**响应结构:**
```python
{
    "id": "6e886281-9b27-4c73-9261-369dec5b1099",
    "model": "deepseek-reasoner",  # 模型变化
    "object": "chat.completion",
    "choices": [{
        "index": 0,
        "message": {
            "role": "assistant",
            "content": "2 + 3 = 5",
            "reasoning_content": "这是一个简单的加法问题..."  # 额外字段
        },
        "finish_reason": "stop"
    }],
    "usage": {
        "completion_tokens": 234,
        "prompt_tokens": 13,
        "total_tokens": 247,
        "completion_tokens_details": {
            "reasoning_tokens": 141  # 思考 token 数
        }
    }
}
```

## 5. 前端 SSE 事件格式设计

基于以上测试，建议后端 SSE 事件格式如下：

```typescript
interface SSEEvent {
    type: 'reasoning' | 'content' | 'done' | 'error';
    data: string;
}

// 示例事件流
// 思考模式：
data: {"type": "reasoning", "data": "让我分析..."}
data: {"type": "reasoning", "data": "首先考虑..."}
data: {"type": "content", "data": "答案是"}
data: {"type": "content", "data": "9.8更大"}
data: {"type": "done", "data": ""}

// 对话模式：
data: {"type": "content", "data": "你好"}
data: {"type": "content", "data": "！"}
data: {"type": "done", "data": ""}
```

## 6. 关键字段总结

### delta 对象字段

| 字段 | 类型 | 对话模式 | 思考模式 | 说明 |
|------|------|----------|----------|------|
| `content` | string | ✅ | ✅ | 正式回复内容 |
| `reasoning_content` | string | ❌ | ✅ | 思考过程内容 |
| `role` | string | 首个chunk | 首个chunk | 角色标识 |
| `function_call` | object | null | null | 函数调用 |
| `tool_calls` | array | null | null | 工具调用 |

### finish_reason 值

| 值 | 说明 |
|------|------|
| `null` | 生成中 |
| `"stop"` | 正常结束 |
| `"length"` | 达到最大长度 |

## 7. 多轮对话

思考模式下，助手回复 **不应包含** `reasoning_content`：

```python
messages = [
    {"role": "user", "content": "第一个问题"},
    {"role": "assistant", "content": "第一个回答"},  # 只包含 content，不含 reasoning_content
    {"role": "user", "content": "第二个问题"}
]
```

## 8. 错误处理

常见错误码：
- `401`: API Key 无效
- `429`: 请求频率限制
- `500`: 服务器内部错误

## 9. 测试统计

| 测试 | chunk 数 | 思考长度 | 回复长度 |
|------|----------|----------|----------|
| 对话模式流式 | 226 | - | 409 |
| 思考模式流式 | 914 | 1186 | 189 |
| 推理模型流式 | 506 | 801 | 69 |
