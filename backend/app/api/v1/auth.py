"""
Authentication Routes - Sign up, sign in, and own-account endpoints
"""

from datetime import datetime
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends
import logging
from app.schemas.auth import (
    SignUpRequest,
    SignInRequest,
    TokenResponse,
    CurrentUserResponse,
    ProfileUpdateRequest,
    ChangePasswordRequest,
)
from app.services.user_service import UserService, AccountLockedError, AccountDisabledError
from app.api.deps import get_user_service, get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth")


def _iso(value: Any) -> Optional[str]:
    """Return a stored timestamp as an ISO string (older documents may hold datetimes)."""
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value) if value else None


def _token_response(result: dict) -> TokenResponse:
    """Build the token response from a user service result."""
    user = result["user"]
    return TokenResponse(
        access_token=result["access_token"],
        token_type=result["token_type"],
        user_id=user["id"],
        email=user["email"],
        full_name=user.get("full_name", user.get("name", "")),
        role=user["role"],
        created_at=_iso(user.get("created_at"))
    )


def _current_user_response(user: dict) -> CurrentUserResponse:
    """Build the own-profile response from a user document."""
    return CurrentUserResponse(
        user_id=str(user.get("id") or user.get("_id")),
        email=user["email"],
        full_name=user.get("full_name", user.get("name", "")),
        role=user["role"],
        is_active=user.get("is_active", True),
        created_at=_iso(user.get("created_at"))
    )


@router.post("/signup", response_model=TokenResponse)
async def sign_up(
    request: SignUpRequest,
    user_service: UserService = Depends(get_user_service)
):
    """
    Sign up a new user with email, password, and role (student or teacher).

    Creates a user account and returns authentication token.
    """
    try:
        result = await user_service.create_user(
            email=request.email,
            password=request.password,
            full_name=request.fullName,
            role=request.role
        )
        return _token_response(result)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Sign up error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create account. Please try again."
        )


@router.post("/signin", response_model=TokenResponse)
async def sign_in(
    request: SignInRequest,
    user_service: UserService = Depends(get_user_service)
):
    """
    Sign in with email and password.

    Returns authentication token for authenticated user. After repeated
    failed attempts the account is temporarily locked (HTTP 429).
    """
    try:
        result = await user_service.authenticate_user(
            email=request.email,
            password=request.password
        )
        return _token_response(result)

    except AccountLockedError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e)
        )
    except AccountDisabledError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Sign in error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sign in. Please try again."
        )


@router.get("/me", response_model=CurrentUserResponse)
async def get_me(current_user: dict = Depends(get_current_active_user)):
    """Get the authenticated user's own profile, including role."""
    return _current_user_response(current_user)


@router.patch("/me", response_model=CurrentUserResponse)
async def update_me(
    request: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service)
):
    """Update the authenticated user's own profile name (FR-AUTH-10)."""
    updates = request.model_dump(exclude_none=True)
    if not updates:
        return _current_user_response(current_user)

    user_id = str(current_user.get("id") or current_user.get("_id"))
    user = await user_service.update_user(user_id, updates)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return _current_user_response(user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service)
):
    """Change password after confirming the current password (FR-AUTH-10)."""
    user_id = str(current_user.get("id") or current_user.get("_id"))
    try:
        await user_service.change_password(
            user_id,
            request.current_password,
            request.new_password
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
