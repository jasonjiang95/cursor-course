# 前端（Phase 1）

**Node.js：** 建议使用 **20 LTS**（`>=20`），与技术契约一致。

## 初始化

```powershell
cd frontend
npm install
```

## 开发

```powershell
npm run dev
```

浏览器：<http://localhost:5173>。

## 环境变量

复制 `.env.example` 为 **`.env.development`**（Vite 开发模式加载；勿提交仓库），按需设置：

- `VITE_API_BASE_URL` — 后端根地址，**无尾斜杠**，例如 `http://127.0.0.1:8000`（与后端 CORS、访问来源一致）。

## API 类型与封装（与后端 SSOT 对齐）

- 字段名以 FastAPI / Pydantic 为准：见后端 [`../backend/app/schemas/chat.py`](../backend/app/schemas/chat.py)。
- 前端镜像类型：`src/types/chat.ts`（消息与会话实体）、`src/types/api.ts`（请求/响应体）。
- 调用封装：`src/api/`（`health`、`sessions` 含 PATCH/DELETE、`chat`）。联调时 `import { listSessions, postChat, ... } from '@/api'` 或相对路径即可。

## 构建

```powershell
npm run build
```

产物在 `frontend/dist/`。
