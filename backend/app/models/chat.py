"""
Chat Domain Models
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class Message(BaseModel):
    """Individual chat message model."""
    
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.now, description="Message timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "role": "user",
                "content": "Explain quantum entanglement",
                "timestamp": "2024-01-15T10:30:00"
            }
        }


class Chat(BaseModel):
    """Chat conversation domain model."""
    
    id: str = Field(..., description="Unique chat identifier")
    user_id: str = Field(..., description="Owner user ID")
    topic: str = Field(..., description="Conversation topic")
    difficulty: str = Field(default="intermediate", description="Difficulty level: beginner, intermediate, advanced")
    messages: List[Message] = Field(default_factory=list, description="Chat message history")
    created_at: datetime = Field(default_factory=datetime.now, description="Chat creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last message timestamp")
    is_active: bool = Field(default=True, description="Chat active status")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional chat metadata")
    
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
                        "content": "What is supervised learning?",
                        "timestamp": "2024-01-15T10:30:00"
                    },
                    {
                        "role": "assistant",
                        "content": "Supervised learning is...",
                        "timestamp": "2024-01-15T10:30:05"
                    }
                ],
                "created_at": "2024-01-15T10:30:00",
                "is_active": True
            }
        }
