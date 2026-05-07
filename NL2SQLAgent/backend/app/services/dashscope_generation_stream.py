"""DashScope 原生文本生成流式：Generation.call（与官网示例一致）。"""

from __future__ import annotations

from collections.abc import Iterator
from http import HTTPStatus
from typing import Any

import dashscope
from dashscope import Generation


def _normalize_message_content(message: Any) -> str:
    """从 Choice.message 取出纯文本（兼容 str / list 多模态）。"""
    if message is None:
        return ""
    c = getattr(message, "content", None)
    if c is None and isinstance(message, dict):
        c = message.get("content")
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        parts: list[str] = []
        for item in c:
            if isinstance(item, dict) and "text" in item:
                parts.append(str(item.get("text") or ""))
        return "".join(parts)
    return str(c) if c is not None else ""


def _extract_visible_text_from_response(resp: Any) -> str:
    """单条流式响应里「当前包」可见正文：优先 choices.message，否则 output.text。"""
    output = getattr(resp, "output", None)
    if output is None:
        return ""
    choices = getattr(output, "choices", None)
    if choices:
        ch0 = choices[0]
        message = getattr(ch0, "message", None)
        t = _normalize_message_content(message)
        if t:
            return t
    text = getattr(output, "text", None)
    return (text or "") if isinstance(text, str) else ""


def iter_generation_text_deltas(
    *,
    api_key: str,
    model: str,
    messages: list[dict[str, Any]],
    base_http_api_url: str | None = None,
    incremental_output: bool = True,
) -> Iterator[str]:
    """
    遍历流式 Generation，产出**面向 SSE 的增量正文**。
    兼容两类分片：累计全长（新包包含旧前缀）与纯增量片段。
    """
    dashscope.api_key = api_key
    if base_http_api_url and base_http_api_url.strip():
        dashscope.base_http_api_url = base_http_api_url.strip()

    responses = Generation.call(
        model=model,
        messages=messages,
        result_format="message",
        stream=True,
        incremental_output=incremental_output,
    )

    seen_full: str = ""

    for resp in responses:
        if resp.status_code != HTTPStatus.OK:
            rid = getattr(resp, "request_id", "")
            code = getattr(resp, "code", "")
            msg = getattr(resp, "message", "") or "Generation 请求失败"
            raise RuntimeError(f"dashscope Generation 失败 request_id={rid} code={code} message={msg}")

        raw = _extract_visible_text_from_response(resp)
        if not raw:
            continue

        # 累计模式：新串以已见全文为前缀 → 只推送新增后缀
        if seen_full and raw.startswith(seen_full):
            piece = raw[len(seen_full) :]
            seen_full = raw
        elif seen_full == "":
            piece = raw
            seen_full = raw
        else:
            # 纯增量分片 或 格式变化：拼到已见全文后
            piece = raw
            seen_full = seen_full + raw

        if piece:
            yield piece
