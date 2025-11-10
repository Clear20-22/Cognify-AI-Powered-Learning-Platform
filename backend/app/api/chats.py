from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime
import logging

from ..database import get_supabase_client
from ..schemas.models import (
    Chat, ChatCreate, ChatUpdate, ChatMessageRequest, ChatMessageResponse,
    ChatMessage, ChatData
)
from ..services.content_generator import content_generator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chats", tags=["chats"])


def get_db():
    """Dependency to get database client."""
    return get_supabase_client()


@router.post("/", response_model=Chat)
async def create_chat(chat_data: ChatCreate, db=Depends(get_db)):
    """Create a new chat."""
    try:
        # Generate chat ID
        chat_id = uuid4()
        
        # Convert chat data to dict
        chat_dict = chat_data.model_dump()
        chat_dict["chat_id"] = str(chat_id)
        chat_dict["user_id"] = str(chat_data.user_id)
        
        # Convert chat_data to JSONB format
        if isinstance(chat_dict["chat_data"], dict):
            # Already in the right format
            pass
        else:
            chat_dict["chat_data"] = chat_data.chat_data.model_dump()
        
        # Insert new chat
        response = db.from_("chats").insert(chat_dict).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create chat")
        
        return Chat(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating chat: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create chat: {str(e)}")


@router.post("/generate", response_model=Chat)
async def create_chat_with_generated_content(
    user_id: UUID,
    subject: str,
    difficulty: str = "intermediate",
    db=Depends(get_db)
):
    """Create a new chat with AI-generated educational conversation."""
    try:
        # Generate chat conversation using AI
        chat_data = await content_generator.generate_chat_conversation(
            subject=subject,
            difficulty=difficulty,
            num_messages=6
        )
        
        # Create chat title based on subject
        title = f"{subject} Discussion - {difficulty.title()} Level"
        
        # Create chat in database
        chat_id = uuid4()
        chat_dict = {
            "chat_id": str(chat_id),
            "user_id": str(user_id),
            "title": title,
            "subject": subject,
            "chat_data": chat_data.model_dump()
        }
        
        # Insert new chat
        response = db.from_("chats").insert(chat_dict).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create chat with generated content")
        
        logger.info(f"✅ Created chat with generated content: {title}")
        return Chat(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating chat with generated content: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create chat with generated content: {str(e)}")


@router.get("/{chat_id}", response_model=Chat)
async def get_chat(chat_id: UUID, db=Depends(get_db)):
    """Get chat by ID."""
    try:
        response = db.from_("chats").select("*").eq("chat_id", str(chat_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        return Chat(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chat: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get chat: {str(e)}")


@router.get("/user/{user_id}", response_model=List[Chat])
async def get_user_chats(
    user_id: UUID, 
    limit: int = 50, 
    offset: int = 0, 
    db=Depends(get_db)
):
    """Get all chats for a user."""
    try:
        response = (
            db.from_("chats")
            .select("*")
            .eq("user_id", str(user_id))
            .order("updated_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        
        return [Chat(**chat) for chat in response.data]
        
    except Exception as e:
        logger.error(f"Error getting user chats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user chats: {str(e)}")


@router.put("/{chat_id}", response_model=Chat)
async def update_chat(chat_id: UUID, chat_data: ChatUpdate, db=Depends(get_db)):
    """Update chat."""
    try:
        # Only include non-None fields in update
        update_dict = {}
        if chat_data.title is not None:
            update_dict["title"] = chat_data.title
        if chat_data.subject is not None:
            update_dict["subject"] = chat_data.subject
        if chat_data.chat_data is not None:
            update_dict["chat_data"] = chat_data.chat_data.model_dump()
        
        if not update_dict:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add updated_at timestamp
        update_dict["updated_at"] = "now()"
        
        response = db.from_("chats").update(update_dict).eq("chat_id", str(chat_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        return Chat(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating chat: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update chat: {str(e)}")


@router.delete("/{chat_id}")
async def delete_chat(chat_id: UUID, db=Depends(get_db)):
    """Delete chat."""
    try:
        response = db.from_("chats").delete().eq("chat_id", str(chat_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        return {"message": "Chat deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting chat: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete chat: {str(e)}")


@router.post("/{chat_id}/messages", response_model=ChatMessageResponse)
async def add_message_to_chat(
    chat_id: UUID, 
    message_request: ChatMessageRequest, 
    db=Depends(get_db)
):
    """Add a message to an existing chat and get AI response."""
    try:
        # Get the current chat
        chat_response = db.from_("chats").select("*").eq("chat_id", str(chat_id)).execute()
        
        if not chat_response.data:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        chat = Chat(**chat_response.data[0])
        
        # Create user message
        user_message = ChatMessage(
            id=str(uuid4()),
            from_user="user",
            text=message_request.message,
            timestamp=datetime.now()
        )
        
        # Add user message to chat data
        chat.chat_data.messages.append(user_message)
        
        # Get AI response (you'll need to import your AI service)
        # Import the AI service from the main module
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        from main import ai_service
        ai_response_text = ai_service.get_response(message_request.message)
        
        # Create AI message
        ai_message = ChatMessage(
            id=str(uuid4()),
            from_user="ai",
            text=ai_response_text,
            timestamp=datetime.now()
        )
        
        # Add AI message to chat data
        chat.chat_data.messages.append(ai_message)
        
        # Update chat in database
        update_dict = {
            "chat_data": chat.chat_data.model_dump(),
            "updated_at": "now()"
        }
        
        db.from_("chats").update(update_dict).eq("chat_id", str(chat_id)).execute()
        
        return ChatMessageResponse(
            response=ai_response_text,
            chat_id=chat_id,
            message_id=ai_message.id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding message to chat: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add message: {str(e)}")


@router.get("/{chat_id}/messages")
async def get_chat_messages(chat_id: UUID, db=Depends(get_db)):
    """Get all messages from a chat."""
    try:
        response = db.from_("chats").select("chat_data").eq("chat_id", str(chat_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        chat_data = response.data[0]["chat_data"]
        messages = chat_data.get("messages", [])
        
        return {"messages": messages}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chat messages: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")


@router.post("/quick-chat", response_model=ChatMessageResponse)
async def quick_chat(message_request: ChatMessageRequest, db=Depends(get_db)):
    """Quick chat without creating a persistent chat (for anonymous users)."""
    try:
        # This endpoint can be used for users who don't want to save chat history
        # Import the AI service from the main module
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        from main import ai_service
        ai_response_text = ai_service.get_response(message_request.message)
        
        # Generate temporary IDs for response
        temp_chat_id = uuid4()
        temp_message_id = str(uuid4())
        
        return ChatMessageResponse(
            response=ai_response_text,
            chat_id=temp_chat_id,
            message_id=temp_message_id
        )
        
    except Exception as e:
        logger.error(f"Error in quick chat: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process message: {str(e)}")