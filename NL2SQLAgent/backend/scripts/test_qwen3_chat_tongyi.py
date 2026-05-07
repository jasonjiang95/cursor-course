"""
ChatTongyi（百炼 / DashScope）本地测试：流式输出 + 工具调用返回字段。

安全说明
--------
- **不要**把 API Key 写进本文件或提交到 Git。
- 仅通过环境变量 `DASHSCOPE_API_KEY` 传入；模型名可用 `QWEN_TEST_MODEL`（默认 qwen3-max）。

运行（PowerShell，在 backend 目录）::

    $env:DASHSCOPE_API_KEY = "<你的 Key>"
    $env:QWEN_TEST_MODEL = "qwen3-max"   # 可选
    ..\\.venv\\Scripts\\python.exe scripts/test_qwen3_chat_tongyi.py

依赖::

    pip install dashscope langchain-core langchain-community
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except OSError:
        pass


def _dump(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2, default=str)


def _message_public_dict(msg: Any) -> dict[str, Any]:
    """打印消息/分片上的常用字段（便于对照 qwen3-max 实际返回）。"""
    keys = (
        "content",
        "additional_kwargs",
        "response_metadata",
        "tool_calls",
        "invalid_tool_calls",
        "usage_metadata",
    )
    out: dict[str, Any] = {"_class": type(msg).__name__}
    for k in keys:
        if hasattr(msg, k):
            out[k] = getattr(msg, k)
    return out


def main() -> int:
    key = os.environ.get("DASHSCOPE_API_KEY")
    if not key:
        print("ERROR: 请设置环境变量 DASHSCOPE_API_KEY", file=sys.stderr)
        return 1

    model = os.environ.get("QWEN_TEST_MODEL", "qwen3-max")

    try:
        from langchain_community.chat_models.tongyi import ChatTongyi
        from langchain_core.messages import HumanMessage
        from langchain_core.tools import tool
    except ImportError as e:
        print(
            "ERROR: 缺少依赖。请执行: pip install dashscope langchain-core langchain-community",
            file=sys.stderr,
        )
        print(e, file=sys.stderr)
        return 1

    @tool
    def multiply(first_int: int, second_int: int) -> int:
        """两整数相乘。"""
        return first_int * second_int

    print(f"model = {model!r}\n")

    # ----- 1) 流式 -----
    print("========== STREAM (stream) ==========")
    stream_llm = ChatTongyi(model=model, streaming=True, temperature=0)
    n = 0
    for chunk in stream_llm.stream(
        [HumanMessage(content="用不超过15个字说「测试流式」。")]
    ):
        n += 1
        print(f"--- chunk #{n} ---")
        print(_dump(_message_public_dict(chunk)))

    print(f"\n(total stream chunks: {n})\n")

    # ----- 2) 工具调用 -----
    print("========== TOOL CALLING (bind_tools + invoke) ==========")
    llm_tools = ChatTongyi(model=model, streaming=False, temperature=0).bind_tools(
        [multiply]
    )
    msg = llm_tools.invoke("5 和 42 相乘是多少？请用 multiply 工具计算。")
    print(_dump(_message_public_dict(msg)))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
