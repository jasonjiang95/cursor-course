import json

import sqlite3


def test_run_select_tool_returns_json(tmp_path, monkeypatch):
    monkeypatch.setenv("APP_DB_PATH", str(tmp_path / "biz.db"))
    monkeypatch.setenv("META_DB_PATH", str(tmp_path / "meta.db"))

    from app.core.config import get_settings
    from app.db.app_db import init_sample_schema
    from app.services.sql_tools import make_sql_tools

    get_settings.cache_clear()
    s = get_settings()

    bc = sqlite3.connect(tmp_path / "biz.db")
    try:
        init_sample_schema(bc)
        bc.commit()
    finally:
        bc.close()

    tools = make_sql_tools(s)
    run = next(t for t in tools if t.name == "run_select")
    sql = "SELECT region, SUM(amount) AS amt FROM sales GROUP BY region"
    out = run.invoke({"sql": sql})
    data = json.loads(out)
    assert "columns" in data
    assert "region" in data["columns"]
