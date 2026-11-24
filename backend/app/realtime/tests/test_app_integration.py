"""Exercise Masum's routes through the real app, without database startup."""

from contextlib import asynccontextmanager
from importlib import import_module
from time import perf_counter

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.realtime.service import LiveQuizService


@pytest.fixture
def live_app(monkeypatch):
    app = import_module("main").app
    users = {
        "host": {"id": "host", "full_name": "Masum", "role": "teacher", "is_active": True},
        "other-host": {"id": "other-host", "full_name": "Other Teacher", "role": "teacher", "is_active": True},
        "student": {"id": "student", "full_name": "Student", "role": "student", "is_active": True},
        "other-student": {"id": "other-student", "full_name": "Other Student", "role": "student", "is_active": True},
    }

    class UserStore:
        async def get_user(self, user_id):
            user = users.get(user_id)
            return dict(user) if user else None

    @asynccontextmanager
    async def no_startup(_app):
        yield

    service = LiveQuizService()
    monkeypatch.setattr(app.router, "lifespan_context", no_startup)
    monkeypatch.setattr(app.state, "data_store", UserStore(), raising=False)
    monkeypatch.setattr(app.state, "live_quiz_service", service, raising=False)
    tokens = {key: create_access_token({"sub": key}) for key in users}
    with TestClient(app) as client:
        yield client, tokens, service


def _headers(tokens, user="host"):
    return {"Authorization": f"Bearer {tokens[user]}"}


def _create_room(client, tokens, quiz_payload):
    response = client.post("/api/live/sessions", headers=_headers(tokens), json=quiz_payload)
    assert response.status_code == 201, response.text
    return response.json()["room_code"]


def _authenticate(socket, token):
    socket.send_json({"type": "authenticate", "token": token})
    return socket.receive_json()


def test_actual_app_registers_live_rest_routes_and_enforces_ownership(live_app, quiz_payload):
    client, tokens, _ = live_app
    assert client.post("/api/live/sessions", json=quiz_payload).status_code == 401
    assert client.post(
        "/api/live/sessions", headers=_headers(tokens, "student"), json=quiz_payload
    ).status_code == 403
    code = _create_room(client, tokens, quiz_payload)
    path = f"/api/live/sessions/{code}"
    assert client.get(path, headers=_headers(tokens)).json()["status"] == "waiting"
    assert client.get(path, headers=_headers(tokens, "student")).status_code == 403
    for command in ("advance", "end"):
        assert client.post(
            f"{path}/{command}", headers=_headers(tokens, "other-host")
        ).status_code == 403
    assert client.get(path, headers=_headers(tokens)).json()["status"] == "waiting"
    assert client.post(f"{path}/end", headers=_headers(tokens)).json()["status"] == "finished"


def test_actual_app_pushes_questions_scores_once_and_restores_reconnected_student(live_app, quiz_payload):
    client, tokens, _ = live_app
    code = _create_room(client, tokens, quiz_payload)
    with client.websocket_connect(f"/ws/live/{code}") as host:
        assert _authenticate(host, tokens["host"])["session"]["is_host"] is True
        with client.websocket_connect(f"/ws/live/{code}") as student:
            assert _authenticate(student, tokens["student"])["session"]["participant_count"] == 1
            host.receive_json()  # Joining broadcasts the new participant to the teacher.
            started = perf_counter()
            host.send_json({"type": "advance"})
            assert host.receive_json()["session"]["status"] == "active"
            active = student.receive_json()["session"]
            assert perf_counter() - started < 1
            assert "correct_answer" not in active["question"]
            question_id = active["question"]["id"]
            answered_at = perf_counter()
            student.send_json({"type": "answer", "question_id": question_id, "answer": 1})
            assert host.receive_json()["session"]["leaderboard"][0]["score"] == 1000
            assert student.receive_json()["session"]["submitted_answer"] == 1
            assert student.receive_json()["type"] == "answer_accepted"
            assert perf_counter() - answered_at < 1
            student.send_json({"type": "answer", "question_id": question_id, "answer": 0})
            assert student.receive_json()["code"] == "already_answered"
        with client.websocket_connect(f"/ws/live/{code}") as reconnected:
            restored = _authenticate(reconnected, tokens["student"])["session"]
            assert restored["submitted_answer"] == 1
            assert restored["leaderboard"][0]["score"] == 1000
            assert restored["participant_count"] == 1
            host.receive_json()
            host.send_json({"type": "end"})
            assert host.receive_json()["session"]["status"] == "finished"
            assert reconnected.receive_json()["session"]["status"] == "finished"


def test_actual_app_notification_stream_is_private_replays_and_rejects_client_publish(live_app):
    client, tokens, service = live_app
    with client.websocket_connect("/ws/notifications") as stream:
        assert _authenticate(stream, tokens["student"]) == {"type": "notifications", "notifications": []}
        for event in ("quiz_published", "assignment_created", "marks_released"):
            notification = client.portal.call(
                service.notifications.publish, ["student"], event, "Course update", "An update is available."
            )
            assert stream.receive_json() == {"type": "notification", "notification": notification}
        assert service.notifications.recent("other-student") == []
    with client.websocket_connect("/ws/notifications") as reconnected:
        reconnected.send_json({"type": "authenticate", "token": tokens["student"]})
        replayed = [reconnected.receive_json()["notification"] for _ in range(3)]
        assert [item["event"] for item in replayed] == ["quiz_published", "assignment_created", "marks_released"]
        assert reconnected.receive_json()["type"] == "notifications"
        reconnected.send_json({"type": "publish", "recipient_ids": ["other-student"], "event": "marks_released"})
        assert reconnected.receive_json()["code"] == "read_only_stream"
