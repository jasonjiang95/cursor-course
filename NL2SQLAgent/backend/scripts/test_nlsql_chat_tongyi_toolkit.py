"""
NL2SQL 实测：LangChain `SQLDatabase` + `SQLDatabaseToolkit` + `ChatTongyi`（百炼 Qwen3）。

目的
----
1. **工具层（可不设 Key）**：`ListSQLDatabaseTool` / `InfoSQLDatabaseTool` / `QuerySQLDatabaseTool`
   的 **入参 JSON Schema** 与 **invoke 一次的真实返回**（字符串形态）。
2. **含 query_checker 的完整 Toolkit（需 Key）**：`SQLDatabaseToolkit.get_tools()` 四个工具 schema。
3. **Agent 全链路（需 Key）**：`create_sql_agent(..., agent_type="tool-calling")` 的
   `invoke` 顶层字段与 `intermediate_steps`（含 Qwen3 `tool_calls` 与 observation）。

安全
----
- 仅使用环境变量 `DASHSCOPE_API_KEY`；模型名 `QWEN_TEST_MODEL`（默认 `qwen3-max`）。

运行（PowerShell，cwd = `NL2SQLAgent/backend`）::

    ..\\.venv\\Scripts\\python.exe scripts/test_nlsql_chat_tongyi_toolkit.py

全链路::

    $env:DASHSCOPE_API_KEY="..."
    ..\\.venv\\Scripts\\python.exe scripts/test_nlsql_chat_tongyi_toolkit.py

依赖::

    pip install dashscope langchain-core langchain-community langchain-classic sqlalchemy
"""

from __future__ import annotations

import gc
import json
import os
import sqlite3
import sys
import tempfile
from pathlib import Path
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except OSError:
        pass


def _dump(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2, default=str)


def _trunc(s: str, n: int = 800) -> str:
    s = str(s).strip()
    return s if len(s) <= n else s[:n] + f"\n... ({len(s)} chars total)"


def _make_sample_sqlite(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    try:
        cur = con.cursor()
        cur.execute("""
            CREATE TABLE sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                region TEXT NOT NULL,
                amount REAL NOT NULL,
                sold_at TEXT NOT NULL
            )
        """)
        cur.executemany(
            "INSERT INTO sales (region, amount, sold_at) VALUES (?,?,?)",
            [
                ("华东", 120.5, "2025-01-10"),
                ("华北", 95.0, "2025-01-11"),
                ("华南", 140.0, "2025-01-12"),
            ],
        )
        con.commit()
    finally:
        con.close()


def _tool_schema(tool: Any) -> dict[str, Any]:
    out: dict[str, Any] = {
        "name": getattr(tool, "name", None),
        "description": _trunc(getattr(tool, "description", "") or "", 400),
    }
    schema = getattr(tool, "args_schema", None)
    if schema is not None and hasattr(schema, "model_json_schema"):
        out["args_json_schema"] = schema.model_json_schema()
    return out


def _serialize_step(step: Any) -> dict[str, Any]:
    action, observation = step
    agent_action: dict[str, Any] = {"type": type(action).__name__}
    if getattr(action, "tool", None) is not None:
        agent_action["tool"] = action.tool
    if getattr(action, "tool_input", None) is not None:
        agent_action["tool_input"] = action.tool_input
    log = getattr(action, "log", None)
    if log:
        agent_action["log_snippet"] = _trunc(str(log), 500)
    ms = getattr(action, "message_log", None)
    if ms:
        last = ms[-1] if isinstance(ms, list) and ms else ms
        agent_action["last_message"] = {
            "type": type(last).__name__,
            "content": getattr(last, "content", None),
            "tool_calls": getattr(last, "tool_calls", None),
            "additional_kwargs": getattr(last, "additional_kwargs", None),
        }
    return {"action": agent_action, "observation": _trunc(str(observation), 1200)}


def print_offline_three_tools(db_uri: str) -> None:
    """不调用百炼 API；不涉及 sql_db_query_checker。"""
    from langchain_community.tools.sql_database.tool import (
        InfoSQLDatabaseTool,
        ListSQLDatabaseTool,
        QuerySQLDatabaseTool,
    )
    from langchain_community.utilities import SQLDatabase

    db = SQLDatabase.from_uri(db_uri)
    lt = ListSQLDatabaseTool(db=db)
    inf = InfoSQLDatabaseTool(db=db)
    qy = QuerySQLDatabaseTool(db=db)

    print("========== A) 三工具离线：Schema + invoke 入出参 ==========\n")
    for t in (lt, inf, qy):
        print(_dump(_tool_schema(t)))
        print()

    v1 = lt.invoke({"tool_input": ""})
    print(f"[{lt.name}] invoke({{'tool_input': ''}})\n  type={type(v1).__name__!r}\n  value={v1!r}\n")

    v2 = inf.invoke({"table_names": "sales"})
    print(f"[{inf.name}] invoke({{'table_names': 'sales'}})\n  type={type(v2).__name__!r}\n  value:\n{_trunc(str(v2), 900)}\n")

    sql = "SELECT region, SUM(amount) AS s FROM sales GROUP BY region ORDER BY s DESC LIMIT 5"
    v3 = qy.invoke({"query": sql})
    print(f"[{qy.name}] invoke({{'query': <SELECT...>}})\n  type={type(v3).__name__!r}\n  value:\n{_trunc(str(v3), 700)}\n")


def print_full_toolkit_and_agent(llm: Any, db_uri: str) -> None:
    from langchain_community.agent_toolkits import SQLDatabaseToolkit, create_sql_agent
    from langchain_community.utilities import SQLDatabase

    db = SQLDatabase.from_uri(db_uri)
    toolkit = SQLDatabaseToolkit(db=db, llm=llm)
    tools = toolkit.get_tools()

    print("========== B) SQLDatabaseToolkit 四工具（含 query_checker）Schema ==========\n")
    for t in tools:
        print(_dump(_tool_schema(t)))
        print()

    print("========== C) create_sql_agent(tool-calling) + invoke ==========\n")
    agent_exec = create_sql_agent(
        llm,
        db=db,
        agent_type="tool-calling",
        verbose=False,
        max_iterations=12,
        agent_executor_kwargs={"return_intermediate_steps": True},
    )
    question = "每个地区的销售额总和是多少？用中文回答，并简要说明依据的表。"
    result = agent_exec.invoke({"input": question})

    print(f"invoke 返回顶层键: {list(result.keys())}\n")
    print("--- output（Agent 最终输出字符串）---")
    print(_trunc(str(result.get("output", "")), 2500))
    print()

    steps = result.get("intermediate_steps") or []
    print(f"--- intermediate_steps 条数: {len(steps)} ---\n")
    for i, step in enumerate(steps, 1):
        print(f"##### step {i}")
        print(_dump(_serialize_step(step)))
        print()


def main() -> int:
    fd, raw = tempfile.mkstemp(prefix="nlsql_test_", suffix=".db")
    os.close(fd)
    db_path = Path(raw)
    try:
        _make_sample_sqlite(db_path)
        db_uri = f"sqlite:///{db_path.as_posix()}"
        print(f"临时 SQLite: {db_uri}\n")

        print_offline_three_tools(db_uri)

        key = os.environ.get("DASHSCOPE_API_KEY")
        if not key:
            print(
                "\n（未设置 DASHSCOPE_API_KEY，跳过 B/C：完整 Toolkit sql_db_query_checker 与 SQL Agent）\n"
                "如需全链路打印，请设置 Key 后重跑。\n",
            )
            return 0

        from langchain_community.chat_models.tongyi import ChatTongyi

        model = os.environ.get("QWEN_TEST_MODEL", "qwen3-max")
        llm = ChatTongyi(model=model, temperature=0)
        print_full_toolkit_and_agent(llm, db_uri)
        return 0
    finally:
        gc.collect()
        try:
            if db_path.exists():
                db_path.unlink()
        except PermissionError:
            print(
                f"WARN: 临时库仍被占用，未能删除: {db_path}（可稍后手动删）",
                file=sys.stderr,
            )


if __name__ == "__main__":
    raise SystemExit(main())
