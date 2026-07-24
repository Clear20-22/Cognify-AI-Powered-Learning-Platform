"""
Note Schemas - Request/Response Models (Pydantic V2)
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class NoteCreateRequest(BaseModel):
    """Schema for creating a new note."""
    
    user_id: str = Field(..., description="User ID")
    content: str = Field(..., description="Note content", min_length=1)
    title: Optional[str] = Field(None, description="Note title")
    chat_id: Optional[str] = Field(None, description="Associated chat ID")
    pdf_name: Optional[str] = Field(None, description="Associated PDF document name")
    tags: Optional[List[str]] = Field(default_factory=list, description="Tags for organizing notes")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "user_abc123",
                "content": "# Machine Learning Notes\n\nSupervised learning involves...",
                "title": "ML Introduction",
                "chat_id": "chat_xyz789",
                "pdf_name": "ml_fundamentals.pdf",
                "tags": ["machine-learning", "ai", "supervised-learning"]
            }
        }
    )


class NoteUpdateRequest(BaseModel):
    """Schema for updating an existing note."""
    
    content: Optional[str] = Field(None, description="Updated note content")
    title: Optional[str] = Field(None, description="Updated note title")
    tags: Optional[List[str]] = Field(None, description="Updated tags")
    is_favorite: Optional[bool] = Field(None, description="Updated favorite status")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "content": "# Updated ML Notes\n\nAdditional information...",
                "title": "ML Introduction (Updated)",
                "tags": ["machine-learning", "ai", "deep-learning"],
                "is_favorite": True
            }
        }
    )


class NoteResponse(BaseModel):
    """Schema for note response."""
    
    id: str = Field(..., description="Note ID")
    user_id: str = Field(..., description="Owner user ID")
    content: str = Field(..., description="Note content")
    title: Optional[str] = Field(None, description="Note title")
    chat_id: Optional[str] = Field(None, description="Associated chat ID")
    pdf_name: Optional[str] = Field(None, description="Associated PDF name")
    tags: List[str] = Field(default_factory=list, description="Note tags")
    is_favorite: bool = Field(default=False, description="Favorite status")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "note_xyz123",
                "user_id": "user_abc123",
                "content": "# Machine Learning Notes\n\nSupervised learning involves...",
                "title": "ML Introduction",
                "chat_id": "chat_xyz789",
                "pdf_name": "ml_fundamentals.pdf",
                "tags": ["machine-learning", "ai", "supervised-learning"],
                "is_favorite": False,
                "created_at": "2024-01-15T10:30:00",
                "updated_at": None
            }
        }
    )


class NoteListResponse(BaseModel):
    """Schema for list of notes response."""
    
    user_id: str = Field(..., description="User ID")
    total: int = Field(..., description="Total number of notes")
    notes: List[NoteResponse] = Field(..., description="List of notes")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "user_abc123",
                "total": 2,
                "notes": [
                    {
                        "id": "note_xyz123",
                        "user_id": "user_abc123",
                        "content": "# ML Notes",
                        "title": "ML Introduction",
                        "tags": ["machine-learning"],
                        "is_favorite": False,
                        "created_at": "2024-01-15T10:30:00"
                    }
                ]
            }
        }
    )
