# DeepSeek Chat

一个类 ChatGPT 的智能对话系统，支持 DeepSeek 对话模式和推理模式。

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (状态管理)

### 后端
- Python FastAPI
- SQLite + SQLAlchemy
- DeepSeek API

## 快速开始

### 1. 后端启动

```bash
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
# 复制 .env.example 为 .env 并填入你的 DeepSeek API Key

# 启动服务
uvicorn app.main:app --reload --port 8000
```

### 2. 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 3. 访问应用

- 前端: http://localhost:5173
- 后端 API 文档: http://localhost:8000/docs

## 项目结构

```
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 入口
│   │   ├── config.py        # 配置管理
│   │   ├── routers/         # API 路由
│   │   ├── services/        # 业务逻辑
│   │   ├── models/          # 数据库模型
│   │   └── schemas/         # Pydantic 模型
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React 组件
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── services/        # API 服务
│   │   ├── stores/          # 状态管理
│   │   └── types/           # TypeScript 类型
│   └── package.json
│
└── README.md
```

## 功能特性

- [x] Phase 1: 项目初始化 + 健康检查
- [ ] Phase 2: 前端 UI 开发
- [ ] Phase 3: 后端 DeepSeek API 集成
- [ ] Phase 4: 双模式集成 + 完整联调

## License

MIT
