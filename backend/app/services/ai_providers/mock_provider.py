"""
Mock/Demo AI Provider Strategy Implementation
"""

import logging
from typing import List, Dict, Any, Optional
from app.services.ai_providers.base_provider import BaseAIProvider

logger = logging.getLogger(__name__)


class MockProvider(BaseAIProvider):
    """Fallback Mock/Demo AI Provider Strategy when no external API keys are present."""

    @property
    def name(self) -> str:
        return "mock"

    @property
    def model_name(self) -> str:
        return "demo-mock-engine"

    def is_available(self) -> bool:
        return True

    def generate_response(self, prompt: str, context: Optional[str] = None) -> str:
        return f"""🤖 **Demo Mode Response**

You asked: *{prompt}*

**Note:** This is a demo response. To enable real AI-powered responses:
1. Set `GROQ_API_KEY` (Primary) or `GEMINI_API_KEY` (Fallback) in your `.env` file.
2. Restart the backend server.

Context provided: {context if context else 'None'}"""

    def generate_chat_response(self, messages: List[Dict[str, str]], context: Optional[str] = None) -> str:
        last_msg = messages[-1]["content"] if messages else "Hello"
        return f"This is a demo assistant response to: '{last_msg}'. Configure an AI API key for full responses."

    def generate_exam_questions(
        self,
        topic: str,
        num_questions: int = 5,
        difficulty: str = "medium",
        question_type: str = "multiple_choice",
        context: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        questions = []
        for i in range(1, num_questions + 1):
            questions.append({
                "id": i,
                "question": f"Demo Question {i} about {topic} ({difficulty} level)?",
                "options": [
                    f"Option A for {topic}",
                    f"Option B (Correct) for {topic}",
                    f"Option C for {topic}",
                    f"Option D for {topic}"
                ],
                "correct_answer": 1,
                "explanation": f"Option B is correct because this is a demo exam for {topic}."
            })
        return questions

    def summarize_text(self, text: str, max_length: int = 500) -> str:
        snippet = text[:150] + "..." if len(text) > 150 else text
        return f"**Demo Summary**: {snippet}"
