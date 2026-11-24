"""
User Domain Model (Pydantic V2)
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class UserRole(str, Enum):
    """User roles used for role-based access control (FR-AUTH-07)."""

    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


# Roles a visitor may choose at sign-up. Admins are never self-registered.
SELF_REGISTER_ROLES = (UserRole.STUDENT, UserRole.TEACHER)


class User(BaseModel):
    """User domain model."""

    id: str = Field(..., description="Unique user identifier")
    email: EmailStr = Field(..., description="User email address")
    full_name: str = Field(..., description="User's full name")
    hashed_password: str = Field(..., description="Bcrypt hashed password")
    role: UserRole = Field(default=UserRole.STUDENT, description="User role for access control")
    created_at: datetime = Field(default_factory=datetime.now, description="Account creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    is_active: bool = Field(default=True, description="Account active status")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="User preferences and settings")
    learning_stats: Dict[str, Any] = Field(default_factory=dict, description="Learning statistics and progress")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "user_abc123",
                "email": "student@example.com",
                "full_name": "John Doe",
                "hashed_password": "$2b$12$...",
                "role": "student",
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
    )
