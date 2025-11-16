"""
Chat Routes - Chat and messaging endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
import logging
from typing import List
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatCreateRequest,
    ChatCreateResponse,
    ChatDetailResponse,
    MessageResponse
)
from app.services.chat_service import ChatService
from app.api.deps import get_chat_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Send a message and get an AI response.
    
    This is the main chat endpoint for conversational learning.
    """
    try:
        if not request.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )
        
        logger.info(f"💬 Processing chat message: {request.message[:50]}...")
        
        result = await chat_service.send_message(
            message=request.message,
            user_id=request.user_id,
            context=request.context
        )
        
        return ChatResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat: {str(e)}"
        )


@router.post("/chats", response_model=ChatCreateResponse)
async def create_chat(
    request: ChatCreateRequest,
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Create a new chat conversation with AI-generated content.
    
    This generates an educational conversation on a specific topic.
    """
    try:
        logger.info(f"📝 Creating chat: {request.topic} ({request.difficulty})")
        
        result = await chat_service.create_chat(
            user_id=request.user_id,
            topic=request.topic,
            difficulty=request.difficulty
        )
        
        chat = result["chat"]
        
        # Convert messages to response format
        messages = [MessageResponse(**msg) for msg in chat.get("messages", [])]
        
        return ChatCreateResponse(
            success=True,
            chat_id=result["chat_id"],
            topic=chat["topic"],
            difficulty=chat["difficulty"],
            messages=messages,
            message="Chat created successfully"
        )
        
    except Exception as e:
        logger.error(f"Create chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create chat: {str(e)}"
        )


@router.get("/chats/{chat_id}", response_model=ChatDetailResponse)
async def get_chat(
    chat_id: str,
    chat_service: ChatService = Depends(get_chat_service)
):
    """Get a specific chat by ID."""
    chat = await chat_service.get_chat(chat_id)
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Convert messages to response format
    messages = [MessageResponse(**msg) for msg in chat.get("messages", [])]
    
    return ChatDetailResponse(
        id=chat.get("id", chat_id),
        user_id=chat["user_id"],
        topic=chat["topic"],
        difficulty=chat["difficulty"],
        messages=messages,
        created_at=chat["created_at"]
    )


@router.get("/users/{user_id}/chats")
async def get_user_chats(
    user_id: str,
    chat_service: ChatService = Depends(get_chat_service)
):
    """Get all chats for a specific user."""
    chats = await chat_service.get_user_chats(user_id)
    
    return {
        "user_id": user_id,
        "total": len(chats),
        "chats": chats
    }
