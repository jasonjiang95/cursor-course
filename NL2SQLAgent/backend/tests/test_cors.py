"""CORS：允许的来源应返回 Access-Control-Allow-Origin。"""


def test_health_includes_allow_origin_for_configured_frontend(client):
    response = client.get(
        "/health",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
