"""Authentication adapters for the live subsystem (FR-RT-01..07)."""

import asyncio
import json
from urllib.parse import urlsplit

from fastapi import HTTPException, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.api import deps
from app.core.config import get_settings


require_live_teacher = deps.require_role("teacher")
require_live_member = deps.require_role("teacher", "student")


async def read_message(websocket: WebSocket, timeout: float = 30) -> dict:
    """Bound application messages and reject malformed/non-object JSON."""
    event = await asyncio.wait_for(websocket.receive(), timeout=timeout)
    if event["type"] == "websocket.disconnect":
        raise WebSocketDisconnect(event.get("code", 1000))
    raw = event.get("text")
    if not isinstance(raw, str):
        raise ValueError("Send text JSON messages, not binary frames.")
    if len(raw.encode("utf-8")) > 16384:
        raise ValueError("Messages must be at most 16 KB.")
    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, RecursionError) as exc:
        raise ValueError("Send a valid JSON object.") from exc
    if not isinstance(payload, dict):
        raise ValueError("Send a JSON object.")
    if not isinstance(payload.get("type"), str):
        raise ValueError("A message must have a string type.")
    return payload


async def resolve_socket_user(websocket: WebSocket, token: str) -> dict:
    """Verify JWT and reload trusted identity/role; never accept client user IDs."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM],
            options={"require_exp": True, "require_sub": True},
        )
        user_id = payload.get("sub")
        if not isinstance(user_id, str) or not user_id:
            raise ValueError("Missing token subject.")
    except (JWTError, ValueError, TypeError) as exc:
        raise HTTPException(401, "Your session expired. Please sign in again.") from exc
    user = await websocket.app.state.data_store.get_user(user_id)
    if not user:
        raise HTTPException(401, "Please sign in again.")
    user = await deps.get_current_active_user(dict(user))
    role = user["role"]
    if role not in {"teacher", "student"}:
        raise HTTPException(403, "A teacher or student role is required.")
    return {**user, "id": user_id}


async def authenticate_socket(websocket: WebSocket) -> tuple[dict, str]:
    """Authenticate in the first frame so credentials stay out of URL logs."""
    origin = websocket.headers.get("origin")
    allowed = get_settings().CORS_ORIGINS
    if origin and origin not in allowed:
        parsed = urlsplit(origin)
        if parsed.scheme not in {"http", "https"} or parsed.netloc != websocket.headers.get("host"):
            raise HTTPException(403, "This origin is not allowed.")
    message = await read_message(websocket, timeout=10)
    token = message.get("token")
    if message.get("type") != "authenticate" or not isinstance(token, str) or not 1 <= len(token) <= 8192:
        raise HTTPException(401, "Authenticate with your access token first.")
    return await resolve_socket_user(websocket, token), token
