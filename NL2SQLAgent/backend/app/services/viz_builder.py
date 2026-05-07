"""根据查询结果构造 VizPayload（规则优先，其次可选 LLM）。"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

from langchain_core.messages import HumanMessage
from pydantic import ValidationError

from app.schemas.chat import VizPayload

if TYPE_CHECKING:
    from langchain_core.language_models import BaseChatModel


def _rows_as_dicts(columns: list[str], rows: list[tuple[Any, ...]]) -> list[dict[str, Any]]:
    return [dict(zip(columns, row)) for row in rows]


def _is_numeric_scalar(v: Any) -> bool:
    if v is None:
        return False
    if isinstance(v, bool):
        return False
    try:
        float(v)
        return True
    except (TypeError, ValueError):
        return False


def _infer_bar_axes(columns: list[str], rows: list[tuple[Any, ...]]) -> tuple[int, int] | None:
    if len(columns) != 2 or not rows:
        return None
    v0_num = sum(1 for r in rows if _is_numeric_scalar(r[0]))
    v1_num = sum(1 for r in rows if _is_numeric_scalar(r[1]))
    # 选一列 predominantly 数值作为 y
    if v1_num >= v0_num and v1_num > 0:
        return 0, 1  # xKey col0 yKey col1
    if v0_num > 0:
        return 1, 0
    return None


def _table_payload(columns: list[str], rows: list[tuple[Any, ...]], title: str | None = None):
    rd = _rows_as_dicts(columns, rows)
    xk, yk = (columns[0], columns[-1]) if columns else ("x", "y")
    return VizPayload(
        kind="echarts",
        chartType="table",
        title=title,
        xKey=xk,
        yKey=yk,
        rows=rd,
    )


def build_viz_payload(
    *,
    columns: list[str],
    rows: list[tuple[Any, ...]],
    viz_llm: "BaseChatModel | None" = None,
    title_hint: str | None = None,
) -> VizPayload | None:
    """规则：两列且一列数值主导 → bar；否则尝试 LLM JSON；失败则退回 table。"""
    if not columns:
        return None

    axes = _infer_bar_axes(columns, rows)
    if axes:
        xi, yi = axes
        xk = columns[xi]
        yk = columns[yi]
        rd = _rows_as_dicts(columns, rows)
        return VizPayload(
            kind="echarts",
            chartType="bar",
            title=title_hint,
            seriesName=yk,
            xKey=xk,
            yKey=yk,
            rows=rd,
        )

    if viz_llm is not None:
        prompt = HumanMessage(
            content=(
                "你是图表配置助手。仅输出一个 JSON 对象（不要 markdown）。"
                "形状：{"
                "\"kind\":\"echarts\","
                "\"chartType\":\"bar|line|pie|table\","
                "\"title\":\"可选\","
                "\"seriesName\":\"可选\","
                "\"xKey\":\"列名\",\"yKey\":\"列名\","
                "\"rows\":[{\"列名\":值,...}]"
                "}。\n"
                f"列名列表：{columns!r}\n"
                f"样例行（至多 20 条）：{_rows_as_dicts(columns, rows[:20])!r}\n"
            )
        )
        try:
            out = viz_llm.invoke([prompt]).content  # type: ignore[attr-defined]
            raw = json.loads(out) if isinstance(out, str) else out
            if isinstance(raw, str):
                raw = json.loads(raw)
            return VizPayload.model_validate(raw)
        except (json.JSONDecodeError, ValidationError, TypeError):
            pass

    return _table_payload(columns, rows, title=title_hint)
