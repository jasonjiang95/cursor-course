from typing import Any, Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


class SessionSummary(BaseModel):
    id: str
    title: str = ""
    created_at: str
    updated_at: str


class CreateSessionBody(BaseModel):
    title: str | None = None


class PatchSessionBody(BaseModel):
    title: str


class VizPayload(BaseModel):
    kind: Literal["echarts"] = "echarts"
    chartType: Literal["bar", "line", "pie", "table"]
    title: str | None = None
    seriesName: str | None = None
    xKey: str
    yKey: str
    rows: list[dict[str, Any]] = Field(default_factory=list)


class ChatMessage(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: str
    sql: str | None = None
    viz_payload: VizPayload | None = None
    error: str | None = None


class SessionsListResponse(BaseModel):
    sessions: list[SessionSummary]


class MessagesListResponse(BaseModel):
    messages: list[ChatMessage]


class ChatRequestBody(BaseModel):
    content: str = Field(min_length=1)


class ChatRoundResponse(BaseModel):
    user_message: ChatMessage
    assistant_message: ChatMessage
