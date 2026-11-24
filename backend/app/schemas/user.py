"""
User Schemas - Request/Response Models
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, field_validator
from app.core.security import reject_mongo_operators
from app.models.user import UserRole


class UserCreate(BaseModel):
    """Schema for creating a new user."""

    email: EmailStr = Field(..., description="User email")
    name: Optional[str] = Field(None, max_length=100, description="User name")
    role: UserRole = Field(default=UserRole.STUDENT, description="Role for the new account")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "student@example.com",
                "name": "John Doe",
                "role": "student"
            }
        }


class UserUpdate(BaseModel):
    """Schema for updating user information."""

    full_name: Optional[str] = Field(None, max_length=100, description="Updated full name")
    preferences: Optional[Dict[str, Any]] = Field(None, description="Updated preferences")

    @field_validator("preferences")
    @classmethod
    def check_preferences(cls, value: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        return reject_mongo_operators(value)

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
    role: UserRole = Field(default=UserRole.STUDENT, description="User role")
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


class UserSummary(BaseModel):
    """Compact user entry for the admin user list."""

    id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    full_name: str = Field(..., description="User full name")
    role: UserRole = Field(default=UserRole.STUDENT, description="User role")
    is_active: bool = Field(default=True, description="Account active status")
    created_at: Optional[str] = Field(None, description="Account creation timestamp")


class UserListResponse(BaseModel):
    """Schema for the admin user list (FR-AUTH-09)."""

    users: List[UserSummary] = Field(..., description="Users")
    total: int = Field(..., description="Number of users returned")


class UserStatusUpdate(BaseModel):
    """Schema for deactivating or reactivating an account (FR-AUTH-09)."""

    is_active: bool = Field(..., description="True to reactivate, False to deactivate")


class UserRoleUpdate(BaseModel):
    """Schema for an admin changing a user's role."""

    role: UserRole = Field(..., description="New role")
