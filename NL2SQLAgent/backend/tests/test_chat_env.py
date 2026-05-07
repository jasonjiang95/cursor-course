"""LLM 环境缺失时的路由行为（不调用真实 Tongyi）。"""

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app
from app.services.llm_factory import invalidate_llm_cache


@pytest.fixture
def client_no_llm(tmp_path, monkeypatch):
    monkeypatch.setenv("META_DB_PATH", str(tmp_path / "meta.db"))
    monkeypatch.setenv("APP_DB_PATH", str(tmp_path / "app.db"))
    # pydantic-settings 会在「环境变量缺失」时回退读取 backend/.env；用空字符串覆盖以稳定测 500 分支。
    monkeypatch.setenv("DASHSCOPE_API_KEY", "")
    monkeypatch.setenv("LLM_MODEL", "")
    get_settings.cache_clear()
    invalidate_llm_cache()
    application = create_app()
    with TestClient(application) as c:
        yield c
    get_settings.cache_clear()
    invalidate_llm_cache()


def test_chat_500_when_llm_env_missing(client_no_llm):
    sid = client_no_llm.post("/api/v1/sessions", json={}).json()["id"]
    rc = client_no_llm.post(
        f"/api/v1/sessions/{sid}/chat",
        json={"content": "x"},
    )
    assert rc.status_code == 500
