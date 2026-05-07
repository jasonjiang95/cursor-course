import asyncio
import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse

from app.api.deps import get_agent_runner, get_session_store, get_settings_dep
from app.core.config import Settings
from app.db.session_store import SessionStore
from app.schemas.chat import (
    ChatMessage,
    ChatRequestBody,
    ChatRoundResponse,
    CreateSessionBody,
    MessagesListResponse,
    PatchSessionBody,
    SessionSummary,
    SessionsListResponse,
)
from app.services.agent_runner import AgentRunner
from app.services.dashscope_generation_stream import iter_generation_text_deltas

router = APIRouter(prefix="/sessions", tags=["sessions"])

# 第二次流式调用（dashscope Generation）：仅负责把 Agent 已得到的结论转为用户可见话术，勿编造数据
_STREAM_PRESENTATION_SYSTEM = (
    "你是数据分析助手。下面会给出「用户问题」以及系统在查询数据库后得到的「内部结论文本」（含事实与数字）。"
    "请用简洁、自然的中文直接回答用户，必须忠实于内部结论中的数据与表述，不得虚构表名、数字或查询结果。"
    "若内部结论为空或说明无法完成，请如实说明。"
)


@router.get("")
def list_sessions(
    store: Annotated[SessionStore, Depends(get_session_store)],
) -> SessionsListResponse:
    rows = store.list_sessions()
    return SessionsListResponse(
        sessions=[
            SessionSummary(
                id=r["id"],
                title=r.get("title") or "",
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            )
            for r in rows
        ]
    )


@router.post("", status_code=status.HTTP_200_OK)
def create_session(
    body: CreateSessionBody,
    store: Annotated[SessionStore, Depends(get_session_store)],
) -> SessionSummary:
    row = store.create_session(body.title)
    return SessionSummary(**row)


@router.patch("/{session_id}")
def patch_session(
    session_id: str,
    body: PatchSessionBody,
    store: Annotated[SessionStore, Depends(get_session_store)],
) -> SessionSummary:
    row = store.patch_session_title(session_id, body.title)
    if not row:
        raise HTTPException(status_code=404, detail="会话不存在")
    return SessionSummary(**row)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    store: Annotated[SessionStore, Depends(get_session_store)],
) -> Response:
    deleted = store.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="会话不存在")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{session_id}/messages")
def list_messages(
    session_id: str,
    store: Annotated[SessionStore, Depends(get_session_store)],
) -> MessagesListResponse:
    if store.get_session(session_id) is None:
        raise HTTPException(status_code=404, detail="会话不存在")
    raw = store.list_messages(session_id)
    return MessagesListResponse(
        messages=[ChatMessage(**{k: r[k] for k in r if k != "session_id"}) for r in raw]
    )


@router.post("/{session_id}/chat")
def post_chat(
    session_id: str,
    body: ChatRequestBody,
    store: Annotated[SessionStore, Depends(get_session_store)],
    runner: Annotated[AgentRunner, Depends(get_agent_runner)],
    settings: Annotated[Settings, Depends(get_settings_dep)],
) -> ChatRoundResponse:
    if store.get_session(session_id) is None:
        raise HTTPException(status_code=404, detail="会话不存在")

    key = (settings.dashscope_api_key or "").strip()
    model = (settings.llm_model or "").strip()
    if not key or not model:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务端未配置 DASHSCOPE_API_KEY 或 LLM_MODEL",
        )

    user_saved = store.append_message(session_id, role="user", content=body.content)
    history = store.list_messages(session_id)[:-1]
    prior_turns = [dict(m) for m in history]

    turn = runner.run_turn(prior_turns, body.content)

    extra: dict = {
        "sql": turn.sql,
        "viz_payload": turn.viz_payload.model_dump() if turn.viz_payload else None,
        "error": turn.error,
    }
    assistant_saved = store.append_message(
        session_id,
        role="assistant",
        content=turn.assistant_text,
        extra=extra,
    )

    return ChatRoundResponse(
        user_message=ChatMessage(**user_saved),
        assistant_message=ChatMessage(**assistant_saved),
    )


def _sse_event(obj: dict[str, Any]) -> bytes:
    """单条 SSE 事件：data 载荷为一行 JSON（避免多行 data 拼接）。"""
    payload = json.dumps(obj, ensure_ascii=False)
    return f"data: {payload}\n\n".encode("utf-8")


def _stream_text_chunks(text: str, *, chunk_size: int = 24):
    if text:
        for i in range(0, len(text), chunk_size):
            yield text[i : i + chunk_size]


@router.post("/{session_id}/chat/stream")
async def post_chat_stream(
    session_id: str,
    body: ChatRequestBody,
    store: Annotated[SessionStore, Depends(get_session_store)],
    runner: Annotated[AgentRunner, Depends(get_agent_runner)],
    settings: Annotated[Settings, Depends(get_settings_dep)],
) -> StreamingResponse:
    """SSE（text/event-stream）：先回传用户消息与 assistant 占位，再分块输出正文，最后回传与 POST /chat 一致的 done。"""

    if store.get_session(session_id) is None:
        raise HTTPException(status_code=404, detail="会话不存在")

    key = (settings.dashscope_api_key or "").strip()
    model = (settings.llm_model or "").strip()
    if not key or not model:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务端未配置 DASHSCOPE_API_KEY 或 LLM_MODEL",
        )

    async def gen():  # noqa: C901
        user_saved = store.append_message(session_id, role="user", content=body.content)
        yield _sse_event(
            {
                "type": "user",
                "message": ChatMessage(**user_saved).model_dump(),
            },
        )
        yield _sse_event({"type": "assistant_start"})
        await asyncio.sleep(0)

        history = store.list_messages(session_id)[:-1]
        prior_turns = [dict(m) for m in history]

        try:
            turn = await asyncio.to_thread(runner.run_turn, prior_turns, body.content)
        except Exception as e:  # noqa: BLE001
            err_txt = str(e)[:800]
            yield _sse_event({"type": "error", "message": err_txt})
            return

        assistant_visible = (turn.assistant_text or "").strip()
        stream_messages: list[dict[str, str]] = [
            {"role": "system", "content": _STREAM_PRESENTATION_SYSTEM},
            {
                "role": "user",
                "content": f"【用户问题】\n{body.content}\n\n【内部结论文本】\n{assistant_visible or '（无）'}",
            },
        ]

        streamed_parts: list[str] = []
        use_generation = settings.chat_stream_dashscope_generation

        if use_generation:
            try:
                for piece in iter_generation_text_deltas(
                    api_key=key,
                    model=model,
                    messages=stream_messages,
                    base_http_api_url=settings.dashscope_base_http_api_url,
                    incremental_output=True,
                ):
                    streamed_parts.append(piece)
                    yield _sse_event({"type": "delta", "text": piece})
                    await asyncio.sleep(0)
            except Exception:  # noqa: BLE001
                streamed_parts = []
                for piece in _stream_text_chunks(turn.assistant_text):
                    yield _sse_event({"type": "delta", "text": piece})
                    await asyncio.sleep(0)
        else:
            for piece in _stream_text_chunks(turn.assistant_text):
                yield _sse_event({"type": "delta", "text": piece})
                await asyncio.sleep(0)

        final_text = ("".join(streamed_parts).strip() if streamed_parts else "") or assistant_visible

        extra: dict = {
            "sql": turn.sql,
            "viz_payload": turn.viz_payload.model_dump() if turn.viz_payload else None,
            "error": turn.error,
        }
        assistant_saved = store.append_message(
            session_id,
            role="assistant",
            content=final_text if final_text else (turn.assistant_text or "（无文本回复）"),
            extra=extra,
        )
        round_payload = ChatRoundResponse(
            user_message=ChatMessage(**user_saved),
            assistant_message=ChatMessage(**assistant_saved),
        )
        yield _sse_event(
            {
                "type": "done",
                "user_message": round_payload.user_message.model_dump(),
                "assistant_message": round_payload.assistant_message.model_dump(),
            },
        )

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
