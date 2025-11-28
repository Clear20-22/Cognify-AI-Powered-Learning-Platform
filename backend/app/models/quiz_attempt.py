"""
Quiz Attempt Model
"""

from typing import List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class QuizAttempt(BaseModel):
    """Model for storing quiz attempt results."""
    
    id: str = Field(..., description="Unique attempt identifier")
    user_id: str = Field(..., description="User who took the quiz")
    document_id: str = Field(..., description="Document the quiz was generated from")
    questions: List[Dict[str, Any]] = Field(..., description="Quiz questions with correct answers")
    user_answers: Dict[str, str] = Field(..., description="User's answers (question_index: answer)")
    score: Dict[str, Any] = Field(..., description="Score details: correct, total, percentage")
    created_at: datetime = Field(default_factory=datetime.now, description="Attempt timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "attempt_abc123",
                "user_id": "user_xyz789",
                "document_id": "doc_abc123",
                "questions": [
                    {
                        "question": "What is AI?",
                        "options": ["A", "B", "C", "D"],
                        "correct": "A",
                        "explanation": "..."
                    }
                ],
                "user_answers": {0: "A", 1: "B"},
                "score": {
                    "correct": 4,
                    "total": 5,
                    "percentage": 80
                },
                "created_at": "2024-01-15T10:30:00"
            }
        }
