"""
Note Domain Model
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class Note(BaseModel):
    """Note domain model for storing learning notes."""
    
    id: str = Field(..., description="Unique note identifier")
    user_id: str = Field(..., description="Owner user ID")
    content: str = Field(..., description="Note content (markdown supported)")
    title: Optional[str] = Field(None, description="Note title")
    chat_id: Optional[str] = Field(None, description="Associated chat ID")
    pdf_name: Optional[str] = Field(None, description="Associated PDF document name")
    tags: List[str] = Field(default_factory=list, description="Tags for organizing notes")
    topic: Optional[str] = Field(None, description="Topic the note belongs to")
    course_id: Optional[str] = Field(None, description="Associated course ID (course module contract)")
    is_favorite: bool = Field(default=False, description="Favorite status")
    created_at: datetime = Field(default_factory=datetime.now, description="Note creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional note metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "note_xyz123",
                "user_id": "user_abc123",
                "content": "# Machine Learning Notes\n\nSupervised learning involves...",
                "title": "ML Introduction",
                "chat_id": "chat_xyz789",
                "pdf_name": "ml_fundamentals.pdf",
                "tags": ["machine-learning", "ai", "supervised-learning"],
                "topic": "Machine Learning",
                "course_id": "course_cse4113",
                "is_favorite": False,
                "created_at": "2024-01-15T10:30:00"
            }
        }
