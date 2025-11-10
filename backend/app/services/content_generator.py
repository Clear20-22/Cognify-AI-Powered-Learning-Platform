"""
Content generation service for creating dynamic chats and exams using AI.
"""
import google.generativeai as genai
import json
import logging
import os
from typing import List, Dict, Optional, Any
from uuid import uuid4

from ..schemas.models import (
    ChatMessage, ChatData, ChatMetadata,
    ExamQuestion, ExamData, ExamAnswer
)

logger = logging.getLogger(__name__)

class ContentGenerator:
    def __init__(self):
        """Initialize the content generator with AI model."""
        self.model = None
        self._initialize_ai()
    
    def _initialize_ai(self):
        """Initialize Google Gemini AI."""
        try:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("⚠️ No Gemini API key found. Using demo responses.")
                return
            
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')
            logger.info("✅ Gemini AI initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Gemini AI: {e}")
            self.model = None
    
    async def generate_chat_conversation(
        self, 
        subject: str, 
        difficulty: str = "intermediate",
        num_messages: int = 6
    ) -> ChatData:
        """Generate a realistic educational chat conversation."""
        try:
            if not self.model:
                return self._get_demo_chat_conversation(subject, difficulty)
            
            prompt = f"""
Generate a realistic educational chat conversation between a student and an AI tutor about {subject}.
The difficulty level should be {difficulty}.
Create {num_messages} messages total (alternating student and AI).

Requirements:
- Start with student asking a question about {subject}
- AI should provide helpful, educational responses
- Include follow-up questions from the student
- Make it feel like a natural learning conversation
- Keep responses appropriate for {difficulty} level

Format the response as JSON with this structure:
{{
    "messages": [
        {{"id": "msg_1", "from_user": "user", "text": "student message", "timestamp": "2025-09-19T10:00:00Z"}},
        {{"id": "msg_2", "from_user": "ai", "text": "AI response", "timestamp": "2025-09-19T10:01:00Z"}}
    ],
    "metadata": {{
        "subject": "{subject}",
        "difficulty": "{difficulty}",
        "tags": ["{subject.lower()}", "learning", "education"],
        "language": "en"
    }}
}}

Generate the conversation now:
            """
            
            response = self.model.generate_content(prompt)
            
            # Parse the AI response
            try:
                chat_data_dict = json.loads(response.text)
                
                # Convert to proper objects
                messages = [
                    ChatMessage(**msg) for msg in chat_data_dict["messages"]
                ]
                metadata = ChatMetadata(**chat_data_dict["metadata"])
                
                return ChatData(messages=messages, metadata=metadata)
                
            except json.JSONDecodeError:
                logger.error("Failed to parse AI response as JSON")
                return self._get_demo_chat_conversation(subject, difficulty)
            
        except Exception as e:
            logger.error(f"Error generating chat conversation: {e}")
            return self._get_demo_chat_conversation(subject, difficulty)
    
    def _get_demo_chat_conversation(self, subject: str, difficulty: str) -> ChatData:
        """Fallback demo chat conversation."""
        messages = [
            ChatMessage(
                id="msg_1",
                from_user="user",
                text=f"Hi! Can you help me understand {subject}? I'm at {difficulty} level.",
                timestamp="2025-09-19T10:00:00Z"
            ),
            ChatMessage(
                id="msg_2", 
                from_user="ai",
                text=f"Of course! I'd be happy to help you with {subject}. {subject} is a fascinating topic. What specific aspect would you like to explore first?",
                timestamp="2025-09-19T10:01:00Z"
            ),
            ChatMessage(
                id="msg_3",
                from_user="user", 
                text="Could you explain the basic concepts and give me some examples?",
                timestamp="2025-09-19T10:02:00Z"
            ),
            ChatMessage(
                id="msg_4",
                from_user="ai",
                text=f"Absolutely! Let me break down the fundamental concepts of {subject} for you with clear examples...",
                timestamp="2025-09-19T10:03:00Z"
            )
        ]
        
        metadata = ChatMetadata(
            subject=subject,
            difficulty=difficulty,
            tags=[subject.lower(), "learning", "education"],
            language="en"
        )
        
        return ChatData(messages=messages, metadata=metadata)
    
    async def generate_exam_from_chat(
        self,
        chat_data: ChatData,
        num_questions: int = 5
    ) -> ExamData:
        """Generate exam questions based on chat conversation."""
        try:
            if not self.model:
                return self._get_demo_exam(chat_data.metadata.subject or "General")
            
            # Extract conversation text
            conversation_text = "\n".join([
                f"{msg.from_user}: {msg.text}" for msg in chat_data.messages
            ])
            
            subject = chat_data.metadata.subject or "General"
            difficulty = chat_data.metadata.difficulty or "intermediate"
            
            prompt = f"""
Based on this educational conversation about {subject}, generate {num_questions} exam questions.

Conversation:
{conversation_text}

Requirements:
- Create multiple choice questions (3-4 options each)
- Questions should test understanding of topics discussed
- Difficulty level: {difficulty}
- Include correct answers and explanations
- Make questions educational and meaningful

Format as JSON:
{{
    "questions": [
        {{
            "id": "q1",
            "type": "mcq",
            "question": "Question text here?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "Option A",
            "explanation": "Explanation of why this is correct"
        }}
    ]
}}

Generate the exam now:
            """
            
            response = self.model.generate_content(prompt)
            
            try:
                exam_dict = json.loads(response.text)
                
                questions = [
                    ExamQuestion(**q) for q in exam_dict["questions"]
                ]
                
                return ExamData(
                    questions=questions,
                    user_answers=[],
                    results={}
                )
                
            except json.JSONDecodeError:
                logger.error("Failed to parse exam AI response as JSON")
                return self._get_demo_exam(subject)
            
        except Exception as e:
            logger.error(f"Error generating exam: {e}")
            return self._get_demo_exam(chat_data.metadata.subject or "General")
    
    def _get_demo_exam(self, subject: str) -> ExamData:
        """Fallback demo exam."""
        questions = [
            ExamQuestion(
                id="q1",
                type="mcq",
                question=f"What is a fundamental concept in {subject}?",
                options=[
                    f"Basic principle of {subject}",
                    "Unrelated concept", 
                    "Wrong answer",
                    "Another wrong answer"
                ],
                correct_answer=f"Basic principle of {subject}",
                explanation=f"This is the foundational concept in {subject} studies."
            ),
            ExamQuestion(
                id="q2",
                type="mcq",
                question=f"How would you apply {subject} in practice?",
                options=[
                    "Through theoretical study only",
                    f"By implementing {subject} principles",
                    "By ignoring the concepts",
                    "Through memorization only"
                ],
                correct_answer=f"By implementing {subject} principles",
                explanation=f"Practical application is key to mastering {subject}."
            ),
            ExamQuestion(
                id="q3",
                type="mcq",
                question=f"What makes {subject} important for learning?",
                options=[
                    "It's required curriculum",
                    f"It develops critical thinking about {subject}",
                    "It's easy to memorize",
                    "It has no practical value"
                ],
                correct_answer=f"It develops critical thinking about {subject}",
                explanation=f"Learning {subject} enhances analytical and problem-solving skills."
            )
        ]
        
        return ExamData(
            questions=questions,
            user_answers=[],
            results={}
        )
    
    async def generate_exam_by_topic(
        self,
        subject: str,
        topic: Optional[str] = None,
        difficulty: str = "intermediate",
        num_questions: int = 5
    ) -> ExamData:
        """Generate exam questions for a specific subject/topic."""
        try:
            if not self.model:
                return self._get_demo_exam(subject)
            
            topic_text = f" focusing on {topic}" if topic else ""
            
            prompt = f"""
Create {num_questions} educational exam questions about {subject}{topic_text}.
Difficulty level: {difficulty}

Requirements:
- Multiple choice questions with 3-4 options each
- One clearly correct answer per question
- Educational explanations for correct answers
- Questions should test understanding, not just memorization
- Appropriate for {difficulty} level students

Format as JSON:
{{
    "questions": [
        {{
            "id": "q1", 
            "type": "mcq",
            "question": "Question text?",
            "options": ["Option A", "Option B", "Option C"],
            "correct_answer": "Option A",
            "explanation": "Why this answer is correct"
        }}
    ]
}}

Generate the exam:
            """
            
            response = self.model.generate_content(prompt)
            
            try:
                exam_dict = json.loads(response.text)
                
                questions = [
                    ExamQuestion(**q) for q in exam_dict["questions"]
                ]
                
                return ExamData(
                    questions=questions,
                    user_answers=[],
                    results={}
                )
                
            except json.JSONDecodeError:
                logger.error("Failed to parse exam AI response")
                return self._get_demo_exam(subject)
                
        except Exception as e:
            logger.error(f"Error generating topic exam: {e}")
            return self._get_demo_exam(subject)

# Global instance
content_generator = ContentGenerator()