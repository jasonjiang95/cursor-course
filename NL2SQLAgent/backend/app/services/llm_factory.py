"""百炼 ChatTongyi 工厂。"""

from __future__ import annotations

from functools import lru_cache

from langchain_community.chat_models.tongyi import ChatTongyi

from app.core.config import Settings, get_settings


@lru_cache
def get_chat_model_cached(model_name: str, api_key: str) -> ChatTongyi:
    return ChatTongyi(model=model_name, api_key=api_key)


def get_chat_model(settings: Settings | None = None) -> ChatTongyi | None:
    """未配置密钥时返回 None，由上层决定返回 500 或占位。"""
    s = settings or get_settings()
    key = (s.dashscope_api_key or "").strip()
    model = (s.llm_model or "").strip()
    if not key or not model:
        return None
    return get_chat_model_cached(model, key)


def invalidate_llm_cache() -> None:
    get_chat_model_cached.cache_clear()
