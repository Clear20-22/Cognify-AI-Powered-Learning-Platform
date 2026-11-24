"""Live quiz HTTP and WebSocket adapters, owned by Masum (FR-RT-01..07)."""

import asyncio
from collections import deque
from time import monotonic

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from starlette.requests import HTTPConnection

from app.realtime.auth import (
    authenticate_socket, read_message, require_live_member, require_live_teacher,
    resolve_socket_user,
)
from app.realtime.models import LiveAnswerRequest, LiveSessionCreate
from app.realtime.service import LiveQuizError, LiveQuizService

router = APIRouter(prefix="/live", tags=["Live Quiz"])
ws_router = APIRouter(tags=["Live Quiz WebSockets"])


def get_live_service(connection: HTTPConnection) -> LiveQuizService:
    """Keep one process-local engine on each app, shared by HTTP and WS routes."""
    if not hasattr(connection.app.state, "live_quiz_service"):
        connection.app.state.live_quiz_service = LiveQuizService()
    return connection.app.state.live_quiz_service


async def _http_result(operation):
    try:
        return await operation
    except LiveQuizError as exc:
        raise HTTPException(exc.status_code, detail={"code": exc.code, "message": exc.message}) from exc


@router.post("/sessions", status_code=201)
async def create_session(payload: LiveSessionCreate, request: Request,
                         user: dict = Depends(require_live_teacher)):
    return await _http_result(get_live_service(request).create_session(user, payload))


@router.get("/sessions/{room_code}")
async def session_state(room_code: str, request: Request,
                        user: dict = Depends(require_live_member)):
    return await _http_result(get_live_service(request).snapshot(room_code, user))


@router.post("/sessions/{room_code}/advance")
async def advance_session(room_code: str, request: Request,
                          user: dict = Depends(require_live_teacher)):
    return await _http_result(get_live_service(request).advance(room_code, user))


@router.post("/sessions/{room_code}/end")
async def end_session(room_code: str, request: Request,
                      user: dict = Depends(require_live_teacher)):
    return await _http_result(get_live_service(request).end(room_code, user))


async def _error(service, websocket, code: str, message: str, notification=False):
    sender = service.notifications if notification else service.connections
    await sender.send(websocket, {"type": "error", "code": code, "message": message})


@ws_router.websocket("/ws/live/{room_code}")
async def live_socket(websocket: WebSocket, room_code: str):
    await websocket.accept()
    service = get_live_service(websocket)
    user = None
    connected = False
    messages = deque()
    try:
        user, token = await authenticate_socket(websocket)
        await service.connect(room_code, user, websocket)
        connected = True
        while True:
            try:
                message = await read_message(websocket)
            except asyncio.TimeoutError:
                user = await resolve_socket_user(websocket, token)
                await service.snapshot(room_code, user)
                await service.connections.send(websocket, {"type": "ping"})
                continue
            user = await resolve_socket_user(websocket, token)
            now = monotonic()
            while messages and messages[0] < now - 10:
                messages.popleft()
            if len(messages) >= 40:
                await _error(service, websocket, "rate_limited", "Too many messages. Wait a moment.")
                await websocket.close(code=1008)
                break
            messages.append(now)
            try:
                kind = message.get("type")
                if kind in {"ping", "pong"}:
                    if kind == "ping":
                        await service.connections.send(websocket, {"type": "pong"})
                elif kind == "answer":
                    answer = LiveAnswerRequest.model_validate({
                        key: value for key, value in message.items() if key != "type"
                    })
                    await service.answer(room_code, user, answer.question_id, answer.answer)
                    await service.connections.send(websocket, {
                        "type": "answer_accepted", "question_id": answer.question_id,
                        "answer": answer.answer,
                    })
                elif kind == "advance":
                    await service.advance(room_code, user)
                elif kind == "end":
                    await service.end(room_code, user)
                else:
                    await _error(service, websocket, "unknown_message", "Unknown live quiz command.")
            except LiveQuizError as exc:
                await _error(service, websocket, exc.code, exc.message)
            except ValidationError:
                await _error(service, websocket, "invalid_answer", "Select an answer for the current question.")
    except (WebSocketDisconnect, RuntimeError, OSError):
        pass
    except (HTTPException, LiveQuizError) as exc:
        code = getattr(exc, "code", "authentication_required")
        message = getattr(exc, "message", getattr(exc, "detail", "Access denied."))
        try:
            await _error(service, websocket, code, str(message))
            await websocket.close(code=4401 if getattr(exc, "status_code", 403) == 401 else 4403)
        except (RuntimeError, OSError, asyncio.TimeoutError, WebSocketDisconnect):
            pass
    except (ValueError, asyncio.TimeoutError):
        try:
            await _error(service, websocket, "invalid_message", "Send a valid message and authenticate within 10 seconds.")
            await websocket.close(code=1008)
        except (RuntimeError, OSError, asyncio.TimeoutError, WebSocketDisconnect):
            pass
    finally:
        if connected:
            await service.disconnect(room_code, user["id"], websocket)


@ws_router.websocket("/ws/notifications")
async def notification_socket(websocket: WebSocket):
    """Private notification stream; publishing is a trusted service-layer API."""
    await websocket.accept()
    service = get_live_service(websocket)
    user = None
    subscribed = False
    try:
        user, token = await authenticate_socket(websocket)
        await service.notifications.subscribe(user["id"], websocket)
        subscribed = True
        await service.notifications.send(websocket, {
            "type": "notifications", "notifications": service.notifications.recent(user["id"]),
        })
        while True:
            try:
                message = await read_message(websocket)
            except asyncio.TimeoutError:
                message = {"type": "ping"}
            await resolve_socket_user(websocket, token)
            if message.get("type") == "ping":
                await service.notifications.send(websocket, {"type": "pong"})
            elif message.get("type") != "pong":
                await _error(service, websocket, "read_only_stream", "Notifications are published by the server.", notification=True)
                await websocket.close(code=1008)
                break
    except (WebSocketDisconnect, RuntimeError, OSError):
        pass
    except (HTTPException, LiveQuizError, ValueError, asyncio.TimeoutError) as exc:
        try:
            await _error(service, websocket, "access_denied", str(getattr(exc, "detail", "Access denied.")), notification=True)
            await websocket.close(code=4401 if getattr(exc, "status_code", 403) == 401 else 4403)
        except (RuntimeError, OSError, asyncio.TimeoutError, WebSocketDisconnect):
            pass
    finally:
        if subscribed:
            service.notifications.unsubscribe(user["id"], websocket)
