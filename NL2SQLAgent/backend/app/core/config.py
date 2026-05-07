from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Comma-separated origins, e.g. "http://localhost:5173,http://127.0.0.1:5173"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    dashscope_api_key: str | None = None
    llm_model: str = ""
    # 可选：覆盖 DashScope HTTP 根地址（如新加坡地域，见百炼文档 dashscope.base_http_api_url）
    dashscope_base_http_api_url: str | None = None
    # 为 True 时，/chat/stream 在二阶段用 dashscope.Generation.call(stream=True) 推送正文
    chat_stream_dashscope_generation: bool = True

    meta_db_path: str = "./data/meta.db"
    app_db_path: str = "./data/app.db"

    max_rows_default: int = 200

    chat_history_turns: int = 20


@lru_cache
def get_settings() -> Settings:
    return Settings()
