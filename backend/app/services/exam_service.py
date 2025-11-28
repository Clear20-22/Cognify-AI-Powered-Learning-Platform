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
                
                # Get the actual text for the answers
                options = question.get("options", [])
                user_answer_text = ""
                correct_answer_text = ""
                
                if user_answer and options:
                    try:
                        answer_idx = ord(user_answer.upper()) - ord('A')
                        if 0 <= answer_idx < len(options):
                            user_answer_text = options[answer_idx]
                    except:
                        user_answer_text = user_answer
                
                if correct_answer and options:
                    try:
                        correct_idx = ord(correct_answer.upper()) - ord('A')
                        if 0 <= correct_idx < len(options):
                            correct_answer_text = options[correct_idx]
                    except:
                        correct_answer_text = correct_answer
                
                results.append({
                    "question_index": i,
                    "question": question.get("question"),
                    "options": options,
                    "your_answer": user_answer,
                    "your_answer_text": user_answer_text,
                    "correct_answer": correct_answer,
                    "correct_answer_text": correct_answer_text,
                    "is_correct": is_correct,
                    "explanation": question.get("explanation", "")
                })
            
            score = (correct_count / len(questions)) * 100 if questions else 0
            
            # Update exam
            updates = {
                "submitted": True,
                "status": "completed",
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
    
    async def save_progress(self, exam_id: str, answers: Dict) -> bool:
        """
        Save exam progress without submitting.
        
        Args:
            exam_id: Exam identifier
            answers: Current answers (question index to answer mapping)
            
        Returns:
            True if progress saved successfully
        """
        try:
            # Get exam
            exam = await self.data_store.get_exam(exam_id)
            if not exam:
                raise ValueError("Exam not found")
            
            # Convert integer keys to strings for MongoDB compatibility
            string_key_answers = {str(k): v for k, v in answers.items()}
            
            # Update exam status to in_progress and save answers
            updates = {
                "status": "in_progress",
                "progress_answers": string_key_answers,
                "last_updated": datetime.now().isoformat()
            }
            await self.data_store.update_exam(exam_id, updates)
            
            logger.info(f"Progress saved for exam {exam_id}: {len(answers)} answers")
            return True
        except Exception as e:
            logger.error(f"Save progress error: {e}")
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
        
        # If not submitted, return questions without answers
        if not exam.get("submitted"):
            questions = exam.get("questions", [])
            safe_questions = [
                {
                    "index": i,
                    "question": q.get("question"),
                    "options": q.get("options", [])
                }
                for i, q in enumerate(questions)
            ]
            
            # Convert string keys back to integers for progress_answers
            progress_answers = exam.get("progress_answers", {})
            if progress_answers:
                progress_answers = {int(k): v for k, v in progress_answers.items()}
            
            return {
                "id": exam_id,
                "_id": exam_id,
                "topic": exam.get("topic"),
                "difficulty": exam.get("difficulty"),
                "status": exam.get("status"),
                "submitted": False,
                "num_questions": len(questions),
                "questions": safe_questions,
                "progress_answers": progress_answers
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
