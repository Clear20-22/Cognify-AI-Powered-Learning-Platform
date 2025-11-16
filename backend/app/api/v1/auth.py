"""
Authentication Routes - Sign up and sign in endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
import logging
from app.schemas.auth import SignUpRequest, SignInRequest, TokenResponse
from app.services.user_service import UserService
from app.api.deps import get_user_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth")


@router.post("/signup", response_model=TokenResponse)
async def sign_up(
    request: SignUpRequest,
    user_service: UserService = Depends(get_user_service)
):
    """
    Sign up a new user with email and password.
    
    Creates a user account and returns authentication token.
    """
    try:
        result = await user_service.create_user(
            email=request.email,
            password=request.password,
            full_name=request.fullName
        )
        
        user = result["user"]
        
        return TokenResponse(
            access_token=result["access_token"],
            token_type=result["token_type"],
            user_id=user["id"],
            email=user["email"],
            full_name=user.get("full_name", user.get("name", ""))
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Sign up error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create account: {str(e)}"
        )


@router.post("/signin", response_model=TokenResponse)
async def sign_in(
    request: SignInRequest,
    user_service: UserService = Depends(get_user_service)
):
    """
    Sign in with email and password.
    
    Returns authentication token for authenticated user.
    """
    try:
        result = await user_service.authenticate_user(
            email=request.email,
            password=request.password
        )
        
        user = result["user"]
        
        return TokenResponse(
            access_token=result["access_token"],
            token_type=result["token_type"],
            user_id=user["id"],
            email=user["email"],
            full_name=user.get("full_name", user.get("name", ""))
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
            detail=f"Failed to sign in: {str(e)}"
        )
