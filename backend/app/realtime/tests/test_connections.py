"""Fan-out, private delivery and bounded replay for FR-RT-03/05/07."""

import asyncio
from time import monotonic

import pytest

from app.realtime.connections import LiveConnectionManager, NotificationBroker, _Connection
from app.realtime.models import LiveQuizError


class FakeSocket:
    def __init__(self, fail=False, delay=0):
        self.messages = []
        self.closed = []
        self.fail = fail
        self.delay = delay

    async def send_json(self, message):
        if self.delay:
            await asyncio.sleep(self.delay)
        if self.fail:
            raise OSError("Peer disconnected")
        self.messages.append(message)

    async def close(self, code=1000):
        self.closed.append(code)


def test_socket_timeout_also_bounds_wait_for_a_previous_send():
    async def scenario():
        socket = FakeSocket()
        connection = _Connection(socket)
        await connection.lock.acquire()
        try:
            started = monotonic()
            with pytest.raises(asyncio.TimeoutError):
                await asyncio.wait_for(connection.send({"type": "ping"}, 0.01), 0.5)
            assert monotonic() - started < 0.3
            assert socket.messages == []
        finally:
            connection.lock.release()
        await connection.send({"type": "pong"}, 0.1)
        assert socket.messages == [{"type": "pong"}]

    asyncio.run(scenario())


def test_broadcast_is_personalized_and_slow_peer_does_not_block_healthy_peer():
    async def scenario():
        manager = LiveConnectionManager(send_timeout=0.02)
        slow, healthy = FakeSocket(delay=10), FakeSocket()
        await manager.add("ABC123", "slow-user", slow)
        await manager.add("ABC123", "student-1", healthy)
        started = monotonic()
        await manager.broadcast_state("ABC123", lambda user_id: {"for_user": user_id})
        assert monotonic() - started < 0.5
        assert healthy.messages == [{"type": "state", "session": {"for_user": "student-1"}}]
        assert slow.closed
        await manager.broadcast_state("ABC123", lambda user_id: {"for_user": user_id})
        assert len(healthy.messages) == 2

    asyncio.run(scenario())


def test_notifications_are_sent_only_to_server_selected_recipients():
    async def scenario():
        broker = NotificationBroker()
        target, other = FakeSocket(), FakeSocket()
        await broker.subscribe("student-1", target)
        await broker.subscribe("student-2", other)
        notification = await broker.publish(
            ["student-1", "student-1"], "marks_released", "Marks released", "Your assignment has been graded."
        )
        assert target.messages == [{"type": "notification", "notification": notification}]
        assert other.messages == []
        assert broker.recent("student-1") == [notification]
        assert broker.recent("student-2") == []

    asyncio.run(scenario())


def test_notifications_replay_bounded_history_on_reconnect():
    async def scenario():
        broker = NotificationBroker(history_size=2)
        for index in range(3):
            await broker.publish(["student-1"], "quiz_published", f"Quiz {index}", "A quiz is available.")
        socket = FakeSocket()
        await broker.subscribe("student-1", socket)
        assert [item["notification"]["title"] for item in socket.messages] == ["Quiz 1", "Quiz 2"]
        assert len({item["notification"]["id"] for item in socket.messages}) == 2

    asyncio.run(scenario())


def test_failed_notification_peer_does_not_prevent_other_delivery():
    async def scenario():
        broker = NotificationBroker()
        broken, healthy = FakeSocket(fail=True), FakeSocket()
        await broker.subscribe("student-1", broken)
        await broker.subscribe("student-2", healthy)
        await broker.publish(["student-1", "student-2"], "assignment_created", "New assignment", "Submit by tomorrow.")
        assert len(healthy.messages) == 1
        assert broken.closed

    asyncio.run(scenario())


@pytest.mark.parametrize("event", ["untrusted_event", "", None])
def test_unknown_notification_event_is_rejected(event):
    async def scenario():
        with pytest.raises(LiveQuizError):
            await NotificationBroker().publish(["student-1"], event, "Title", "Message")

    asyncio.run(scenario())
