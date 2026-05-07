"""稳定启动后端：固定工作目录、启动前探测端口、默认不开 --reload。

用法（在 backend 目录下）：
    .venv\\Scripts\\python.exe scripts\\run_uvicorn.py
    # 开发热重载（文件变更会自动重启 worker，易出现多进程争抢）：
    .venv\\Scripts\\python.exe scripts\\run_uvicorn.py --reload

也可从任意目录：
    python path\\to\\scripts\\run_uvicorn.py --port 8000
"""

from __future__ import annotations

import argparse
import os
import socket
import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]


def _probe_listen(host: str, port: int, timeout: float = 0.25) -> bool:
    """若 localhost 侧重能连上端口，视为已有服务监听（与其它环境的 uvicorn 冲突时最明显）。"""
    if host in ("0.0.0.0", "::", ""):
        targets = [("127.0.0.1", port)]
    else:
        targets = [(host, port)]

    for addr, p in targets:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        try:
            if sock.connect_ex((addr, p)) == 0:
                return True
        finally:
            sock.close()
    return False


def _warn_if_ambiguous_exe() -> None:
    exe = Path(sys.executable).resolve()
    p_low = str(exe).lower()
    conda_like = "anaconda3" in p_low or "miniconda3" in p_low or "\\envs\\" in p_low
    looks_project_venv = ".venv" in exe.parts or "/.venv/" in str(exe).replace("\\", "/")

    if conda_like and not looks_project_venv:
        print(
            "WARN: 当前 Python 看起来像 Conda/Global，而不是项目 backend\\.venv；"
            "请使用 .venv\\Scripts\\python.exe 运行本脚本，避免与旧代码/旧依赖混淆。",
            file=sys.stderr,
        )
    print(f"Python: {exe}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description="启动 NL2SQL FastAPI（uvicorn）")
    parser.add_argument("--host", default="127.0.0.1", help="监听地址（默认 127.0.0.1）")
    parser.add_argument("--port", type=int, default=8000, help="端口（默认 8000）")
    parser.add_argument(
        "--reload",
        action="store_true",
        help="开发热重载（WatchFiles，易与多端口号冲突共存；追求稳定时请省略）",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="跳过端口探测（不推荐；仅在有反向代理等特殊场景时使用）",
    )
    ns = parser.parse_args()

    os.chdir(BACKEND_ROOT)
    if str(BACKEND_ROOT) not in sys.path:
        sys.path.insert(0, str(BACKEND_ROOT))

    _warn_if_ambiguous_exe()
    print(f"cwd: {BACKEND_ROOT}", file=sys.stderr)

    if not ns.force and _probe_listen(ns.host, ns.port):
        print(
            f"ERROR: {ns.host}:{ns.port} 已有服务在监听。请先关掉其它 uvicorn（含 Conda 环境起的）后再启动，"
            f"或使用其它端口：python scripts/run_uvicorn.py --port 8001",
            file=sys.stderr,
        )
        sys.exit(1)

    try:
        import uvicorn  # noqa: PLC0415
    except ImportError:
        print("ERROR: 未安装 uvicorn。请在 backend\\.venv 中执行 pip install -r requirements.txt", file=sys.stderr)
        sys.exit(1)

    kw: dict[str, object] = {
        "host": ns.host,
        "port": ns.port,
        "reload": ns.reload,
        "log_level": "info",
    }
    if ns.reload:
        kw["reload_dirs"] = [str(BACKEND_ROOT)]

    uvicorn.run("app.main:app", **kw)


if __name__ == "__main__":
    main()
