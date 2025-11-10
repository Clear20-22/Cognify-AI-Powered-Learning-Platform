from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum


class ExamStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


# Base models for common fields
class TimestampModel(BaseModel):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# User models
class UserPreferences(BaseModel):
    theme: Optional[str] = "light"
    language: Optional[str] = "en"
    notifications: Optional[bool] = True
    difficulty_level: Optional[str] = "intermediate"


class UserBase(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


class UserCreate(UserBase):
    id: UUID


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


class User(UserBase, TimestampModel):
    id: UUID

    class Config:
        from_attributes = True


# Chat models
class ChatMetadata(BaseModel):
    subject: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = []
    language: Optional[str] = "en"


class ChatMessage(BaseModel):
    id: str
    from_user: str
    text: str
    timestamp: datetime


class ChatData(BaseModel):
    messages: List[ChatMessage] = []
    metadata: ChatMetadata = ChatMetadata()


class ChatBase(BaseModel):
    title: str = "New Chat"
    subject: Optional[str] = None
    chat_data: ChatData = ChatData()


class ChatCreate(ChatBase):
    user_id: UUID


class ChatUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    chat_data: Optional[ChatData] = None


class Chat(ChatBase, TimestampModel):
    chat_id: UUID
    user_id: UUID

    class Config:
        from_attributes = True


# Exam models
class ExamQuestion(BaseModel):
    id: str
    type: str  # "mcq", "open", "true_false", etc.
    question: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None


class ExamAnswer(BaseModel):
    question_id: str
    answer: str
    is_correct: Optional[bool] = None
    time_taken: Optional[int] = None  # seconds


class ExamResults(BaseModel):
    score: Optional[float] = None
    total_questions: Optional[int] = None
    correct_answers: Optional[int] = None
    time_taken: Optional[int] = None  # total time in seconds
    completion_rate: Optional[float] = None


class ExamData(BaseModel):
    questions: List[ExamQuestion] = []
    user_answers: List[ExamAnswer] = []
    results: ExamResults = ExamResults()


class ExamBase(BaseModel):
    title: str
    subject: str
    exam_data: ExamData = ExamData()
    status: ExamStatus = ExamStatus.IN_PROGRESS


class ExamCreate(ExamBase):
    user_id: UUID
    chat_id: Optional[UUID] = None


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    exam_data: Optional[ExamData] = None
    status: Optional[ExamStatus] = None


class Exam(ExamBase, TimestampModel):
    exam_id: UUID
    user_id: UUID
    chat_id: Optional[UUID] = None

    class Config:
        from_attributes = True


# Request/Response models for API endpoints
class ChatMessageRequest(BaseModel):
    message: str
    chat_id: Optional[UUID] = None


class ChatMessageResponse(BaseModel):
    response: str
    chat_id: UUID
    message_id: str
    success: bool = True


# Exam submission models
class SubmitAnswerRequest(BaseModel):
    exam_id: UUID
    question_id: str
    answer: str


class SubmitAnswerResponse(BaseModel):
    success: bool
    is_correct: Optional[bool] = None
    explanation: Optional[str] = None


class CompleteExamRequest(BaseModel):
    exam_id: UUID


class CompleteExamResponse(BaseModel):
    success: bool
    results: ExamResults