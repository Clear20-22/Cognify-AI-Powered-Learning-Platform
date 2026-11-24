"""
Authentication Schemas - Request/Response Models (Pydantic V2)
"""

from typing import Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from app.core.security import validate_password_strength
from app.models.user import UserRole, SELF_REGISTER_ROLES


class SignUpRequest(BaseModel):
    """Schema for user sign-up request."""

    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., max_length=128, description="User password (min 8 chars, upper, lower, digit)")
    fullName: str = Field(..., min_length=1, max_length=100, description="User full name")
    role: UserRole = Field(default=UserRole.STUDENT, description="Account role: student or teacher")

    @field_validator("password")
    @classmethod
    def check_password(cls, value: str) -> str:
        return validate_password_strength(value)

    @field_validator("fullName")
    @classmethod
    def check_full_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Full name is required")
        return value

    @field_validator("role")
    @classmethod
    def check_role(cls, value: UserRole) -> UserRole:
        if value not in SELF_REGISTER_ROLES:
            raise ValueError("Role must be 'student' or 'teacher'")
        return value

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "student@example.com",
                "password": "SecurePass123",
                "fullName": "John Doe",
                "role": "student"
            }
        }
    )


class SignInRequest(BaseModel):
    """Schema for user sign-in request."""

    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., max_length=128, description="User password")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "student@example.com",
                "password": "SecurePass123"
            }
        }
    )


class TokenResponse(BaseModel):
    """Schema for JWT token response."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user_id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    full_name: str = Field(..., description="User full name")
    role: UserRole = Field(default=UserRole.STUDENT, description="User role")
    created_at: Optional[str] = Field(None, description="Account creation timestamp (ISO 8601)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user_id": "user_abc123",
                "email": "student@example.com",
                "full_name": "John Doe",
                "role": "student",
                "created_at": "2026-11-24T09:52:54"
            }
        }
    )


class CurrentUserResponse(BaseModel):
    """Schema for the authenticated user's own profile."""

    user_id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    full_name: str = Field(..., description="User full name")
    role: UserRole = Field(..., description="User role")
    is_active: bool = Field(..., description="Account active status")
    created_at: Optional[str] = Field(None, description="Account creation timestamp (ISO 8601)")


class ProfileUpdateRequest(BaseModel):
    """Schema for updating the authenticated user's own profile (FR-AUTH-10)."""

    full_name: Optional[str] = Field(None, min_length=1, max_length=100, description="New full name")

    @field_validator("full_name")
    @classmethod
    def check_full_name(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("Full name cannot be empty")
        return value


class ChangePasswordRequest(BaseModel):
    """Schema for changing password after confirming the current one (FR-AUTH-10)."""

    current_password: str = Field(..., max_length=128, description="Current password")
    new_password: str = Field(..., max_length=128, description="New password")

    @field_validator("new_password")
    @classmethod
    def check_new_password(cls, value: str) -> str:
        return validate_password_strength(value)
