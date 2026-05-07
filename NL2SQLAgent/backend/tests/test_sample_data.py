"""业务库演示数据（sales）不变量：与技术契约「10+ 行样例」对齐。"""

import sqlite3

from app.db.app_db import init_sample_schema


def test_init_sample_schema_inserts_at_least_ten_rows(tmp_path):
    path = tmp_path / "app.db"
    conn = sqlite3.connect(path)
    try:
        init_sample_schema(conn)
        conn.commit()
        n = conn.execute("SELECT COUNT(*) FROM sales").fetchone()[0]
        assert n >= 10, f"契约要求演示数据不少于 10 行，实际 {n}"

        cols = {row[1] for row in conn.execute("PRAGMA table_info(sales)").fetchall()}
        assert {"id", "region", "amount", "sold_at"} <= cols

        regions = {r[0] for r in conn.execute("SELECT DISTINCT region FROM sales").fetchall()}
        assert len(regions) >= 1
        assert "华东" in regions  # 种子数据含华东
    finally:
        conn.close()


def test_init_sample_schema_is_idempotent(tmp_path):
    """已有数据时不应重复插入。"""
    path = tmp_path / "biz.db"
    conn = sqlite3.connect(path)
    try:
        init_sample_schema(conn)
        conn.commit()
        n1 = conn.execute("SELECT COUNT(*) FROM sales").fetchone()[0]
        init_sample_schema(conn)
        conn.commit()
        n2 = conn.execute("SELECT COUNT(*) FROM sales").fetchone()[0]
        assert n1 == n2
    finally:
        conn.close()
