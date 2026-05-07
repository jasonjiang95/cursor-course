import json

from langchain.agents.output_parsers.tools import ToolAgentAction
from langchain_core.agents import AgentAction
from langchain_core.messages import AIMessage, ToolMessage

from app.services.agent_runner import (
    _coerce_run_select_payload,
    _extract_run_select_truth,
    _extract_run_select_truth_from_intermediate_steps,
    _normalize_run_select_tool_sql,
)


def _tc(name: str, args: dict, tid: str = "x"):
    """构造 LangChain AIMessage.tool_calls 元素。"""
    return {"type": "tool_call", "name": name, "args": args, "id": tid}


def test_extract_pairs_run_select_when_tool_call_id_empty_on_ai():
    """空 id 时用顺序配对，避免因 dict 写入同一键而覆盖."""
    payload = {"columns": ["region"], "rows": [["华东"]]}
    messages = [
        AIMessage(content="a", tool_calls=[_tc("run_select", {"sql": "SELECT 1"}, tid="")]),
        ToolMessage(
            content=json.dumps(payload, ensure_ascii=False),
            name="run_select",
            tool_call_id="any",
        ),
    ]
    sql, tab, terr = _extract_run_select_truth(messages)
    assert sql == "SELECT 1"
    assert tab == {"columns": ["region"], "rows": [["华东"]]}
    assert terr is None


def test_extract_list_tables_does_not_interleave():
    messages = [
        AIMessage(content="a", tool_calls=[_tc("list_tables", {}, tid="1")]),
        ToolMessage(content="sales", name="list_tables", tool_call_id="1"),
        AIMessage(content="b", tool_calls=[_tc("run_select", {"sql": "S2"}, tid="")]),
        ToolMessage(
            content=json.dumps({"columns": ["x"], "rows": [[1]]}),
            name="run_select",
            tool_call_id="2",
        ),
    ]
    sql, tab, _ = _extract_run_select_truth(messages)
    assert sql == "S2"
    assert tab is not None
    assert tab["columns"] == ["x"]


def test_extract_tool_error_string():
    messages = [
        AIMessage(content="a", tool_calls=[_tc("run_select", {"sql": "BAD"}, tid="")]),
        ToolMessage(content="校验失败：不允许", name="run_select", tool_call_id="1"),
    ]
    sql, tab, terr = _extract_run_select_truth(messages)
    assert sql == "BAD"
    assert tab is None
    assert terr and "校验" in terr


def test_extract_reads_tool_calls_from_additional_kwargs_only():
    """兼容 tool_calls 仅出现在 additional_kwargs 的响应。"""
    payload = {"columns": ["a"], "rows": [[1]]}
    raw_tool = [
        {
            "id": "c1",
            "function": {
                "name": "run_select",
                "arguments": json.dumps({"sql": "SELECT 1 AS a"}),
            },
        }
    ]
    messages = [
        AIMessage(content="ok", tool_calls=[], additional_kwargs={"tool_calls": raw_tool}),
        ToolMessage(
            content=json.dumps(payload, ensure_ascii=False),
            name="run_select",
            tool_call_id="c1",
        ),
    ]
    sql, tab, terr = _extract_run_select_truth(messages)
    assert sql == "SELECT 1 AS a"
    assert tab["columns"] == ["a"]
    assert terr is None


def test_extract_from_intermediate_steps_matches_agent_executor():
    body = {"columns": ["region"], "rows": [["华东"]]}
    action = AgentAction(tool="run_select", tool_input={"sql": "SELECT 1"}, log="")
    sql, tab, terr = _extract_run_select_truth_from_intermediate_steps(
        [(action, json.dumps(body, ensure_ascii=False))],
    )
    assert sql == "SELECT 1"
    assert tab == {"columns": ["region"], "rows": [["华东"]]}
    assert terr is None


def test_coerce_run_select_payload_strips_markdown_fence():
    inner = '{"columns": ["r"], "rows": [["华东"]]}'
    wrapped = "```json\n" + inner + "\n```"
    tab = _coerce_run_select_payload(wrapped)
    assert tab == {"columns": ["r"], "rows": [["华东"]]}


def test_coerce_double_encoded_json_string():
    inner = json.dumps({"columns": ["a"], "rows": [[1]]})
    blob = json.dumps(inner)
    assert _coerce_run_select_payload(blob) == {"columns": ["a"], "rows": [[1]]}


def test_normalize_tool_sql_nested_kwargs():
    assert _normalize_run_select_tool_sql({"kwargs": {"sql": " SELECT 99 "}}) == "SELECT 99"


def test_extract_messages_uses_nested_sql_in_tool_args():
    payload = {"columns": ["z"], "rows": [[1]]}
    messages = [
        AIMessage(content="", tool_calls=[_tc("run_select", {"kwargs": {"sql": "S"}})]),
        ToolMessage(content=json.dumps(payload), name="run_select", tool_call_id="1"),
    ]
    sql, tab, terr = _extract_run_select_truth(messages)
    assert sql == "S"
    assert tab["columns"] == ["z"]
    assert terr is None


def test_extract_from_intermediate_tool_agent_action():
    body = {"columns": ["region"], "rows": [["华东"]]}
    action = ToolAgentAction(
        tool="run_select",
        tool_input={"sql": "SELECT 1"},
        log="",
        message_log=[AIMessage(content="x")],
        tool_call_id="c1",
    )
    sql, tab, terr = _extract_run_select_truth_from_intermediate_steps(
        [(action, json.dumps(body, ensure_ascii=False))],
    )
    assert sql == "SELECT 1"
    assert tab == body
    assert terr is None
