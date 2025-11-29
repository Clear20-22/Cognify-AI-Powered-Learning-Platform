"""
API Dependencies - Dependency injection for routes
"""

from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.base import MongoDataStore
from app.services.ai_service import AIService
from app.services.user_service import UserService
from app.services.chat_service import ChatService
from app.services.exam_service import ExamService
from app.services.note_service import NoteService
from app.services.pdf_service import PDFService
from app.services.document_service import DocumentService

settings = get_settings()
security = HTTPBearer(auto_error=False)


def get_data_store(request: Request) -> MongoDataStore:
    """
    Get data store from application state.
    
    This is initialized in the lifespan manager.
    """
    return request.app.state.data_store


def get_ai_service(request: Request) -> AIService:
    """
    Get AI service from application state.
    
    This is initialized in the lifespan manager.
    """
    return request.app.state.ai_service


def get_user_service(
    data_store: MongoDataStore = Depends(get_data_store)
) -> UserService:
    """Get user service instance."""
    return UserService(data_store)


def get_chat_service(
    data_store: MongoDataStore = Depends(get_data_store),
    ai_service: AIService = Depends(get_ai_service)
) -> ChatService:
    """Get chat service instance."""
    return ChatService(data_store, ai_service)


def get_exam_service(
    data_store: MongoDataStore = Depends(get_data_store),
    ai_service: AIService = Depends(get_ai_service)
) -> ExamService:
    """Get exam service instance."""
    return ExamService(data_store, ai_service)


def get_note_service(
    data_store: MongoDataStore = Depends(get_data_store)
) -> NoteService:
    """Get note service instance."""
    return NoteService(data_store)


def get_pdf_service() -> PDFService:
    """Get PDF service instance."""
    return PDFService()


def get_document_service(
    data_store: MongoDataStore = Depends(get_data_store)
) -> DocumentService:
    """Get document service instance."""
    return DocumentService(data_store)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    data_store: MongoDataStore = Depends(get_data_store)
) -> Optional[dict]:
    """
    Get current authenticated user from JWT token.
    
    Returns None if no valid token is provided (for optional authentication).
    Raises HTTPException if token is invalid.
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        payload = decode_access_token(token)
        
        if payload is None:
            # Return None for optional auth instead of raising exception
            return None
        
        user_id = payload.get("sub")
        if user_id is None:
            # Return None for optional auth instead of raising exception
            return None
        
        user = await data_store.get_user(user_id)
        if user is None:
            # Return None for optional auth instead of raising exception
            return None
        
        return user
        
    except JWTError:
        # Return None for optional auth instead of raising exception
        return None


async def get_current_active_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Get current active user (requires authentication).
    
    This dependency requires a valid JWT token.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not current_user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return current_user
