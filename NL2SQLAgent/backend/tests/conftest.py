import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app
from app.services.llm_factory import invalidate_llm_cache


@pytest.fixture
def client(tmp_path, monkeypatch) -> TestClient:
    monkeypatch.setenv("META_DB_PATH", str(tmp_path / "meta.db"))
    monkeypatch.setenv("APP_DB_PATH", str(tmp_path / "app.db"))
    monkeypatch.setenv("DASHSCOPE_API_KEY", "test-key-not-for-production")
    monkeypatch.setenv("LLM_MODEL", "qwen3-max")

    get_settings.cache_clear()
    invalidate_llm_cache()
    application = create_app()
    with TestClient(application) as c:
        yield c
    get_settings.cache_clear()
    invalidate_llm_cache()
