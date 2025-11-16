"""
Pydantic Schemas Package - Request/Response Models
"""

from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.auth import SignUpRequest, SignInRequest, TokenResponse
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatCreateRequest,
    ChatCreateResponse,
    ChatDetailResponse
)
from app.schemas.exam import (
    ExamCreateRequest,
    ExamCreateResponse,
    ExamSubmitRequest,
    ExamSubmitResponse,
    QuestionResponse
)
from app.schemas.document import (
    DocumentUploadResponse,
    DocumentResponse,
    DocumentListResponse,
    DocumentProcessRequest,
    DocumentProcessResponse
)
from app.schemas.note import (
    NoteCreateRequest,
    NoteUpdateRequest,
    NoteResponse,
    NoteListResponse
)

__all__ = [
    # User schemas
    'UserCreate',
    'UserResponse',
    'UserUpdate',
    # Auth schemas
    'SignUpRequest',
    'SignInRequest',
    'TokenResponse',
    # Chat schemas
    'ChatRequest',
    'ChatResponse',
    'ChatCreateRequest',
    'ChatCreateResponse',
    'ChatDetailResponse',
    # Exam schemas
    'ExamCreateRequest',
    'ExamCreateResponse',
    'ExamSubmitRequest',
    'ExamSubmitResponse',
    'QuestionResponse',
    # Note schemas
    'NoteCreateRequest',
    'NoteUpdateRequest',
    'NoteResponse',
    'NoteListResponse',
]
