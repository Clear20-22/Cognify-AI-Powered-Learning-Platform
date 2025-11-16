"""
Document Pydantic Schemas
"""

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class DocumentUploadResponse(BaseModel):
    """Response after uploading a document."""
    
    id: str
    filename: str
    file_type: str
    file_size: int
    processing_status: str
    created_at: datetime


class DocumentResponse(BaseModel):
    """Detailed document response."""
    
    id: str
    user_id: str
    filename: str
    file_type: str
    file_size: int
    page_count: Optional[int] = None
    processing_status: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    processed_at: Optional[datetime] = None


class DocumentListResponse(BaseModel):
    """Response containing list of documents."""
    
    documents: list[DocumentResponse]
    total: int


class DocumentProcessRequest(BaseModel):
    """Request to process document with AI."""
    
    action: str = Field(..., description="Action: generate_notes, generate_quiz, summarize")
    options: Dict[str, Any] = Field(default_factory=dict)


class DocumentProcessResponse(BaseModel):
    """Response after processing document."""
    
    success: bool
    action: str
    result: Dict[str, Any]
    message: str
