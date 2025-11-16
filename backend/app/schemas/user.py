"""
User Schemas - Request/Response Models
"""

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr


class UserCreate(BaseModel):
    """Schema for creating a new user."""
    
    email: EmailStr = Field(..., description="User email")
    name: Optional[str] = Field(None, description="User name")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "student@example.com",
                "name": "John Doe"
            }
        }


class UserUpdate(BaseModel):
    """Schema for updating user information."""
    
    full_name: Optional[str] = Field(None, description="Updated full name")
    preferences: Optional[Dict[str, Any]] = Field(None, description="Updated preferences")
    
    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "Jane Doe",
                "preferences": {
                    "difficulty": "advanced",
                    "theme": "light"
                }
            }
        }


class UserResponse(BaseModel):
    """Schema for user response."""
    
    id: str = Field(..., description="User ID")
    email: EmailStr = Field(..., description="User email")
    full_name: str = Field(..., description="User full name")
    created_at: datetime = Field(..., description="Account creation timestamp")
    is_active: bool = Field(..., description="Account active status")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="User preferences")
    learning_stats: Dict[str, Any] = Field(default_factory=dict, description="Learning statistics")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "user_abc123",
                "email": "student@example.com",
                "full_name": "John Doe",
                "created_at": "2024-01-15T10:30:00",
                "is_active": True,
                "preferences": {
                    "difficulty": "intermediate",
                    "theme": "dark"
                },
                "learning_stats": {
                    "chats_completed": 10,
                    "exams_taken": 5,
                    "avg_score": 85.5
                }
            }
        }
