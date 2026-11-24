"""Real JWT HTTP/WebSocket authorization and malformed-frame regressions."""

from datetime import timedelta
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.api.v1.live import router, ws_router
from app.core.security import create_access_token


@pytest.fixture
def transport(teacher, student):
    users = {user["id"]: dict(user) for user in (teacher, student)}

    class Store:
        async def get_user(self, user_id):
            user = users.get(user_id)
            return dict(user) if user else None

    app = FastAPI()
    app.include_router(router, prefix="/api")
    app.include_router(ws_router)
    app.state.data_store = Store()
    tokens = {user_id: create_access_token({"sub": user_id}) for user_id in users}
    headers = {user_id: {"Authorization": f"Bearer {token}"} for user_id, token in tokens.items()}
    with TestClient(app) as client:
        yield SimpleNamespace(client=client, users=users, tokens=tokens, headers=headers)


def create_room(transport, teacher, quiz_payload):
    response = transport.client.post("/api/live/sessions", json=quiz_payload,
                                     headers=transport.headers[teacher["id"]])
    assert response.status_code == 201, response.text
    return response.json()["room_code"]


def test_http_routes_use_shared_roles_and_validate_room_codes(transport, teacher, student, quiz_payload):
    client = transport.client
    assert client.post("/api/live/sessions", json=quiz_payload).status_code == 401
    assert client.post("/api/live/sessions", json=quiz_payload,
                       headers=transport.headers[student["id"]]).status_code == 403
    code = create_room(transport, teacher, quiz_payload)
    assert client.get(f"/api/live/sessions/{code}", headers=transport.headers[student["id"]]).status_code == 403
    assert client.get("/api/live/sessions/short", headers=transport.headers[teacher["id"]]).status_code == 400
    assert client.get("/api/live/sessions/ZZZZZZ", headers=transport.headers[teacher["id"]]).status_code == 404
    assert client.post("/api/live/sessions", json={"title": "Quiz", "questions": []},
                       headers=transport.headers[teacher["id"]]).status_code == 422


@pytest.mark.parametrize("message", [
    {"type": []}, {"type": {}}, {"type": None}, {}, ["ping"],
    {"type": "ping", "padding": "x" * 16384},
])
def test_invalid_frames_are_rejected_cleanly(transport, teacher, quiz_payload, message):
    code = create_room(transport, teacher, quiz_payload)
    with transport.client.websocket_connect(f"/ws/live/{code}") as socket:
        socket.send_json({"type": "authenticate", "token": transport.tokens[teacher["id"]]})
        assert socket.receive_json()["type"] == "state"
        socket.send_json(message)
        assert socket.receive_json()["code"] == "invalid_message"
        with pytest.raises(WebSocketDisconnect) as closed:
            socket.receive_json()
        assert closed.value.code == 1008


@pytest.mark.parametrize("denial", ["origin", "expired", "inactive", "admin"])
def test_socket_auth_rejects_untrusted_origin_and_invalid_accounts(transport, teacher, quiz_payload, denial):
    code = create_room(transport, teacher, quiz_payload)
    token = transport.tokens[teacher["id"]]
    headers = {}
    if denial == "origin":
        headers["origin"] = "https://untrusted.example"
    elif denial == "expired":
        token = create_access_token({"sub": teacher["id"]}, expires_delta=timedelta(seconds=-1))
    elif denial == "inactive":
        transport.users[teacher["id"]]["is_active"] = False
    else:
        transport.users[teacher["id"]]["role"] = "admin"
    with transport.client.websocket_connect(f"/ws/live/{code}", headers=headers) as socket:
        socket.send_json({"type": "authenticate", "token": token})
        assert socket.receive_json()["type"] == "error"
        with pytest.raises(WebSocketDisconnect) as closed:
            socket.receive_json()
        assert closed.value.code == (4401 if denial == "expired" else 4403)


def test_student_cannot_control_room_and_deactivation_revokes_socket(transport, teacher, student, quiz_payload):
    code = create_room(transport, teacher, quiz_payload)
    with transport.client.websocket_connect(f"/ws/live/{code}") as socket:
        socket.send_json({"type": "authenticate", "token": transport.tokens[student["id"]]})
        assert socket.receive_json()["session"]["is_host"] is False
        socket.send_json({"type": "advance"})
        assert socket.receive_json()["code"] == "host_required"
        transport.users[student["id"]]["is_active"] = False
        socket.send_json({"type": "ping"})
        assert socket.receive_json()["type"] == "error"
        with pytest.raises(WebSocketDisconnect) as closed:
            socket.receive_json()
        assert closed.value.code == 4403


def test_legacy_student_role_matches_shared_auth_contract(transport, teacher, student, quiz_payload):
    code = create_room(transport, teacher, quiz_payload)
    transport.users[student["id"]].pop("role")
    with transport.client.websocket_connect(f"/ws/live/{code}") as socket:
        socket.send_json({"type": "authenticate", "token": transport.tokens[student["id"]]})
        assert socket.receive_json()["session"]["participant_count"] == 1
