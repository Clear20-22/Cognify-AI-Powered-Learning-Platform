"""
Exam Routes - Exam creation and submission endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
import logging
from app.schemas.exam import (
    ExamCreateRequest,
    ExamCreateResponse,
    ExamSubmitRequest,
    ExamSubmitResponse,
    QuestionResponse,
    QuestionResultResponse
)
from app.services.exam_service import ExamService
from app.api.deps import get_exam_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/exams")


@router.post("", response_model=ExamCreateResponse)
async def create_exam(
    request: ExamCreateRequest,
    exam_service: ExamService = Depends(get_exam_service)
):
    """
    Create a new adaptive exam on a topic.
    
    Generates personalized questions based on difficulty level.
    """
    try:
        logger.info(f"📝 Creating exam: {request.topic} ({request.difficulty})")
        
        result = await exam_service.create_exam(
            user_id=request.user_id,
            topic=request.topic,
            difficulty=request.difficulty,
            num_questions=request.num_questions
        )
        
        # Convert questions to response format
        questions = [QuestionResponse(**q) for q in result["questions"]]
        
        return ExamCreateResponse(
            success=result["success"],
            exam_id=result["exam_id"],
            topic=result["topic"],
            difficulty=result["difficulty"],
            num_questions=result["num_questions"],
            questions=questions,
            message="Exam created successfully"
        )
        
    except Exception as e:
        logger.error(f"Create exam error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create exam: {str(e)}"
        )


@router.post("/submit", response_model=ExamSubmitResponse)
async def submit_exam(
    request: ExamSubmitRequest,
    exam_service: ExamService = Depends(get_exam_service)
):
    """
    Submit exam answers for grading.
    
    Returns score and detailed feedback for each question.
    """
    try:
        result = await exam_service.submit_exam(
            exam_id=request.exam_id,
            answers=request.answers
        )
        
        # Convert results to response format
        results = [QuestionResultResponse(**r) for r in result["results"]]
        
        return ExamSubmitResponse(
            success=result["success"],
            exam_id=result["exam_id"],
            score=result["score"],
            correct=result["correct"],
            total=result["total"],
            percentage=result["percentage"],
            results=results,
            message=result["message"]
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Submit exam error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit exam: {str(e)}"
        )


@router.get("/users/{user_id}")
async def get_user_exams(
    user_id: str,
    exam_service: ExamService = Depends(get_exam_service)
):
    """Get all exams for a user."""
    try:
        exams = await exam_service.get_user_exams(user_id)
        return {"exams": exams}
    except Exception as e:
        logger.error(f"Get user exams error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user exams: {str(e)}"
        )


@router.get("/{exam_id}")
async def get_exam(
    exam_id: str,
    exam_service: ExamService = Depends(get_exam_service)
):
    """Get exam details (only after submission)."""
    exam = await exam_service.get_exam(exam_id)
    
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )
    
    return exam
