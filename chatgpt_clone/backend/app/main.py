from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import health, chat, conversation

app = FastAPI(
    title="DeepSeek Chat API",
    description="类 ChatGPT 对话问答系统后端 API，支持对话模式和推理模式",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Conversation-Id"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(conversation.router, prefix="/api", tags=["conversation"])


@app.on_event("startup")
def startup_event():
    """应用启动时初始化数据库"""
    init_db()


@app.get("/")
async def root():
    return {"message": "Welcome to DeepSeek Chat API"}
