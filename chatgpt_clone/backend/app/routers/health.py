from datetime import datetime
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": "deepseek-chat-api"
    }
