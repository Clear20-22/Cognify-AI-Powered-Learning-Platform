"""Behavior and concurrency checks for the FR-RT live quiz service."""

import asyncio
import json
import re
from datetime import datetime, timedelta, timezone

import pytest

from app.realtime.service import LiveQuizError, LiveQuizService


def test_room_codes_are_unique_and_six_characters(teacher, quiz_payload):
    async def scenario():
        service = LiveQuizService()
        rooms = [await service.create_session(teacher, quiz_payload) for _ in range(20)]
        codes = [room["room_code"] for room in rooms]
        assert len(set(codes)) == len(codes)
        assert all(re.fullmatch(r"[A-Z0-9]{6}", code) for code in codes)
        assert all(room["status"] == "waiting" for room in rooms)
        assert all(room["question"] is None for room in rooms)

    asyncio.run(scenario())


def test_invalid_room_and_closed_room_reject_new_students(teacher, student, quiz_payload):
    async def scenario():
        service = LiveQuizService()
        with pytest.raises(LiveQuizError) as missing:
            await service.join_session("ZZZZZZ", student)
        assert missing.value.status_code == 404
        created = await service.create_session(teacher, quiz_payload)
        await service.end(created["room_code"], teacher)
        with pytest.raises(LiveQuizError) as closed:
            await service.join_session(created["room_code"], student)
        assert closed.value.status_code in {400, 409, 410}

    asyncio.run(scenario())


def test_only_owner_can_advance_or_end(teacher, student, quiz_payload):
    async def scenario():
        service = LiveQuizService()
        room = await service.create_session(teacher, quiz_payload)
        other_teacher = {**teacher, "id": "teacher-2"}
        for user in (student, other_teacher):
            with pytest.raises(LiveQuizError) as advance:
                await service.advance(room["room_code"], user)
            assert advance.value.status_code == 403
            with pytest.raises(LiveQuizError) as end:
                await service.end(room["room_code"], user)
            assert end.value.status_code == 403
        state = await service.snapshot(room["room_code"], teacher)
        assert state["status"] == "waiting"

    asyncio.run(scenario())


def test_students_only_see_current_question_without_solution(teacher, student, quiz_payload):
    async def scenario():
        service = LiveQuizService()
        room = await service.create_session(teacher, quiz_payload)
        code = room["room_code"]
        await service.join_session(code, student)
        await service.advance(code, teacher)
        state = await service.snapshot(code, student)
        assert state["question"]["question"] == quiz_payload["questions"][0]["question"]
        assert state["question"]["options"] == quiz_payload["questions"][0]["options"]
        assert "correct_answer" not in json.dumps(state)
        assert quiz_payload["questions"][1]["question"] not in json.dumps(state)
        assert state["is_host"] is False
        assert (await service.snapshot(code, teacher))["is_host"] is True

    asyncio.run(scenario())


def test_concurrent_duplicate_answers_score_exactly_once(teacher, student, quiz_payload):
    async def scenario():
        service = LiveQuizService()
        room = await service.create_session(teacher, quiz_payload)
        code = room["room_code"]
        await service.join_session(code, student)
        await service.advance(code, teacher)
        question_id = (await service.snapshot(code, student))["question"]["id"]
        results = await asyncio.gather(
            *(service.answer(code, student, question_id, 1) for _ in range(12)),
            return_exceptions=True,
        )
        assert sum(not isinstance(result, Exception) for result in results) == 1
        assert all(isinstance(result, LiveQuizError) for result in results if isinstance(result, Exception))
        state = await service.snapshot(code, student)
        assert state["submitted_answer"] == 1
        assert state["answered_count"] == 1
        assert state["leaderboard"][0]["score"] == 1000
        assert state["leaderboard"][0]["answered_count"] == 1

    asyncio.run(scenario())


def test_student_cannot_answer_before_joining(teacher, student, quiz_payload):
    async def scenario():
        service = LiveQuizService()
        room = await service.create_session(teacher, quiz_payload)
        code = room["room_code"]
        active = await service.advance(code, teacher)
        with pytest.raises(LiveQuizError) as forbidden:
            await service.answer(code, student, active["question"]["id"], 1)
        assert forbidden.value.status_code == 403
        assert (await service.snapshot(code, teacher))["participant_count"] == 0

    asyncio.run(scenario())


def test_reconnect_preserves_score_and_prevents_second_submission(teacher, student, quiz_payload):
    async def scenario():
        service = LiveQuizService()
        room = await service.create_session(teacher, quiz_payload)
        code = room["room_code"]
        await service.join_session(code, student)
        await service.advance(code, teacher)
        question_id = (await service.snapshot(code, student))["question"]["id"]
        await service.answer(code, student, question_id, 1)
        reconnect = await service.join_session(code, {**student, "full_name": "Renamed Student"})
        assert reconnect["participant_count"] == 1
        assert reconnect["submitted_answer"] == 1
        assert reconnect["leaderboard"][0]["score"] == 1000
        with pytest.raises(LiveQuizError):
            await service.answer(code, student, question_id, 0)

    asyncio.run(scenario())


def test_answer_must_target_current_question_and_valid_option(teacher, student, quiz_payload):
    async def scenario():
        service = LiveQuizService()
        room = await service.create_session(teacher, quiz_payload)
        code = room["room_code"]
        await service.join_session(code, student)
        active = await service.advance(code, teacher)
        current_id = active["question"]["id"]
        for question_id, choice in (("spoofed-question", 1), (current_id, -1), (current_id, 3)):
            with pytest.raises(LiveQuizError):
                await service.answer(code, student, question_id, choice)
        state = await service.snapshot(code, student)
        assert state["submitted_answer"] is None
        assert state["leaderboard"][0]["score"] == 0
        await service.advance(code, teacher)
        with pytest.raises(LiveQuizError):
            await service.answer(code, student, current_id, 1)

    asyncio.run(scenario())


def test_wrong_answer_counts_without_awarding_points(teacher, student, quiz_payload):
    async def scenario():
        service = LiveQuizService()
        room = await service.create_session(teacher, quiz_payload)
        code = room["room_code"]
        await service.join_session(code, student)
        active = await service.advance(code, teacher)
        await service.answer(code, student, active["question"]["id"], 0)
        state = await service.snapshot(code, student)
        assert state["leaderboard"][0]["score"] == 0
        assert state["leaderboard"][0]["answered_count"] == 1
        assert state["answered_count"] == 1

    asyncio.run(scenario())


def test_student_state_never_exposes_another_students_answer(teacher, student, quiz_payload):
    async def scenario():
        service = LiveQuizService()
        room = await service.create_session(teacher, quiz_payload)
        code = room["room_code"]
        second = {**student, "id": "student-2", "full_name": "Student Two"}
        await service.join_session(code, student)
        await service.join_session(code, second)
        active = await service.advance(code, teacher)
        await service.answer(code, student, active["question"]["id"], 1)
        state = await service.snapshot(code, second)
        assert state["submitted_answer"] is None
        assert all("answer" not in entry for entry in state["leaderboard"])
        assert state["leaderboard"][0]["user_id"] == student["id"]

    asyncio.run(scenario())


def test_advancing_past_last_question_finishes_and_rejects_answers(teacher, student, quiz_payload):
    async def scenario():
        service = LiveQuizService()
        room = await service.create_session(teacher, quiz_payload)
        code = room["room_code"]
        await service.join_session(code, student)
        await service.advance(code, teacher)
        last = await service.advance(code, teacher)
        await service.advance(code, teacher)
        final = await service.snapshot(code, student)
        assert final["status"] == "finished"
        assert final["question"] is None
        with pytest.raises(LiveQuizError):
            await service.answer(code, student, last["question"]["id"], 0)

    asyncio.run(scenario())


def test_deadline_uses_server_clock_and_rejects_answer_at_expiry(teacher, student, quiz_payload):
    async def scenario():
        now = datetime(2026, 11, 24, tzinfo=timezone.utc)
        service = LiveQuizService(clock=lambda: now)
        room = await service.create_session(teacher, quiz_payload)
        code = room["room_code"]
        await service.join_session(code, student)
        active = await service.advance(code, teacher)
        assert datetime.fromisoformat(active["question"]["deadline"]) == now + timedelta(seconds=30)
        now += timedelta(seconds=30)
        with pytest.raises(LiveQuizError) as expired:
            await service.answer(code, student, active["question"]["id"], 1)
        assert expired.value.code == "question_expired"
        assert (await service.snapshot(code, student))["submitted_answer"] is None

    asyncio.run(scenario())


def test_room_expiry_frees_capacity_without_losing_active_rooms(teacher, student, quiz_payload):
    async def scenario():
        now = datetime(2026, 11, 24, tzinfo=timezone.utc)
        service = LiveQuizService(clock=lambda: now, max_rooms=1, room_ttl_seconds=60)
        room = await service.create_session(teacher, quiz_payload)
        with pytest.raises(LiveQuizError) as capacity:
            await service.create_session(teacher, quiz_payload)
        assert capacity.value.status_code == 503
        now += timedelta(seconds=60)
        with pytest.raises(LiveQuizError) as expired:
            await service.join_session(room["room_code"], student)
        assert expired.value.status_code == 410
        replacement = await service.create_session(teacher, quiz_payload)
        assert replacement["status"] == "waiting"

    asyncio.run(scenario())


def test_room_capacity_allows_existing_student_to_reconnect(teacher, student, quiz_payload):
    async def scenario():
        service = LiveQuizService(max_participants=1)
        room = await service.create_session(teacher, quiz_payload)
        code = room["room_code"]
        await service.join_session(code, student)
        with pytest.raises(LiveQuizError) as full:
            await service.join_session(code, {**student, "id": "student-2"})
        assert full.value.code == "room_full"
        assert (await service.join_session(code, student))["participant_count"] == 1

    asyncio.run(scenario())


@pytest.mark.parametrize("user", [None, {"id": "legacy-user"}, {"id": "inactive", "role": "teacher", "is_active": False}])
def test_unauthenticated_unassigned_and_inactive_users_cannot_create(user, quiz_payload):
    async def scenario():
        with pytest.raises(LiveQuizError) as rejected:
            await LiveQuizService().create_session(user, quiz_payload)
        assert rejected.value.status_code in {401, 403}

    asyncio.run(scenario())
