"""
Authentication Schemas - Request/Response Models
"""

from pydantic import BaseModel, Field, EmailStr


class SignUpRequest(BaseModel):
    """Schema for user sign-up request."""
    
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., min_length=6, description="User password (min 6 characters)")
    fullName: str = Field(..., description="User full name")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "student@example.com",
                "password": "securePassword123",
                "fullName": "John Doe"
            }
        }


class SignInRequest(BaseModel):
    """Schema for user sign-in request."""
    
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., description="User password")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "student@example.com",
                "password": "securePassword123"
            }
        }


class TokenResponse(BaseModel):
    """Schema for JWT token response."""
    
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user_id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    full_name: str = Field(..., description="User full name")
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user_id": "user_abc123",
                "email": "student@example.com",
                "full_name": "John Doe"
            }
        }
