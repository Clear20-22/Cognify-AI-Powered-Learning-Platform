"""
User Routes - User management endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
import logging
from app.schemas.user import (
    UserCreate,
    UserResponse,
    UserListResponse,
    UserSummary,
    UserStatusUpdate,
    UserRoleUpdate,
)
from app.services.user_service import UserService
from app.api.deps import get_user_service, get_current_active_user, require_role
from app.models.user import UserRole
from app.core.utils import generate_uuid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users")


def _user_id(user: dict) -> str:
    return str(user.get("id") or user.get("_id"))


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_user(
    request: UserCreate,
    admin: dict = Depends(require_role(UserRole.ADMIN)),
    user_service: UserService = Depends(get_user_service)
):
    """Create a new user profile without a known password (admin only)."""
    try:
        # The user would need to reset this random password
        temp_password = f"temp_{generate_uuid()}"
        user_name = request.name or request.email.split('@')[0]

        result = await user_service.create_user(
            email=request.email,
            password=temp_password,
            full_name=user_name,
            role=request.role
        )

        return {
            "success": True,
            "user_id": result["user"]["id"],
            "user": result["user"],
            "message": "User created successfully"
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Create user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )


@router.get("", response_model=UserListResponse)
async def list_users(
    limit: int = Query(100, ge=1, le=500),
    admin: dict = Depends(require_role(UserRole.ADMIN)),
    user_service: UserService = Depends(get_user_service)
):
    """List all users (admin only, FR-AUTH-09)."""
    users = await user_service.list_users(limit)
    summaries = [
        UserSummary(
            id=_user_id(user),
            email=user["email"],
            full_name=user.get("full_name", ""),
            role=user["role"],
            is_active=user.get("is_active", True),
            created_at=user.get("created_at")
        )
        for user in users
    ]
    return UserListResponse(users=summaries, total=len(summaries))


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_active_user),
    user_service: UserService = Depends(get_user_service)
):
    """Get a user profile by ID (the user themselves or an admin)."""
    if _user_id(current_user) != user_id and current_user["role"] != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile"
        )

    user = await user_service.get_user(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(**user)


@router.patch("/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: str,
    request: UserStatusUpdate,
    admin: dict = Depends(require_role(UserRole.ADMIN)),
    user_service: UserService = Depends(get_user_service)
):
    """Deactivate or reactivate an account (admin only, FR-AUTH-09)."""
    if _user_id(admin) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change the status of your own account"
        )

    user = await user_service.set_active(user_id, request.is_active)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return UserResponse(**user)


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    request: UserRoleUpdate,
    admin: dict = Depends(require_role(UserRole.ADMIN)),
    user_service: UserService = Depends(get_user_service)
):
    """Change a user's role (admin only)."""
    if _user_id(admin) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role"
        )

    user = await user_service.set_role(user_id, request.role)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return UserResponse(**user)
