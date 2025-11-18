"""
Chat Schemas - Request/Response Models
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Schema for sending a chat message."""
    
    message: str = Field(..., description="User message", min_length=1)
    user_id: Optional[str] = Field(None, description="User ID for context")
    context: Optional[str] = Field(None, description="Additional context")
    chat_id: Optional[str] = Field(None, description="Chat ID to continue existing conversation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Explain quantum entanglement in simple terms",
                "user_id": "user_abc123",
                "context": "Previous topic: quantum mechanics basics",
                "chat_id": "chat_xyz789"
            }
        }


class ChatResponse(BaseModel):
    """Schema for chat message response."""
    
    response: str = Field(..., description="AI response")
    timestamp: str = Field(..., description="Response timestamp")
    user_id: Optional[str] = None
    chat_id: Optional[str] = Field(None, description="Chat ID for this conversation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "response": "Quantum entanglement is a phenomenon where...",
                "timestamp": "2024-01-15T10:30:05.123Z",
                "user_id": "user_abc123",
                "chat_id": "chat_xyz789"
            }
        }


class ChatCreateRequest(BaseModel):
    """Schema for creating a new chat conversation."""
    
    user_id: str = Field(..., description="User ID")
    topic: str = Field(..., description="Chat topic", min_length=1)
    difficulty: str = Field(default="intermediate", description="Difficulty level: beginner, intermediate, advanced")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_abc123",
                "topic": "Machine Learning Basics",
                "difficulty": "intermediate"
            }
        }


class MessageResponse(BaseModel):
    """Schema for individual message in chat."""
    
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    
    class Config:
        json_schema_extra = {
            "example": {
                "role": "user",
                "content": "What is supervised learning?"
            }
        }


class ChatCreateResponse(BaseModel):
    """Schema for chat creation response."""
    
    success: bool = Field(..., description="Whether chat was created successfully")
    chat_id: str = Field(..., description="Unique chat identifier")
    topic: str = Field(..., description="Chat topic")
    difficulty: str = Field(..., description="Difficulty level")
    messages: List[MessageResponse] = Field(..., description="Initial AI-generated messages")
    message: str = Field(..., description="Success message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "chat_id": "chat_xyz789",
                "topic": "Machine Learning Basics",
                "difficulty": "intermediate",
                "messages": [
                    {
                        "role": "user",
                        "content": "What is supervised learning?"
                    },
                    {
                        "role": "assistant",
                        "content": "Supervised learning is a type of machine learning..."
                    }
                ],
                "message": "Chat created successfully"
            }
        }


class ChatDetailResponse(BaseModel):
    """Schema for detailed chat information."""
    
    id: str = Field(..., description="Chat ID")
    user_id: str = Field(..., description="Owner user ID")
    topic: str = Field(..., description="Chat topic")
    difficulty: str = Field(..., description="Difficulty level")
    messages: List[MessageResponse] = Field(..., description="Chat message history")
    created_at: str = Field(..., description="Chat creation timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "chat_xyz789",
                "user_id": "user_abc123",
                "topic": "Machine Learning Basics",
                "difficulty": "intermediate",
                "messages": [
                    {
                        "role": "user",
                        "content": "What is supervised learning?"
                    }
                ],
                "created_at": "2024-01-15T10:30:00"
            }
        }
