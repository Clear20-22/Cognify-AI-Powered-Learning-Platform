"""Server-authoritative live quiz state and scoring (FR-RT-01..06)."""

import asyncio
import re
import secrets
import string
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Callable
from uuid import uuid4

from .connections import LiveConnectionManager, NotificationBroker
from .models import LiveQuizError, LiveSessionCreate


@dataclass
class _Participant:
    user_id: str
    name: str
    score: int = 0
    answers: dict[str, int] = field(default_factory=dict)


@dataclass
class _Room:
    room_code: str
    host_id: str
    title: str
    questions: list
    created_at: datetime
    expires_at: datetime
    status: str = "waiting"
    question_index: int = -1
    question_started_at: datetime | None = None
    participants: dict[str, _Participant] = field(default_factory=dict)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class LiveQuizService:
    """Process-local repository and domain service.

    Each room serializes both mutations and broadcasts with one lock. Scores
    survive a socket reconnect, but do not survive a backend restart. Deploy
    with one worker until the team supplies a shared repository/pub-sub adapter.
    """

    def __init__(self, clock: Callable[[], datetime] | None = None, max_rooms=100,
                 max_participants=500, room_ttl_seconds=21600,
                 finished_ttl_seconds=3600, connections=None, notifications=None):
        if min(max_rooms, max_participants, room_ttl_seconds, finished_ttl_seconds) < 1:
            raise ValueError("Live quiz capacity and expiry limits must be positive")
        self.clock = clock or (lambda: datetime.now(timezone.utc))
        self.max_rooms = max_rooms
        self.max_participants = max_participants
        self.room_ttl_seconds = room_ttl_seconds
        self.finished_ttl_seconds = finished_ttl_seconds
        self.connections = connections or LiveConnectionManager()
        self.notifications = notifications or NotificationBroker()
        self._rooms: dict[str, _Room] = {}
        self._rooms_lock = asyncio.Lock()

    def _now(self):
        now = self.clock()
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        return now

    @staticmethod
    def normalize_code(code: str):
        if not isinstance(code, str) or not re.fullmatch(r"[A-Z0-9]{6}", code.strip().upper()):
            raise LiveQuizError(400, "invalid_room_code", "Enter a 6-character room code")
        return code.strip().upper()

    @staticmethod
    def _identity(user):
        if not isinstance(user, dict) or not isinstance(user.get("id"), str) or not user["id"]:
            raise LiveQuizError(401, "unauthenticated", "Sign in to use live quizzes")
        if user.get("is_active", True) is False:
            raise LiveQuizError(403, "inactive_user", "This account is inactive")
        role = getattr(user.get("role"), "value", user.get("role"))
        role = str(role or "").lower()
        if role not in {"student", "teacher", "admin"}:
            raise LiveQuizError(403, "role_required", "An assigned account role is required")
        return user["id"], role

    async def cleanup(self):
        """Remove expired rooms; also called on room creation and lookup."""
        now = self._now()
        async with self._rooms_lock:
            candidates = [room for room in self._rooms.values() if now >= room.expires_at]
        expired_count = 0
        for room in candidates:
            async with room.lock:
                async with self._rooms_lock:
                    if self._rooms.get(room.room_code) is not room or self._now() < room.expires_at:
                        continue
                    self._rooms.pop(room.room_code, None)
                await self.connections.close_room(room.room_code)
                expired_count += 1
        return expired_count

    async def _room(self, code):
        code = self.normalize_code(code)
        async with self._rooms_lock:
            room = self._rooms.get(code)
            if room is None:
                raise LiveQuizError(404, "room_not_found", "This live quiz room does not exist")
        if self._now() >= room.expires_at:
            await self.cleanup()
            raise LiveQuizError(410, "room_expired", "This live quiz room has expired")
        return room

    def _check_alive(self, room):
        if self._rooms.get(room.room_code) is not room or self._now() >= room.expires_at:
            raise LiveQuizError(410, "room_expired", "This live quiz room has expired")

    def _host(self, room, user):
        user_id, role = self._identity(user)
        if role != "teacher" or user_id != room.host_id:
            raise LiveQuizError(403, "host_required", "Only this room's teacher can control the session")
        return user_id

    @staticmethod
    def _question(room):
        if room.status != "active":
            return None
        return room.questions[room.question_index]

    def _snapshot(self, room, user_id):
        question = self._question(room)
        public_question = None
        if question:
            public_question = {
                "id": question["id"],
                "question": question["question"],
                "options": list(question["options"]),
                "time_limit_seconds": question["time_limit_seconds"],
                "started_at": room.question_started_at.isoformat(),
                "deadline": (room.question_started_at + timedelta(seconds=question["time_limit_seconds"])).isoformat(),
            }
        ranked = sorted(room.participants.values(), key=lambda participant: (-participant.score, participant.name.casefold(), participant.user_id))
        leaderboard = [{"rank": rank, "user_id": participant.user_id, "name": participant.name,
                        "score": participant.score, "answered_count": len(participant.answers)}
                       for rank, participant in enumerate(ranked, start=1)]
        participant = room.participants.get(user_id)
        return {
            "room_code": room.room_code,
            "title": room.title,
            "status": room.status,
            "question_index": room.question_index,
            "question_count": len(room.questions),
            "question": public_question,
            "leaderboard": leaderboard,
            "participant_count": len(room.participants),
            "answered_count": sum(question["id"] in item.answers for item in ranked) if question else 0,
            "is_host": user_id == room.host_id,
            "submitted_answer": participant.answers.get(question["id"]) if participant and question else None,
            "notifications": [],
        }

    async def _broadcast(self, room):
        state = self._snapshot(room, room.host_id)
        question = self._question(room)

        def snapshot_for(user_id):
            participant = room.participants.get(user_id)
            return {**state,
                    "is_host": user_id == room.host_id,
                    "submitted_answer": participant.answers.get(question["id"]) if participant and question else None}

        await self.connections.broadcast_state(room.room_code, snapshot_for)

    def _join(self, room, user):
        user_id, role = self._identity(user)
        if user_id == room.host_id and role == "teacher":
            return user_id
        if role != "student":
            raise LiveQuizError(403, "student_required", "Only students can join a live quiz")
        if user_id in room.participants:
            return user_id
        if room.status == "finished":
            raise LiveQuizError(409, "room_closed", "This live quiz has already ended")
        if len(room.participants) >= self.max_participants:
            raise LiveQuizError(409, "room_full", "This live quiz room is full")
        name = str(user.get("full_name") or user.get("name") or "Student").strip()[:100] or "Student"
        room.participants[user_id] = _Participant(user_id=user_id, name=name)
        return user_id

    async def create_session(self, host: dict, payload):
        host_id, role = self._identity(host)
        if role != "teacher":
            raise LiveQuizError(403, "teacher_required", "Only teachers can create live quizzes")
        if not isinstance(payload, LiveSessionCreate):
            payload = LiveSessionCreate.model_validate(payload)
        await self.cleanup()
        async with self._rooms_lock:
            if len(self._rooms) >= self.max_rooms:
                raise LiveQuizError(503, "room_capacity", "Live quiz capacity reached; try again later")
            alphabet = string.ascii_uppercase + string.digits
            for _ in range(100):
                code = "".join(secrets.choice(alphabet) for _ in range(6))
                if code not in self._rooms:
                    break
            else:
                raise LiveQuizError(503, "room_capacity", "Unable to allocate a room code; try again")
            now = self._now()
            questions = [{**question.model_dump(), "id": uuid4().hex} for question in payload.questions]
            room = _Room(code, host_id, payload.title, questions, now,
                         now + timedelta(seconds=self.room_ttl_seconds))
            self._rooms[code] = room
        return self._snapshot(room, host_id)

    async def join_session(self, code: str, user: dict):
        self._identity(user)
        room = await self._room(code)
        async with room.lock:
            self._check_alive(room)
            user_id = self._join(room, user)
            await self._broadcast(room)
            return self._snapshot(room, user_id)

    async def connect(self, code: str, user: dict, websocket):
        self._identity(user)
        room = await self._room(code)
        async with room.lock:
            self._check_alive(room)
            user_id = self._join(room, user)
            await self.connections.add(room.room_code, user_id, websocket)
            await self._broadcast(room)
            return self._snapshot(room, user_id)

    async def disconnect(self, code: str, user_id: str, websocket):
        self.connections.remove(self.normalize_code(code), user_id, websocket)

    async def snapshot(self, code: str, user: dict):
        user_id, _ = self._identity(user)
        room = await self._room(code)
        async with room.lock:
            self._check_alive(room)
            if user_id != room.host_id and user_id not in room.participants:
                raise LiveQuizError(403, "membership_required", "Join this live quiz before viewing its state")
            return self._snapshot(room, user_id)

    async def advance(self, code: str, user: dict):
        room = await self._room(code)
        async with room.lock:
            self._check_alive(room)
            user_id = self._host(room, user)
            if room.status == "finished":
                raise LiveQuizError(409, "room_closed", "This live quiz has already ended")
            room.question_index += 1
            if room.question_index >= len(room.questions):
                room.status = "finished"
                room.question_index = len(room.questions) - 1
                room.expires_at = min(room.expires_at, self._now() + timedelta(seconds=self.finished_ttl_seconds))
            else:
                room.status = "active"
                room.question_started_at = self._now()
            await self._broadcast(room)
            return self._snapshot(room, user_id)

    async def answer(self, code: str, user: dict, question_id: str, answer: int):
        user_id, role = self._identity(user)
        if role != "student":
            raise LiveQuizError(403, "student_required", "Only students can submit answers")
        room = await self._room(code)
        async with room.lock:
            self._check_alive(room)
            participant = room.participants.get(user_id)
            if participant is None:
                raise LiveQuizError(403, "membership_required", "Join this live quiz before answering")
            question = self._question(room)
            if question is None:
                raise LiveQuizError(409, "no_active_question", "There is no active question")
            if question_id != question["id"]:
                raise LiveQuizError(409, "stale_question", "The teacher has advanced to a different question")
            if question_id in participant.answers:
                raise LiveQuizError(409, "already_answered", "You already answered this question")
            deadline = room.question_started_at + timedelta(seconds=question["time_limit_seconds"])
            if self._now() >= deadline:
                raise LiveQuizError(409, "question_expired", "The answer time has expired")
            if isinstance(answer, bool) or not isinstance(answer, int) or not 0 <= answer < len(question["options"]):
                raise LiveQuizError(400, "invalid_answer", "Choose an existing answer option")
            participant.answers[question_id] = answer
            if answer == question["correct_answer"]:
                participant.score += 1000
            await self._broadcast(room)
            return {"type": "answer_accepted", "question_id": question_id, "answer": answer}

    async def end(self, code: str, user: dict):
        room = await self._room(code)
        async with room.lock:
            self._check_alive(room)
            user_id = self._host(room, user)
            room.status = "finished"
            room.expires_at = min(room.expires_at, self._now() + timedelta(seconds=self.finished_ttl_seconds))
            await self._broadcast(room)
            return self._snapshot(room, user_id)
