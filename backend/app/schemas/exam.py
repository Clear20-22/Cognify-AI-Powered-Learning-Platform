"""
Exam Schemas - Request/Response Models
"""

from typing import Optional, List, Dict
from pydantic import BaseModel, Field


class ExamCreateRequest(BaseModel):
    """Schema for creating a new exam."""
    
    user_id: str = Field(..., description="User ID")
    topic: str = Field(..., description="Exam topic", min_length=1)
    difficulty: str = Field(default="intermediate", description="Difficulty level: beginner, intermediate, advanced")
    num_questions: int = Field(default=5, description="Number of questions", ge=1, le=20)
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_abc123",
                "topic": "Data Structures",
                "difficulty": "intermediate",
                "num_questions": 5
            }
        }


class QuestionResponse(BaseModel):
    """Schema for exam question (without correct answer)."""
    
    index: int = Field(..., description="Question index")
    question: str = Field(..., description="Question text")
    options: List[str] = Field(..., description="Answer options")
    
    class Config:
        json_schema_extra = {
            "example": {
                "index": 0,
                "question": "What is the time complexity of binary search?",
                "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"]
            }
        }


class ExamCreateResponse(BaseModel):
    """Schema for exam creation response."""
    
    success: bool = Field(..., description="Whether exam was created successfully")
    exam_id: str = Field(..., description="Unique exam identifier")
    topic: str = Field(..., description="Exam topic")
    difficulty: str = Field(..., description="Difficulty level")
    num_questions: int = Field(..., description="Number of questions")
    questions: List[QuestionResponse] = Field(..., description="Exam questions")
    message: str = Field(..., description="Success message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "exam_id": "exam_123abc",
                "topic": "Data Structures",
                "difficulty": "intermediate",
                "num_questions": 5,
                "questions": [
                    {
                        "index": 0,
                        "question": "What is the time complexity of binary search?",
                        "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"]
                    }
                ],
                "message": "Exam created successfully"
            }
        }


class ExamSubmitRequest(BaseModel):
    """Schema for submitting exam answers."""
    
    exam_id: str = Field(..., description="Exam ID")
    answers: Dict[int, str] = Field(..., description="Question index to answer mapping")
    
    class Config:
        json_schema_extra = {
            "example": {
                "exam_id": "exam_123abc",
                "answers": {
                    0: "B",
                    1: "A",
                    2: "C",
                    3: "D",
                    4: "B"
                }
            }
        }


class QuestionResultResponse(BaseModel):
    """Schema for individual question result."""
    
    question_index: int = Field(..., description="Question index")
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


class ExamProgressRequest(BaseModel):
    """Schema for saving exam progress."""
    
    exam_id: str = Field(..., description="Exam ID")
    answers: Dict[int, str] = Field(..., description="Current answers (question index to answer mapping)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "exam_id": "exam_123abc",
                "answers": {
                    0: "B",
                    1: "A"
                }
            }
        }


class ExamSubmitResponse(BaseModel):
    """Schema for exam submission response."""
    
    success: bool = Field(..., description="Whether submission was successful")
    exam_id: str = Field(..., description="Exam ID")
    score: float = Field(..., description="Exam score (0-100)")
    correct: int = Field(..., description="Number of correct answers")
    total: int = Field(..., description="Total number of questions")
    percentage: str = Field(..., description="Percentage score")
    results: List[QuestionResultResponse] = Field(..., description="Detailed results for each question")
    message: str = Field(..., description="Result message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "exam_id": "exam_123abc",
                "score": 80.0,
                "correct": 4,
                "total": 5,
                "percentage": "80.0%",
                "results": [
                    {
                        "question_index": 0,
                        "question": "What is the time complexity of binary search?",
                        "your_answer": "B",
                        "correct_answer": "B",
                        "is_correct": True,
                        "explanation": "Binary search divides the search space..."
                    }
                ],
                "message": "You scored 4/5 (80.0%)"
            }
        }
