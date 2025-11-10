from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from uuid import UUID, uuid4
import logging

from ..database import get_supabase_client
from ..schemas.models import (
    Exam, ExamCreate, ExamUpdate, ExamStatus,
    SubmitAnswerRequest, SubmitAnswerResponse,
    CompleteExamRequest, CompleteExamResponse,
    ExamQuestion, ExamAnswer, ExamResults,
    Chat, ChatData
)
from ..services.content_generator import content_generator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/exams", tags=["exams"])


def get_db():
    """Dependency to get database client."""
    return get_supabase_client()


@router.post("/", response_model=Exam)
async def create_exam(exam_data: ExamCreate, db=Depends(get_db)):
    """Create a new exam."""
    try:
        # Generate exam ID
        exam_id = uuid4()
        
        # Convert exam data to dict
        exam_dict = exam_data.model_dump()
        exam_dict["exam_id"] = str(exam_id)
        exam_dict["user_id"] = str(exam_data.user_id)
        
        if exam_data.chat_id:
            exam_dict["chat_id"] = str(exam_data.chat_id)
        
        # Convert exam_data to JSONB format
        exam_dict["exam_data"] = exam_data.exam_data.model_dump()
        
        # Insert new exam
        response = db.from_("exams").insert(exam_dict).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create exam")
        
        return Exam(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating exam: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create exam: {str(e)}")


@router.post("/generate-from-chat/{chat_id}", response_model=Exam)
async def generate_exam_from_chat(
    chat_id: UUID,
    user_id: UUID,
    num_questions: int = 5,
    db=Depends(get_db)
):
    """Generate an exam based on a chat conversation."""
    try:
        # Get the chat conversation
        chat_response = db.from_("chats").select("*").eq("chat_id", str(chat_id)).execute()
        
        if not chat_response.data:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        chat = Chat(**chat_response.data[0])
        
        # Generate exam from chat content
        exam_data = await content_generator.generate_exam_from_chat(
            chat_data=chat.chat_data,
            num_questions=num_questions
        )
        
        # Create exam title
        subject = chat.subject or chat.chat_data.metadata.subject or "General"
        title = f"{subject} Assessment"
        
        # Create exam in database
        exam_id = uuid4()
        exam_dict = {
            "exam_id": str(exam_id),
            "user_id": str(user_id),
            "chat_id": str(chat_id),
            "title": title,
            "subject": subject,
            "exam_data": exam_data.model_dump(),
            "status": ExamStatus.IN_PROGRESS.value
        }
        
        # Insert new exam
        response = db.from_("exams").insert(exam_dict).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create generated exam")
        
        logger.info(f"✅ Generated exam from chat: {title}")
        return Exam(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating exam from chat: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate exam from chat: {str(e)}")


@router.post("/generate-by-topic", response_model=Exam)
async def generate_exam_by_topic(
    user_id: UUID,
    subject: str,
    topic: Optional[str] = None,
    difficulty: str = "intermediate",
    num_questions: int = 5,
    chat_id: Optional[UUID] = None,
    db=Depends(get_db)
):
    """Generate an exam for a specific subject/topic."""
    try:
        # Generate exam questions
        exam_data = await content_generator.generate_exam_by_topic(
            subject=subject,
            topic=topic,
            difficulty=difficulty,
            num_questions=num_questions
        )
        
        # Create exam title
        if topic:
            title = f"{subject}: {topic} Assessment"
        else:
            title = f"{subject} Assessment"
        
        # Create exam in database
        exam_id = uuid4()
        exam_dict = {
            "exam_id": str(exam_id),
            "user_id": str(user_id),
            "title": title,
            "subject": subject,
            "exam_data": exam_data.model_dump(),
            "status": ExamStatus.IN_PROGRESS.value
        }
        
        if chat_id:
            exam_dict["chat_id"] = str(chat_id)
        
        # Insert new exam
        response = db.from_("exams").insert(exam_dict).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create topic exam")
        
        logger.info(f"✅ Generated exam by topic: {title}")
        return Exam(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating exam by topic: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate exam by topic: {str(e)}")


@router.get("/{exam_id}", response_model=Exam)
async def get_exam(exam_id: UUID, db=Depends(get_db)):
    """Get exam by ID."""
    try:
        response = db.from_("exams").select("*").eq("exam_id", str(exam_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        return Exam(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting exam: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get exam: {str(e)}")


@router.get("/user/{user_id}", response_model=List[Exam])
async def get_user_exams(
    user_id: UUID, 
    status: Optional[ExamStatus] = None,
    limit: int = 50, 
    offset: int = 0, 
    db=Depends(get_db)
):
    """Get all exams for a user."""
    try:
        query = (
            db.from_("exams")
            .select("*")
            .eq("user_id", str(user_id))
        )
        
        if status:
            query = query.eq("status", status.value)
        
        response = (
            query
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        
        return [Exam(**exam) for exam in response.data]
        
    except Exception as e:
        logger.error(f"Error getting user exams: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user exams: {str(e)}")


@router.get("/chat/{chat_id}", response_model=List[Exam])
async def get_chat_exams(chat_id: UUID, db=Depends(get_db)):
    """Get all exams associated with a chat."""
    try:
        response = (
            db.from_("exams")
            .select("*")
            .eq("chat_id", str(chat_id))
            .order("created_at", desc=True)
            .execute()
        )
        
        return [Exam(**exam) for exam in response.data]
        
    except Exception as e:
        logger.error(f"Error getting chat exams: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get chat exams: {str(e)}")


@router.put("/{exam_id}", response_model=Exam)
async def update_exam(exam_id: UUID, exam_data: ExamUpdate, db=Depends(get_db)):
    """Update exam."""
    try:
        # Only include non-None fields in update
        update_dict = {}
        if exam_data.title is not None:
            update_dict["title"] = exam_data.title
        if exam_data.subject is not None:
            update_dict["subject"] = exam_data.subject
        if exam_data.status is not None:
            update_dict["status"] = exam_data.status.value
        if exam_data.exam_data is not None:
            update_dict["exam_data"] = exam_data.exam_data.model_dump()
        
        if not update_dict:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add updated_at timestamp
        update_dict["updated_at"] = "now()"
        
        response = db.from_("exams").update(update_dict).eq("exam_id", str(exam_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        return Exam(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating exam: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update exam: {str(e)}")


@router.delete("/{exam_id}")
async def delete_exam(exam_id: UUID, db=Depends(get_db)):
    """Delete exam."""
    try:
        response = db.from_("exams").delete().eq("exam_id", str(exam_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        return {"message": "Exam deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting exam: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete exam: {str(e)}")


@router.post("/{exam_id}/submit-answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    exam_id: UUID, 
    answer_request: SubmitAnswerRequest, 
    db=Depends(get_db)
):
    """Submit an answer for a specific question in an exam."""
    try:
        # Get the current exam
        exam_response = db.from_("exams").select("*").eq("exam_id", str(exam_id)).execute()
        
        if not exam_response.data:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        exam = Exam(**exam_response.data[0])
        
        # Check if exam is still in progress
        if exam.status != ExamStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail="Exam is not in progress")
        
        # Find the question
        question = None
        for q in exam.exam_data.questions:
            if q.id == answer_request.question_id:
                question = q
                break
        
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Check if answer is correct (if we have the correct answer)
        is_correct = None
        if question.correct_answer:
            is_correct = answer_request.answer.strip().lower() == question.correct_answer.strip().lower()
        
        # Create or update the answer
        answer = ExamAnswer(
            question_id=answer_request.question_id,
            answer=answer_request.answer,
            is_correct=is_correct
        )
        
        # Remove any existing answer for this question
        exam.exam_data.user_answers = [
            ans for ans in exam.exam_data.user_answers 
            if ans.question_id != answer_request.question_id
        ]
        
        # Add the new answer
        exam.exam_data.user_answers.append(answer)
        
        # Update exam in database
        update_dict = {
            "exam_data": exam.exam_data.model_dump(),
            "updated_at": "now()"
        }
        
        db.from_("exams").update(update_dict).eq("exam_id", str(exam_id)).execute()
        
        return SubmitAnswerResponse(
            success=True,
            is_correct=is_correct,
            explanation=question.explanation
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting answer: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to submit answer: {str(e)}")


@router.post("/{exam_id}/complete", response_model=CompleteExamResponse)
async def complete_exam(exam_id: UUID, db=Depends(get_db)):
    """Complete an exam and calculate results."""
    try:
        # Get the current exam
        exam_response = db.from_("exams").select("*").eq("exam_id", str(exam_id)).execute()
        
        if not exam_response.data:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        exam = Exam(**exam_response.data[0])
        
        # Check if exam is still in progress
        if exam.status != ExamStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail="Exam is not in progress")
        
        # Calculate results
        total_questions = len(exam.exam_data.questions)
        correct_answers = sum(
            1 for answer in exam.exam_data.user_answers 
            if answer.is_correct is True
        )
        
        score = (correct_answers / total_questions * 100) if total_questions > 0 else 0
        completion_rate = (len(exam.exam_data.user_answers) / total_questions * 100) if total_questions > 0 else 0
        
        # Update results
        exam.exam_data.results = ExamResults(
            score=score,
            total_questions=total_questions,
            correct_answers=correct_answers,
            completion_rate=completion_rate
        )
        
        # Mark exam as completed
        exam.status = ExamStatus.COMPLETED
        
        # Update exam in database
        update_dict = {
            "exam_data": exam.exam_data.model_dump(),
            "status": ExamStatus.COMPLETED.value,
            "updated_at": "now()"
        }
        
        db.from_("exams").update(update_dict).eq("exam_id", str(exam_id)).execute()
        
        return CompleteExamResponse(
            success=True,
            results=exam.exam_data.results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing exam: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to complete exam: {str(e)}")


@router.get("/{exam_id}/results")
async def get_exam_results(exam_id: UUID, db=Depends(get_db)):
    """Get detailed exam results."""
    try:
        exam_response = db.from_("exams").select("*").eq("exam_id", str(exam_id)).execute()
        
        if not exam_response.data:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        exam = Exam(**exam_response.data[0])
        
        return {
            "exam_id": exam_id,
            "status": exam.status,
            "results": exam.exam_data.results,
            "questions": exam.exam_data.questions,
            "user_answers": exam.exam_data.user_answers
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting exam results: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get exam results: {str(e)}")


@router.post("/generate", response_model=Exam)
async def generate_exam(
    user_id: UUID,
    subject: str,
    topic: Optional[str] = None,
    difficulty: Optional[str] = "intermediate",
    num_questions: int = 10,
    chat_id: Optional[UUID] = None,
    db=Depends(get_db)
):
    """Generate a new exam using AI."""
    try:
        # You would integrate with your AI service here to generate questions
        # Import the AI service from the main module
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        from main import ai_service
        
        # Create a prompt for generating exam questions
        prompt = f"""
        Create {num_questions} {difficulty} level multiple choice questions about {subject}.
        {f'Focus on the topic: {topic}' if topic else ''}
        
        Format each question as JSON with:
        - id: unique identifier
        - type: "mcq"
        - question: the question text
        - options: array of 3-4 answer choices
        - correct_answer: the correct option
        - explanation: why the answer is correct
        
        Return only a JSON array of questions.
        """
        
        # Get AI response (you might need to parse this differently based on your AI service)
        ai_response = ai_service.get_response(prompt)
        
        # For now, create sample questions (you'd parse AI response in practice)
        sample_questions = [
            ExamQuestion(
                id=f"q_{i+1}",
                type="mcq",
                question=f"Sample {subject} question {i+1}",
                options=[f"Option A", f"Option B", f"Option C"],
                correct_answer="Option A",
                explanation="This is the correct answer because..."
            )
            for i in range(num_questions)
        ]
        
        # Create exam
        exam_create = ExamCreate(
            user_id=user_id,
            chat_id=chat_id,
            title=f"{subject} Exam",
            subject=subject,
            exam_data={
                "questions": [q.model_dump() for q in sample_questions],
                "user_answers": [],
                "results": {}
            }
        )
        
        return await create_exam(exam_create, db)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating exam: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate exam: {str(e)}")