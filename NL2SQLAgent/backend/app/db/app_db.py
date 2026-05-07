"""业务演示库：sales 表与样例行。"""

from __future__ import annotations

import sqlite3
from datetime import date, timedelta


def init_sample_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          region TEXT NOT NULL,
          amount REAL NOT NULL,
          sold_at TEXT NOT NULL
        );
        """
    )
    cur = conn.execute("SELECT COUNT(*) FROM sales")
    if cur.fetchone()[0] > 0:
        return
    base = date(2026, 1, 1)
    regions = ("华东", "华北", "华南", "西南", "西北")
    rows: list[tuple[str, float, str]] = []
    for i in range(12):
        r = regions[i % len(regions)]
        amt = 1000.0 + (i * 237.5) + (i % 3) * 50.0
        d = (base + timedelta(days=i * 5)).isoformat()
        rows.append((r, amt, d))
    conn.executemany(
        "INSERT INTO sales (region, amount, sold_at) VALUES (?, ?, ?)", rows
    )
