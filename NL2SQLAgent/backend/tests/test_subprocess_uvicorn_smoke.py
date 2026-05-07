"""
子进程启动真实 uvicorn，经 TCP 调用 HTTP（与 TestClient 内存 ASGI 互补）。

不调用 POST .../chat（需真实 DashScope Key 或可注入的 Agent mock）；覆盖 Phase 4 联调中的
「后端进程 + 持久化 + REST 路径」验收面。
"""

from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parent.parent


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def _http_json(method: str, url: str, body: dict | None = None, timeout: float = 5.0):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"} if body is not None else {},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 — 测试直连本机子进程
        raw = resp.read().decode("utf-8")
        if resp.status == 204 or not raw:
            return None
        return json.loads(raw)


def test_uvicorn_subprocess_health_and_session_messages(tmp_path):
    port = _free_port()
    meta = tmp_path / "meta_e2e.db"
    appdb = tmp_path / "app_e2e.db"
    env = os.environ.copy()
    env["META_DB_PATH"] = str(meta)
    env["APP_DB_PATH"] = str(appdb)
    env["DASHSCOPE_API_KEY"] = "dummy-not-for-llm"
    env["LLM_MODEL"] = "qwen3-max"

    proc = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
        ],
        cwd=str(BACKEND_ROOT),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    base = f"http://127.0.0.1:{port}"
    try:
        deadline = time.monotonic() + 15.0
        while time.monotonic() < deadline:
            try:
                with urllib.request.urlopen(f"{base}/health", timeout=0.5) as r:
                    assert r.status == 200
                    assert json.loads(r.read().decode()) == {"status": "ok"}
                break
            except (urllib.error.URLError, TimeoutError, ConnectionResetError):
                if proc.poll() is not None:
                    err = proc.stderr.read().decode("utf-8", errors="replace") if proc.stderr else ""
                    pytest.fail(f"uvicorn exited early (code={proc.returncode}): {err}")
                time.sleep(0.15)
        else:
            pytest.fail("uvicorn did not become ready in time")

        empty = _http_json("GET", f"{base}/api/v1/sessions")
        assert empty == {"sessions": []}

        created = _http_json("POST", f"{base}/api/v1/sessions", body={"title": "e2e"})
        assert created["title"] == "e2e"
        sid = created["id"]

        listed = _http_json("GET", f"{base}/api/v1/sessions")
        assert len(listed["sessions"]) == 1

        msgs = _http_json("GET", f"{base}/api/v1/sessions/{sid}/messages")
        assert msgs == {"messages": []}
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)
