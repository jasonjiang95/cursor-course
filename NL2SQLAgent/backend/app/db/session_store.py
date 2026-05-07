from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


@dataclass
class SessionStore:
    """meta.db 上的会话与消息 DAO。"""

    db_path: str

    def _connect(self) -> sqlite3.Connection:
        p = Path(self.db_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(p, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def create_session(self, title: str | None = None) -> dict:
        sid = str(uuid4())
        now = _utc_now_iso()
        with self._connect() as c:
            c.execute(
                "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (sid, title, now, now),
            )
            c.commit()
        return {"id": sid, "title": title or "", "created_at": now, "updated_at": now}

    def list_sessions(self) -> list[dict]:
        with self._connect() as c:
            cur = c.execute(
                "SELECT id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC"
            )
            return [_row_summary(dict(r)) for r in cur.fetchall()]

    def _get_session_raw(self, c: sqlite3.Connection, sid: str) -> dict | None:
        cur = c.execute(
            "SELECT id, title, created_at, updated_at FROM sessions WHERE id = ?",
            (sid,),
        )
        r = cur.fetchone()
        return dict(r) if r else None

    def get_session(self, sid: str) -> dict | None:
        with self._connect() as c:
            r = self._get_session_raw(c, sid)
        return _row_summary(r) if r else None

    def patch_session_title(self, sid: str, title: str) -> dict | None:
        now = _utc_now_iso()
        with self._connect() as c:
            row = self._get_session_raw(c, sid)
            if not row:
                return None
            c.execute(
                "UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?",
                (title, now, sid),
            )
            c.commit()
        return self.get_session(sid)

    def delete_session(self, sid: str) -> bool:
        with self._connect() as c:
            cur = c.execute("DELETE FROM sessions WHERE id = ?", (sid,))
            c.commit()
            return cur.rowcount > 0

    def append_message(
        self,
        session_id: str,
        *,
        role: str,
        content: str,
        extra: dict | None = None,
    ) -> dict:
        mid = str(uuid4())
        now = _utc_now_iso()
        extra_s = json.dumps(extra, ensure_ascii=False) if extra is not None else None
        with self._connect() as c:
            c.execute(
                """INSERT INTO messages (id, session_id, role, content, extra, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (mid, session_id, role, content, extra_s, now),
            )
            c.execute(
                "UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id)
            )
            c.commit()
        return _message_row_to_dto(mid, session_id, role, content, now, extra)

    def list_messages(self, session_id: str) -> list[dict]:
        with self._connect() as c:
            cur = c.execute(
                """SELECT id, role, content, extra, created_at FROM messages
                   WHERE session_id = ? ORDER BY created_at ASC""",
                (session_id,),
            )
            return [
                _message_row_to_dto(
                    r["id"],
                    session_id,
                    r["role"],
                    r["content"],
                    r["created_at"],
                    json.loads(r["extra"]) if r["extra"] else None,
                )
                for r in cur.fetchall()
            ]


def _row_summary(row: dict | None) -> dict:
    if not row:
        return {}
    return {
        "id": row["id"],
        "title": row["title"] if row["title"] is not None else "",
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _message_row_to_dto(
    mid: str,
    _session_id: str,
    role: str,
    content: str,
    created_at: str,
    extra: dict | None,
) -> dict:
    sql = viz = err = None
    if isinstance(extra, dict):
        sql = extra.get("sql")
        viz = extra.get("viz_payload")
        err = extra.get("error")
    return {
        "id": mid,
        "role": role,
        "content": content,
        "created_at": created_at,
        "sql": sql,
        "viz_payload": viz,
        "error": err,
    }
