"""
Quiz Attempt Schemas
"""

from typing import List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class QuizSubmitRequest(BaseModel):
    """Request to submit quiz answers."""
    
    document_id: str
    questions: List[Dict[str, Any]]
    user_answers: Dict[int, str]


class QuizAttemptResponse(BaseModel):
    """Response for quiz attempt."""
    
    id: str
    user_id: str
    document_id: str
    questions: List[Dict[str, Any]]
    user_answers: Dict[int, str]
    score: Dict[str, Any]
    created_at: datetime
