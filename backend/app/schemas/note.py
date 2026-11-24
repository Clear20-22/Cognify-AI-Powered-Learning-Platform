"""
Note Schemas - Request/Response Models (Pydantic V2)
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator

MAX_TAGS = 20
MAX_TAG_LENGTH = 50


def _clean_optional_text(value: Optional[str]) -> Optional[str]:
    """Strip whitespace; treat an empty string as 'no value' (also clears it on update)."""
    if value is None:
        return None
    value = value.strip()
    return value or None


def _clean_tags(tags: Optional[List[str]]) -> Optional[List[str]]:
    """Strip tags, drop empty ones and case-insensitive duplicates, enforce limits."""
    if tags is None:
        return None
    cleaned, seen = [], set()
    for tag in tags:
        tag = tag.strip()
        if not tag or tag.lower() in seen:
            continue
        if len(tag) > MAX_TAG_LENGTH:
            raise ValueError(f"Each tag must be at most {MAX_TAG_LENGTH} characters")
        seen.add(tag.lower())
        cleaned.append(tag)
    if len(cleaned) > MAX_TAGS:
        raise ValueError(f"A note can have at most {MAX_TAGS} tags")
    return cleaned


class NoteCreateRequest(BaseModel):
    """Schema for creating a new note."""

    user_id: Optional[str] = Field(
        None,
        description="Deprecated and ignored: the owner is always the signed-in user"
    )
    content: str = Field(..., description="Note content", min_length=1, max_length=50000)
    title: Optional[str] = Field(None, max_length=200, description="Note title")
    chat_id: Optional[str] = Field(None, max_length=100, description="Associated chat ID")
    pdf_name: Optional[str] = Field(None, max_length=255, description="Associated PDF document name")
    tags: Optional[List[str]] = Field(default_factory=list, description="Tags for organizing notes")
    topic: Optional[str] = Field(None, max_length=100, description="Topic the note belongs to")
    course_id: Optional[str] = Field(None, max_length=100, description="Associated course ID")

    _clean_text = field_validator("title", "topic", "course_id")(_clean_optional_text)
    _clean_tag_list = field_validator("tags")(_clean_tags)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "content": "# Machine Learning Notes\n\nSupervised learning involves...",
                "title": "ML Introduction",
                "chat_id": "chat_xyz789",
                "pdf_name": "ml_fundamentals.pdf",
                "tags": ["machine-learning", "ai", "supervised-learning"],
                "topic": "Machine Learning",
                "course_id": "course_cse4113"
            }
        }
    )


class NoteUpdateRequest(BaseModel):
    """Schema for updating an existing note. Send an empty string to clear topic or course."""

    content: Optional[str] = Field(None, min_length=1, max_length=50000, description="Updated note content")
    title: Optional[str] = Field(None, max_length=200, description="Updated note title")
    tags: Optional[List[str]] = Field(None, description="Updated tags")
    topic: Optional[str] = Field(None, max_length=100, description="Updated topic")
    course_id: Optional[str] = Field(None, max_length=100, description="Updated course ID")
    is_favorite: Optional[bool] = Field(None, description="Updated favorite status")

    _clean_text = field_validator("title", "topic", "course_id")(_clean_optional_text)
    _clean_tag_list = field_validator("tags")(_clean_tags)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "content": "# Updated ML Notes\n\nAdditional information...",
                "title": "ML Introduction (Updated)",
                "tags": ["machine-learning", "ai", "deep-learning"],
                "topic": "Deep Learning",
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
    topic: Optional[str] = Field(None, description="Topic the note belongs to")
    course_id: Optional[str] = Field(None, description="Associated course ID")
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
                "topic": "Machine Learning",
                "course_id": "course_cse4113",
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
                        "topic": "Machine Learning",
                        "is_favorite": False,
                        "created_at": "2024-01-15T10:30:00"
                    }
                ]
            }
        }
    )
