import uuid

from app.schemas.chat import VizPayload
from app.services.agent_runner import AgentRunner, ChatTurnResult


def test_list_sessions_empty(client):
    r = client.get("/api/v1/sessions")
    assert r.status_code == 200
    assert r.json() == {"sessions": []}


def test_create_patch_delete_session(client):
    r = client.post("/api/v1/sessions", json={"title": "  t1  "})
    assert r.status_code == 200
    body = r.json()
    sid = body["id"]
    assert uuid.UUID(sid)
    assert body["title"] == "  t1  "

    r2 = client.get("/api/v1/sessions")
    assert len(r2.json()["sessions"]) == 1

    r3 = client.patch(f"/api/v1/sessions/{sid}", json={"title": "新标题"})
    assert r3.status_code == 200
    assert r3.json()["title"] == "新标题"

    r4 = client.patch(f"/api/v1/sessions/{uuid.uuid4()}", json={"title": "x"})
    assert r4.status_code == 404
    assert r4.json()["detail"] == "会话不存在"

    r5 = client.delete(f"/api/v1/sessions/{sid}")
    assert r5.status_code == 204
    assert client.get("/api/v1/sessions").json()["sessions"] == []


def test_messages_404(client):
    r = client.get(f"/api/v1/sessions/{uuid.uuid4()}/messages")
    assert r.status_code == 404


def test_chat_mock_agent(client, monkeypatch):
    def _fake_run_turn(_self, _prior, inp: str) -> ChatTurnResult:
        assert inp == "你好"
        return ChatTurnResult(
            assistant_text="演示回复",
            sql="SELECT 1 AS a",
            viz_payload=VizPayload(
                kind="echarts",
                chartType="table",
                xKey="a",
                yKey="a",
                rows=[{"a": 1}],
            ),
            error=None,
        )

    monkeypatch.setattr(AgentRunner, "run_turn", _fake_run_turn)

    sid = client.post("/api/v1/sessions", json={}).json()["id"]
    r = client.post(
        f"/api/v1/sessions/{sid}/chat",
        json={"content": "你好"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["user_message"]["role"] == "user"
    assert data["user_message"]["content"] == "你好"
    assert data["assistant_message"]["role"] == "assistant"
    assert data["assistant_message"]["content"] == "演示回复"
    assert data["assistant_message"]["sql"] == "SELECT 1 AS a"
    assert data["assistant_message"]["viz_payload"]["chartType"] == "table"

    rm = client.get(f"/api/v1/sessions/{sid}/messages")
    assert rm.status_code == 200
    msgs = rm.json()["messages"]
    assert len(msgs) == 2
    assert msgs[1]["sql"] == "SELECT 1 AS a"
