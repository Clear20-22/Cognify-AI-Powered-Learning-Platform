"""
Exam Domain Models
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class Question(BaseModel):
    """Individual exam question model."""
    
    question: str = Field(..., description="Question text")
    options: List[str] = Field(..., description="Answer options (A, B, C, D)")
    correct: str = Field(..., description="Correct answer letter")
    explanation: str = Field(..., description="Explanation for the correct answer")
    
    class Config:
        json_schema_extra = {
            "example": {
                "question": "What is the time complexity of binary search?",
                "options": [
                    "O(n)",
                    "O(log n)",
                    "O(n log n)",
                    "O(1)"
                ],
                "correct": "B",
                "explanation": "Binary search divides the search space in half with each iteration, resulting in O(log n) time complexity."
            }
        }


class ExamResult(BaseModel):
    """Individual question result model."""
    
    question_index: int = Field(..., description="Question index in exam")
    question: str = Field(..., description="Question text")
    your_answer: str = Field(..., description="User's answer")
    correct_answer: str = Field(..., description="Correct answer")
    is_correct: bool = Field(..., description="Whether the answer was correct")
    explanation: str = Field(..., description="Explanation for the correct answer")
    
    class Config:
        json_schema_extra = {
            "example": {
                "question_index": 0,
                "question": "What is the time complexity of binary search?",
                "your_answer": "B",
                "correct_answer": "B",
                "is_correct": True,
                "explanation": "Binary search divides the search space in half..."
            }
        }


class Exam(BaseModel):
    """Exam domain model."""
    
    id: str = Field(..., description="Unique exam identifier")
    user_id: str = Field(..., description="User taking the exam")
    topic: str = Field(..., description="Exam topic")
    difficulty: str = Field(default="intermediate", description="Difficulty level: beginner, intermediate, advanced")
    questions: List[Question] = Field(..., description="List of exam questions")
    status: str = Field(default="active", description="Exam status: active, submitted, expired")
    submitted: bool = Field(default=False, description="Whether exam has been submitted")
    score: Optional[float] = Field(None, description="Exam score (0-100)")
    results: Optional[List[ExamResult]] = Field(None, description="Detailed results for each question")
    created_at: datetime = Field(default_factory=datetime.now, description="Exam creation timestamp")
    submitted_at: Optional[datetime] = Field(None, description="Exam submission timestamp")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional exam metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "exam_123abc",
                "user_id": "user_abc123",
                "topic": "Data Structures",
                "difficulty": "intermediate",
                "questions": [
                    {
                        "question": "What is the time complexity of binary search?",
                        "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
                        "correct": "B",
                        "explanation": "Binary search divides the search space in half..."
                    }
                ],
                "status": "active",
                "submitted": False,
                "score": None,
                "created_at": "2024-01-15T10:30:00"
            }
        }
