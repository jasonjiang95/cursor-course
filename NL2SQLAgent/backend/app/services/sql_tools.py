"""LangChain SQLite 工具：list_tables / get_table_schema / run_select。"""

from __future__ import annotations

import json
import re
import sqlite3
from pathlib import Path
from typing import Annotated

import sqlparse
from langchain_core.tools import tool

from app.core.config import Settings

_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _strip_comments_one_statement(sql_raw: str) -> str:
    statements = sqlparse.split(sql_raw)
    stripped_stmts = [
        s for s in (sqlparse.format(s, strip_comments=True).strip() for s in statements) if s
    ]
    if len(stripped_stmts) != 1:
        raise ValueError("仅允许单个 SQL 语句")
    return stripped_stmts[0].rstrip(";").strip()


def _ensure_select_safe(sql_body: str, max_rows: int) -> str:
    low = sql_body.lstrip().lower()
    if not low.startswith("select"):
        raise ValueError("只允许 SELECT")
    if re.search(
        r"\b(insert|update|delete|drop|pragma|attach|detach)\b",
        low,
    ):
        raise ValueError("禁止使用 INSERT/UPDATE/DELETE/DROP 等写操作或非只读 PRAGMA")
    if not re.search(r"\blimit\s+\d+\b", low):
        sql_body = sql_body.strip() + f" LIMIT {max_rows}"
    return sql_body


def make_sql_tools(settings: Settings) -> list:
    app_path = Path(settings.app_db_path).resolve()
    ro_uri = app_path.as_uri() + "?mode=ro"
    max_rows = settings.max_rows_default

    @tool
    def list_tables() -> str:
        """列出业务 SQLite 数据库中可向用户披露的表名（不含 sqlite_ 内部表）。"""
        conn = sqlite3.connect(ro_uri, uri=True)
        try:
            cur = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            )
            names = [r[0] for r in cur.fetchall()]
        finally:
            conn.close()
        return ", ".join(names) if names else ""

    @tool
    def get_table_schema(table_name: Annotated[str, "单表标识符"]) -> str:
        """给定表名，返回 PRAGMA table_info 的简短 JSON 字段描述。"""
        if not _IDENTIFIER_RE.match(table_name):
            return "错误：非法表名"
        conn = sqlite3.connect(ro_uri, uri=True)
        try:
            cur = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name = ?", (table_name,)
            )
            if not cur.fetchone():
                return f"错误：表 {table_name!r} 不存在"
            cur = conn.execute(f'PRAGMA table_info("{table_name}")')
            cols = [{"name": r[1], "type": r[2], "notnull": bool(r[3])} for r in cur.fetchall()]
        finally:
            conn.close()
        return json.dumps(cols, ensure_ascii=False)

    @tool
    def run_select(sql: Annotated[str, "单条 SQLite SELECT 语句"]) -> str:
        """在安全校验后以只读连接执行 SELECT；成功返回 columns/rows JSON。"""
        try:
            body = _strip_comments_one_statement(sql)
            exe_sql = _ensure_select_safe(body, max_rows)
        except ValueError as e:
            return f"校验失败：{e}"
        conn = sqlite3.connect(ro_uri, uri=True)
        try:
            cur = conn.execute(exe_sql)
            columns = [d[0] for d in cur.description] if cur.description else []
            rows = [tuple(r) for r in cur.fetchall()]
        except sqlite3.Error as e:
            return f"执行错误：{e}"
        finally:
            conn.close()
        return json.dumps({"columns": columns, "rows": rows}, ensure_ascii=False)

    return [list_tables, get_table_schema, run_select]
