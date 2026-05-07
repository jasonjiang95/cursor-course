"""组装 Tool-calling Agent 并单次对话回合。"""

from __future__ import annotations

import ast
import json
import re
from dataclasses import dataclass
from typing import Any

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.core.config import Settings, get_settings
from app.schemas.chat import VizPayload
from app.services.llm_factory import get_chat_model
from app.services.sql_tools import make_sql_tools
from app.services.viz_builder import build_viz_payload

SYSTEM_PROMPT = """你是面向业务 SQLite（销售演示库）的中文数据分析助手。
规则：
- 必须使用提供的工具：`list_tables`、`get_table_schema`、`run_select`；不要臆造表名字段。
- **凡涉及表中实际数据的问题**（包括但不限于：计数、聚合、明细、分组、汇总、前几名、按某列筛选）：**必须先并成功调用 `run_select`**；仅根据对话历史中他人给出的表格/markdown/SQL 复述**不算**，必须用自己本轮的查询结果作答。
- 若用户问及「表里有什么列」：优先 `get_table_schema`，通常不必 `run_select`。
- 查询一律通过 `run_select`（只读 SELECT），方言为 SQLite；先理清表结构与列名后再写 SQL。
- **禁止**在用户未要求时使用 markdown /HTML 整张数据表占位；应先 `run_select`，再用简洁中文概述结果——展示行列由前端可视化负责。
"""


def _needs_follow_up_run_select(user_input: str) -> bool:
    """保守启发：明显需要表中数据支撑的问法才触发第二轮强制查询。"""
    t = user_input.strip()
    if len(t) < 2:
        return False
    keys = (
        "汇总",
        "合计",
        "总和",
        "总计",
        "分组",
        "按月",
        "年平均",
        "平均",
        "均值",
        "计数",
        "多少个",
        "几条",
        "前几",
        "top",
        "最大",
        "最小",
        "最高",
        "最低",
        "筛选",
        "明细",
        "列出全部",
        "销售额",
        "销售",
        "营收",
        "金额",
        "区域",
        "地区",
        "省份",
        "统计",
        "查询",
        "sql",
        "select",
        "走势图",
        "趋势",
        "对比",
        "占比",
        "环比",
        "同比",
    )
    return any(k.upper() in t.upper() if k.isascii() else k in t for k in keys)


def _follow_up_run_select_prompt(original: str) -> str:
    return (
        "【系统自动策略】未检测到你上一轮通过工具 run_select 成功执行 SELECT 并取得结果。"
        "你必须在本轮中实际调用工具 list_tables/get_table_schema/run_select，并用 run_select "
        "执行一条 SQLite SELECT 来回答用户的需求；再根据真实查询结果用一两句中文总结。"
        "严禁凭想象或复述对话里的数字。\n\n"
        f"用户的需求是：\n{original}"
    )


def _iter_ai_tool_calls(ai: AIMessage) -> list[Any]:
    """合并 LangChain 标准字段与厂商可能落在 additional_kwargs 的 tool_calls。"""
    raw = getattr(ai, "tool_calls", None)
    if isinstance(raw, list) and len(raw) > 0:
        return raw
    ak = getattr(ai, "additional_kwargs", None) or {}
    alt = ak.get("tool_calls")
    if isinstance(alt, list) and len(alt) > 0:
        return alt
    return []


def _tool_message_name(m: ToolMessage) -> str:
    n = getattr(m, "name", "") or ""
    if isinstance(n, str) and n:
        return n
    ak = getattr(m, "additional_kwargs", None) or {}
    n2 = ak.get("name")
    return n2 if isinstance(n2, str) else ""


def _history_to_lc(prior_turns: list[dict]) -> list[HumanMessage | AIMessage]:
    out: list[HumanMessage | AIMessage] = []
    for row in prior_turns:
        c = row.get("content", "")
        if row.get("role") == "user":
            out.append(HumanMessage(content=c))
        else:
            out.append(AIMessage(content=c))
    return out


def _normalize_tool_call(tc: object) -> dict[str, Any]:
    if isinstance(tc, dict):
        out = dict(tc)
        if "args" not in out and isinstance(out.get("function"), dict):
            fn = out["function"]
            out["name"] = fn.get("name")
            arg_raw = fn.get("arguments") or "{}"
            if isinstance(arg_raw, str):
                try:
                    out["args"] = json.loads(arg_raw) if arg_raw.strip() else {}
                except json.JSONDecodeError:
                    out["args"] = {}
            elif isinstance(arg_raw, dict):
                out["args"] = arg_raw
            else:
                out["args"] = {}
            out["id"] = out.get("id")
        return out
    try:
        name = getattr(tc, "name", None)
        args = getattr(tc, "args", None)
        tid = getattr(tc, "id", None)
        return {"name": name or "", "args": args or {}, "id": tid}
    except Exception:
        return {}


def _normalize_tool_args(args: object) -> dict[str, Any]:
    if isinstance(args, dict):
        return dict(args)
    if isinstance(args, str) and args.strip():
        try:
            parsed = json.loads(args)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


_MD_FENCE_START = re.compile(r"^\s*```(?:json)?\s*", re.I)


def _strip_markdown_fence(s: str) -> str:
    t = s.strip()
    if _MD_FENCE_START.match(t):
        t = _MD_FENCE_START.sub("", t)
    if t.endswith("```"):
        t = t[: t.rfind("```")].strip()
    return t.strip()


def _json_or_literal_eval(payload: str) -> Any:
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        return ast.literal_eval(payload)


def _coerce_run_select_payload(raw: object, *, _depth: int = 0) -> dict[str, list] | None:
    """将工具 observation 规整为 {\"columns\":[...],\"rows\":[...]} 或 None。"""
    if _depth > 4:
        return None
    if isinstance(raw, dict):
        cols = raw.get("columns")
        rows = raw.get("rows")
        if isinstance(cols, list) and isinstance(rows, list):
            return {"columns": cols, "rows": rows}
        return None
    s = raw if isinstance(raw, str) else str(raw)
    s = _strip_markdown_fence(s.strip())
    if not s:
        return None
    try:
        data = _json_or_literal_eval(s)
    except (json.JSONDecodeError, ValueError, SyntaxError):
        return None
    if isinstance(data, str):
        return _coerce_run_select_payload(data, _depth=_depth + 1)
    if not isinstance(data, dict):
        return None
    cols = data.get("columns")
    rows = data.get("rows")
    if isinstance(cols, list) and isinstance(rows, list):
        return {"columns": cols, "rows": rows}
    return None


def _extract_run_select_truth(messages: list[BaseMessage]) -> tuple[str | None, dict | None, str | None]:
    """从消息序列提取 run_select（兼容部分运行时的消息图）。"""
    sql_sequence: list[str | None] = []
    for m in messages:
        if not isinstance(m, AIMessage):
            continue
        for tc in _iter_ai_tool_calls(m):
            d = _normalize_tool_call(tc)
            name = str(d.get("name") or "")
            if name != "run_select":
                continue
            args = _normalize_tool_args(d.get("args"))
            sql_sequence.append(_normalize_run_select_tool_sql(args))

    rs_contents: list[str] = []
    for m in messages:
        if not isinstance(m, ToolMessage):
            continue
        name = _tool_message_name(m)
        if name != "run_select":
            continue
        raw = m.content if isinstance(m.content, str) else str(m.content)
        rs_contents.append(raw)

    return _finalize_run_select_pairing(sql_sequence, rs_contents)


def _normalize_run_select_tool_sql(tool_input: object) -> str | None:
    def _dig_sql(d: dict[str, Any]) -> str | None:
        direct = d.get("sql")
        if isinstance(direct, str) and direct.strip():
            return direct.strip()
        for alt in ("query", "statement", "select", "SELECT"):
            v = d.get(alt)
            if isinstance(v, str) and v.strip():
                return v.strip()
        inner = d.get("kwargs")
        if isinstance(inner, dict):
            return _dig_sql(inner)
        return None

    if isinstance(tool_input, dict):
        found = _dig_sql(tool_input)
        if found:
            return found
    if isinstance(tool_input, str) and tool_input.strip():
        s = tool_input.strip()
        try:
            parsed = ast.literal_eval(s) if (s.startswith("{") and "'" in s) else json.loads(s)
        except (json.JSONDecodeError, ValueError, SyntaxError):
            return None
        if isinstance(parsed, dict):
            return _dig_sql(parsed)
    return None


def _finalize_run_select_pairing(
    sql_sequence: list[str | None],
    rs_contents: list[str],
) -> tuple[str | None, dict | None, str | None]:
    last_success: tuple[str | None, dict] | None = None
    last_tool_err: str | None = None
    last_sql_attempt: str | None = None

    n = max(len(sql_sequence), len(rs_contents))
    for i in range(n):
        sql_part = sql_sequence[i] if i < len(sql_sequence) else None
        if sql_part:
            last_sql_attempt = sql_part

        content = rs_contents[i] if i < len(rs_contents) else ""
        if not content:
            continue
        strip = content.strip() if isinstance(content, str) else str(content).strip()
        data = _coerce_run_select_payload(content)
        if data is not None:
            pair_sql = sql_part or last_sql_attempt
            last_success = (pair_sql, data)
        else:
            last_tool_err = strip

    if last_success:
        return last_success[0], last_success[1], None
    return last_sql_attempt, None, last_tool_err


def _extract_run_select_truth_from_intermediate_steps(
    intermediate_steps: list[tuple[Any, str]],
) -> tuple[str | None, dict | None, str | None]:
    """从 AgentExecutor 的 intermediate_steps 提取 run_select SQL 与结果（可信真源）。"""
    sql_sequence: list[str | None] = []
    rs_contents: list[str] = []
    for action, observation in intermediate_steps:
        tool = getattr(action, "tool", None)
        if not isinstance(tool, str) or tool != "run_select":
            continue
        sql_sequence.append(_normalize_run_select_tool_sql(getattr(action, "tool_input", None)))
        rs_contents.append(observation if isinstance(observation, str) else str(observation))
    return _finalize_run_select_pairing(sql_sequence, rs_contents)


def _merge_run_select_extract(
    *,
    steps: tuple[str | None, dict | None, str | None],
    msgs: tuple[str | None, dict | None, str | None],
) -> tuple[str | None, dict | None, str | None]:
    """优先使用 intermediate_steps（messages 常为缺省空列表）。"""
    sql_a, tab_a, terr_a = steps
    sql_b, tab_b, terr_b = msgs
    if tab_a:
        return sql_a, tab_a, None
    if tab_b:
        return sql_b, tab_b, None
    sql = sql_a or sql_b
    terr = terr_a or terr_b
    return sql, None, terr


def _last_assistant_text(messages: list[Any]) -> str:
    for m in reversed(messages):
        if not isinstance(m, AIMessage):
            continue
        c = getattr(m, "content", "") or ""
        txt = c if isinstance(c, str) else str(c)
        if txt.strip():
            return txt.strip()
    return ""


@dataclass
class ChatTurnResult:
    assistant_text: str
    sql: str | None
    viz_payload: VizPayload | None
    error: str | None


class AgentRunner:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.tools = make_sql_tools(self.settings)

    def run_turn(self, prior_db_messages: list[dict], user_input: str) -> ChatTurnResult:
        llm = get_chat_model(self.settings)
        if llm is None:
            return ChatTurnResult(
                assistant_text="服务端未配置大模型（需要环境变量 DASHSCOPE_API_KEY 与 LLM_MODEL）。",
                sql=None,
                viz_payload=None,
                error="缺失 DASHSCOPE_API_KEY 或 LLM_MODEL",
            )

        history = _history_to_lc(prior_db_messages)
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM_PROMPT),
                MessagesPlaceholder("chat_history", optional=True),
                ("human", "{input}"),
                MessagesPlaceholder("agent_scratchpad"),
            ]
        )
        agent = create_tool_calling_agent(llm, self.tools, prompt)
        executor = AgentExecutor(
            agent=agent,
            tools=self.tools,
            max_iterations=12,
            return_intermediate_steps=True,
            # 流式合并 chunk 在使用 ChatTongyi + tool-calling 时可能导致规划结果异常；关闭流式由 invoke 一次取全量。
            stream_runnable=False,
        )

        try:
            result = executor.invoke({"input": user_input, "chat_history": history})
        except Exception as e:
            msg = str(e)
            friendly = "执行对话时发生意外错误，请稍后重试或为管理员检查日志。"
            return ChatTurnResult(
                assistant_text=friendly,
                sql=None,
                viz_payload=None,
                error=msg[:500],
            )

        lc_msgs: list[Any] = list(result.get("messages") or [])
        steps_acc: list[tuple[Any, str]] = list(result.get("intermediate_steps") or [])
        extract = _merge_run_select_extract(
            steps=_extract_run_select_truth_from_intermediate_steps(steps_acc),
            msgs=_extract_run_select_truth(lc_msgs),
        )
        sql, tab, terr = extract

        r2: dict[str, Any] | None = None
        if tab is None and _needs_follow_up_run_select(user_input):
            try:
                r2 = executor.invoke(
                    {
                        "input": _follow_up_run_select_prompt(user_input),
                        "chat_history": history,
                    },
                )
                lc_msgs.extend(list(r2.get("messages") or []))
                steps_acc.extend(list(r2.get("intermediate_steps") or []))
                extract = _merge_run_select_extract(
                    steps=_extract_run_select_truth_from_intermediate_steps(steps_acc),
                    msgs=_extract_run_select_truth(lc_msgs),
                )
                sql, tab, terr = extract
            except Exception as e2:
                extra = str(e2)[:400]
                terr = (terr + "；" if terr else "") + f"二次查询管线失败：{extra}"

        last_result: dict[str, Any] = r2 if r2 is not None else result
        final_txt = _last_assistant_text(lc_msgs)
        if not final_txt.strip():
            out = last_result.get("output")
            final_txt = out if isinstance(out, str) else str(out or "")

        viz: VizPayload | None = None
        err = terr

        if tab is not None and isinstance(tab.get("columns"), list) and isinstance(tab.get("rows"), list) and tab.get(
            "columns"
        ):
            cols = [str(x) for x in tab["columns"]]
            raw_rows = tab["rows"]
            tuples: list[tuple[Any, ...]] = []
            for row in raw_rows:
                if isinstance(row, dict):
                    tuples.append(tuple(row.get(c) for c in cols))
                elif isinstance(row, (list, tuple)):
                    tuples.append(tuple(row))
                else:
                    tuples.append((row,))
            try:
                viz = build_viz_payload(
                    columns=cols,
                    rows=tuples,
                    viz_llm=llm,
                    title_hint=None,
                )
            except Exception as e:
                err = err or str(e)
                viz = None

        return ChatTurnResult(
            assistant_text=final_txt.strip() or "（无文本回复）",
            sql=sql,
            viz_payload=viz,
            error=err,
        )
