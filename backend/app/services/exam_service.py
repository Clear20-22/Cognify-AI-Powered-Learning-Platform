"""
Exam Service - Handles exam-related operations
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.utils import generate_uuid
from app.db.base import MongoDataStore
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)


class ExamService:
    """Service for handling exam operations."""
    
    def __init__(self, data_store: MongoDataStore, ai_service: AIService):
        self.data_store = data_store
        self.ai_service = ai_service
    
    async def create_exam(
        self,
        user_id: str,
        topic: str,
        difficulty: str = "intermediate",
        num_questions: int = 5
    ) -> Dict[str, Any]:
        """
        Create a new adaptive exam on a topic.
        
        Args:
            user_id: User identifier
            topic: Exam topic
            difficulty: Difficulty level (beginner, intermediate, advanced)
            num_questions: Number of questions (1-20)
            
        Returns:
            Dictionary with exam data (questions without answers)
        """
        try:
            # Generate exam questions
            questions = self.ai_service.generate_exam_questions(
                topic=topic,
                difficulty=difficulty,
                num_questions=num_questions
            )
            
            # Create exam in store
            exam_id = f"exam_{generate_uuid()}"
            exam_data = {
                "user_id": user_id,
                "topic": topic,
                "difficulty": difficulty,
                "questions": questions,
                "status": "active",
                "submitted": False,
                "score": None,
                "created_at": datetime.now().isoformat()
            }
            
            exam = await self.data_store.add_exam(exam_id, exam_data)
            
            # Remove correct answers and explanations from response
            safe_questions = [
                {
                    "index": i,
                    "question": q.get("question"),
                    "options": q.get("options", [])
                }
                for i, q in enumerate(questions)
            ]
            
            return {
                "success": True,
                "exam_id": exam_id,
                "topic": topic,
                "difficulty": difficulty,
                "num_questions": len(questions),
                "questions": safe_questions
            }
        except Exception as e:
            logger.error(f"Create exam error: {e}")
            raise
    
    async def submit_exam(
        self,
        exam_id: str,
        answers: Dict[int, str]
    ) -> Dict[str, Any]:
        """
        Submit exam answers for grading.
        
        Args:
            exam_id: Exam identifier
            answers: Dictionary mapping question index to answer
            
        Returns:
            Dictionary with score and detailed feedback
        """
        try:
            exam = await self.data_store.get_exam(exam_id)
            if not exam:
                raise ValueError("Exam not found")
            
            if exam.get("submitted"):
                raise ValueError("Exam already submitted")
            
            # Grade exam
            questions = exam["questions"]
            results = []
            correct_count = 0
            
            for i, question in enumerate(questions):
                user_answer = answers.get(i, "")
                correct_answer = question.get("correct", "")
                is_correct = user_answer.upper() == correct_answer.upper()
                
                if is_correct:
                    correct_count += 1
                
                results.append({
                    "question_index": i,
                    "question": question.get("question"),
                    "your_answer": user_answer,
                    "correct_answer": correct_answer,
                    "is_correct": is_correct,
                    "explanation": question.get("explanation", "")
                })
            
            score = (correct_count / len(questions)) * 100 if questions else 0
            
            # Update exam
            updates = {
                "submitted": True,
                "score": score,
                "results": results,
                "submitted_at": datetime.now().isoformat()
            }
            await self.data_store.update_exam(exam_id, updates)
            
            return {
                "success": True,
                "exam_id": exam_id,
                "score": round(score, 2),
                "correct": correct_count,
                "total": len(questions),
                "percentage": f"{round(score, 1)}%",
                "results": results,
                "message": f"You scored {correct_count}/{len(questions)} ({round(score, 1)}%)"
            }
        except Exception as e:
            logger.error(f"Submit exam error: {e}")
            raise
    
    async def get_exam(self, exam_id: str) -> Optional[Dict[str, Any]]:
        """
        Get exam details.
        
        Args:
            exam_id: Exam identifier
            
        Returns:
            Exam data (sanitized if not submitted)
        """
        exam = await self.data_store.get_exam(exam_id)
        if not exam:
            return None
        
        # If not submitted, don't show answers
        if not exam.get("submitted"):
            return {
                "id": exam_id,
                "topic": exam.get("topic"),
                "difficulty": exam.get("difficulty"),
                "status": exam.get("status"),
                "submitted": False,
                "num_questions": len(exam.get("questions", []))
            }
        
        return exam
    
    async def get_user_exams(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all exams for a user.
        
        Args:
            user_id: User identifier
            
        Returns:
            List of user's exams
        """
        return await self.data_store.get_user_exams(user_id)
