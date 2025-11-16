"""
User Routes - User management endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
import logging
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import UserService
from app.api.deps import get_user_service
from app.core.utils import generate_uuid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users")


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_user(
    request: UserCreate,
    user_service: UserService = Depends(get_user_service)
):
    """Create a new user profile (without password)."""
    try:
        # For simple user creation without authentication
        # Generate a random password (user would need to reset it)
        temp_password = f"temp_{generate_uuid()}"
        user_name = request.name or request.email.split('@')[0]
        
        result = await user_service.create_user(
            email=request.email,
            password=temp_password,
            full_name=user_name
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
            detail=f"Failed to create user: {str(e)}"
        )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    user_service: UserService = Depends(get_user_service)
):
    """Get user profile by ID."""
    user = await user_service.get_user(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(**user)
