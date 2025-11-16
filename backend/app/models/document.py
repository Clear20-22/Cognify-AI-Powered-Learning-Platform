"""
Document Domain Model
"""

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class Document(BaseModel):
    """Document domain model for PDF/PPTX uploads."""
    
    id: str = Field(..., description="Unique document identifier")
    user_id: str = Field(..., description="User who uploaded the document")
    filename: str = Field(..., description="Original filename")
    file_type: str = Field(..., description="File type (pdf, pptx)")
    file_size: int = Field(..., description="File size in bytes")
    file_path: Optional[str] = Field(None, description="Storage path for the file (deprecated, using GridFS)")
    gridfs_id: Optional[str] = Field(None, description="GridFS file ID for MongoDB storage")
    extracted_text: Optional[str] = Field(None, description="Extracted text content")
    page_count: Optional[int] = Field(None, description="Number of pages/slides")
    processing_status: str = Field(default="pending", description="Processing status: pending, processing, completed, failed")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    created_at: datetime = Field(default_factory=datetime.now, description="Upload timestamp")
    processed_at: Optional[datetime] = Field(None, description="Processing completion timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "doc_abc123",
                "user_id": "user_xyz789",
                "filename": "machine_learning_notes.pdf",
                "file_type": "pdf",
                "file_size": 2048576,
                "file_path": "/uploads/user_xyz789/doc_abc123.pdf",
                "extracted_text": "Chapter 1: Introduction to Machine Learning...",
                "page_count": 45,
                "processing_status": "completed",
                "metadata": {
                    "title": "Machine Learning Notes",
                    "subject": "Computer Science"
                },
                "created_at": "2024-01-15T10:30:00",
                "processed_at": "2024-01-15T10:31:00"
            }
        }
