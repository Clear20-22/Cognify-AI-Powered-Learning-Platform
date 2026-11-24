"""Bounded, process-local WebSocket fan-out and targeted notifications."""

import asyncio
from collections import OrderedDict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable
from uuid import uuid4

from .models import LiveQuizError


@dataclass
class _Connection:
    websocket: Any
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def send(self, message: dict, timeout: float):
        async def deliver():
            async with self.lock:
                await self.websocket.send_json(message)

        await asyncio.wait_for(deliver(), timeout)


async def _close(websocket, code=1013):
    try:
        await asyncio.wait_for(websocket.close(code=code), 0.1)
    except Exception:
        pass


class LiveConnectionManager:
    """At most four live connections per authenticated user per room."""

    def __init__(self, send_timeout: float = 0.5):
        self.send_timeout = send_timeout
        self._rooms: dict[str, dict[str, dict[int, _Connection]]] = {}
        self._sockets: dict[int, _Connection] = {}

    async def add(self, room_code: str, user_id: str, websocket):
        room = self._rooms.setdefault(room_code, {})
        user_connections = room.setdefault(user_id, {})
        if id(websocket) in user_connections:
            return
        previous = None
        if len(user_connections) >= 4:
            oldest_id = next(iter(user_connections))
            previous = user_connections.pop(oldest_id)
            self._sockets.pop(oldest_id, None)
        connection = _Connection(websocket)
        user_connections[id(websocket)] = connection
        self._sockets[id(websocket)] = connection
        if previous:
            await _close(previous.websocket, code=4001)

    async def send(self, websocket, payload: dict):
        """Serialize endpoint replies with state broadcasts on the same socket."""
        connection = self._sockets.get(id(websocket)) or _Connection(websocket)
        await connection.send(payload, self.send_timeout)

    def remove(self, room_code: str, user_id: str, websocket):
        room = self._rooms.get(room_code)
        if not room:
            return
        user_connections = room.get(user_id, {})
        connection = user_connections.get(id(websocket))
        if connection and connection.websocket is websocket:
            user_connections.pop(id(websocket), None)
            self._sockets.pop(id(websocket), None)
        if not user_connections:
            room.pop(user_id, None)
        if not room:
            self._rooms.pop(room_code, None)

    async def broadcast_state(self, room_code: str, snapshot_for: Callable[[str], dict]):
        """Send concurrently so a slow peer cannot delay every other participant."""
        connections = [(user_id, connection)
                       for user_id, user_connections in self._rooms.get(room_code, {}).items()
                       for connection in user_connections.values()]

        async def send(user_id, connection):
            try:
                await connection.send({"type": "state", "session": snapshot_for(user_id)}, self.send_timeout)
            except Exception:
                self.remove(room_code, user_id, connection.websocket)
                await _close(connection.websocket)

        await asyncio.gather(*(send(user_id, connection) for user_id, connection in connections))

    async def close_room(self, room_code: str):
        connections = [connection for user_connections in self._rooms.pop(room_code, {}).values()
                       for connection in user_connections.values()]
        for connection in connections:
            self._sockets.pop(id(connection.websocket), None)
        await asyncio.gather(*(_close(connection.websocket, code=4004) for connection in connections))


class NotificationBroker:
    """Server-published, user-targeted events with bounded reconnect replay.

    Integrating services must derive recipient IDs from their own authorization
    rules before calling publish. There is intentionally no client publish API.
    This broker, like live rooms, requires a single backend process.
    """

    EVENTS = frozenset({"quiz_published", "assignment_created", "marks_released"})

    def __init__(self, max_users=5000, history_size=50, send_timeout=0.5):
        if max_users < 1 or history_size < 1:
            raise ValueError("Notification limits must be positive")
        self.max_users = max_users
        self.history_size = history_size
        self.send_timeout = send_timeout
        self._history: OrderedDict[str, deque] = OrderedDict()
        self._connections: dict[str, dict[int, _Connection]] = {}
        self._sockets: dict[int, _Connection] = {}
        self._lock = asyncio.Lock()

    def recent(self, user_id: str):
        return [dict(item) for item in self._history.get(user_id, ())]

    async def subscribe(self, user_id: str, websocket):
        async with self._lock:
            if user_id not in self._connections and len(self._connections) >= self.max_users:
                raise LiveQuizError(503, "notification_capacity", "Notification connections are full; try again later")
            user_connections = self._connections.setdefault(user_id, {})
            if id(websocket) in user_connections:
                return
            previous = None
            if len(user_connections) >= 4:
                oldest_id = next(iter(user_connections))
                previous = user_connections.pop(oldest_id)
                self._sockets.pop(oldest_id, None)
            connection = _Connection(websocket)
            user_connections[id(websocket)] = connection
            self._sockets[id(websocket)] = connection
            if previous:
                await _close(previous.websocket, code=4001)
            try:
                for notification in self.recent(user_id):
                    await connection.send({"type": "notification", "notification": notification}, self.send_timeout)
            except Exception:
                self.unsubscribe(user_id, websocket)
                await _close(websocket)

    def unsubscribe(self, user_id: str, websocket):
        user_connections = self._connections.get(user_id, {})
        connection = user_connections.get(id(websocket))
        if connection and connection.websocket is websocket:
            user_connections.pop(id(websocket), None)
            self._sockets.pop(id(websocket), None)
        if not user_connections:
            self._connections.pop(user_id, None)

    async def send(self, websocket, payload: dict):
        connection = self._sockets.get(id(websocket)) or _Connection(websocket)
        await connection.send(payload, self.send_timeout)

    async def publish(self, recipient_ids, event: str, title: str, message: str, room_code=None):
        if event not in self.EVENTS:
            raise LiveQuizError(400, "invalid_notification", "Unsupported notification event")
        if not isinstance(title, str) or not title.strip() or len(title) > 150:
            raise LiveQuizError(400, "invalid_notification", "Notification title must be 1 to 150 characters")
        if not isinstance(message, str) or not message.strip() or len(message) > 1000:
            raise LiveQuizError(400, "invalid_notification", "Notification message must be 1 to 1000 characters")
        if not isinstance(recipient_ids, (list, tuple, set, frozenset)):
            raise LiveQuizError(400, "invalid_recipients", "Recipient IDs must be a list")
        if len(recipient_ids) > 500 or any(not isinstance(item, str) or not item or len(item) > 200 for item in recipient_ids):
            raise LiveQuizError(400, "invalid_recipients", "Provide at most 500 valid recipient IDs")
        recipients = list(dict.fromkeys(recipient_ids))
        if room_code is not None and (not isinstance(room_code, str) or len(room_code) != 6 or not room_code.isascii() or not room_code.isalnum()):
            raise LiveQuizError(400, "invalid_room_code", "Notification room code must have 6 letters or digits")
        notification = {
            "id": uuid4().hex,
            "event": event,
            "title": title.strip(),
            "message": message.strip(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        if room_code is not None:
            notification["room_code"] = room_code

        async with self._lock:
            for user_id in recipients:
                if user_id not in self._history:
                    if len(self._history) >= self.max_users:
                        self._history.popitem(last=False)
                    self._history[user_id] = deque(maxlen=self.history_size)
                self._history.move_to_end(user_id)
                self._history[user_id].append(dict(notification))

            async def send(user_id, connection):
                try:
                    await connection.send({"type": "notification", "notification": notification}, self.send_timeout)
                except Exception:
                    self.unsubscribe(user_id, connection.websocket)
                    await _close(connection.websocket)

            await asyncio.gather(*(send(user_id, connection) for user_id in recipients
                                   for connection in list(self._connections.get(user_id, {}).values())))
        return dict(notification)
