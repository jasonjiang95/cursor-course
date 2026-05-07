# API curl 样例

与仓库 [`.cursor/plans/智能数据分析系统模块规划_e9257a18.plan.md`](../../.cursor/plans/智能数据分析系统模块规划_e9257a18.plan.md) **技术契约**一致。在 `NL2SQLAgent/backend` 启动服务（示例：`uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`）后可直接复制：

```bash
# 健康检查
curl -s http://127.0.0.1:8000/health

# 新建会话
curl -s -X POST http://127.0.0.1:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d "{}"

# 将上一步返回 JSON 中的 id 替换 SESSION_ID — 发起聊天（需已在 .env 配置 DASHSCOPE_API_KEY 与 LLM_MODEL）
curl -s -X POST "http://127.0.0.1:8000/api/v1/sessions/SESSION_ID/chat" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"数据库里有哪些表？\"}"

# 列出某会话的全部消息（字段与 POST /chat 返回的 ChatMessage 一致）
curl -s "http://127.0.0.1:8000/api/v1/sessions/SESSION_ID/messages"

# 修改会话标题
curl -s -X PATCH "http://127.0.0.1:8000/api/v1/sessions/SESSION_ID" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"新标题\"}"

# 删除会话（204）
curl -s -o NUL -w "%{http_code}" -X DELETE "http://127.0.0.1:8000/api/v1/sessions/SESSION_ID"
```

在 Linux / macOS 上可将 `-o NUL` 改为 `-o /dev/null`。
