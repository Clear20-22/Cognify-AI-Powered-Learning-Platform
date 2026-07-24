"""
AI Service - Handles AI/ML operations with Groq, Gemini, and Mock providers.
Refactored with Strategy, Factory Method, Chain of Responsibility, and Resilience Decorator patterns.
"""

import os
import logging
from typing import List, Dict, Any, Optional
from app.services.ai_providers import AIProviderFactory, AIProviderChain

logger = logging.getLogger(__name__)


class AIService:
    """
    Facade and Adapter for AI Provider operations.
    Delegates to an AIProviderChain constructed by AIProviderFactory.
    """

    def __init__(self):
        self.chain: AIProviderChain = AIProviderFactory.create_chain()
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        
        # Expose properties for backward compatibility with main.py checks
        primary = self.chain.primary_provider
        self.active_provider = primary.name if primary.name != "mock" else None
        self.groq_client = getattr(primary, "_client", None) if primary.name == "groq" else None
        self.gemini_model = getattr(primary, "_model", None) if primary.name == "gemini" else None
        self.groq_model_name = "llama-3.3-70b-versatile"
        self.gemini_model_name = "gemini-2.0-flash-exp"

    def generate_response(self, prompt: str, context: Optional[str] = None) -> str:
        """Generate AI response through provider strategy chain."""
        return self.chain.execute("generate_response", prompt, context)

    def generate_chat_conversation(
        self,
        topic: str,
        difficulty: str = "intermediate",
        num_exchanges: int = 3
    ) -> List[Dict[str, str]]:
        """Generate an educational chat conversation on a topic."""
        prompt = f"""Generate an educational conversation about {topic} at {difficulty} difficulty level.

Create {num_exchanges} question-answer exchanges that:
1. Start with fundamentals and build up complexity
2. Include practical examples
3. Encourage deeper understanding

Format each exchange as:
Q: [Student question]
A: [Expert answer]"""

        text_resp = self.generate_response(prompt)
        return self._parse_conversation(text_resp)

    def _parse_conversation(self, text: str) -> List[Dict[str, str]]:
        """Parse AI-generated conversation into structured format."""
        messages = []
        lines = text.split('\n')
        current_q = None
        current_a = []

        for line in lines:
            line = line.strip()
            if line.startswith('Q:'):
                if current_q and current_a:
                    messages.append({"role": "user", "content": current_q})
                    messages.append({"role": "assistant", "content": ' '.join(current_a)})
                    current_a = []
                current_q = line[2:].strip()
            elif line.startswith('A:'):
                current_a.append(line[2:].strip())
            elif current_q and line:
                current_a.append(line)

        if current_q and current_a:
            messages.append({"role": "user", "content": current_q})
            messages.append({"role": "assistant", "content": ' '.join(current_a)})

        return messages if messages else self._demo_conversation("the topic", "intermediate")

    def _demo_conversation(self, topic: str, difficulty: str) -> List[Dict[str, str]]:
        """Generate demo conversation fallback."""
        return [
            {"role": "user", "content": f"Can you explain {topic} to me?"},
            {"role": "assistant", "content": f"I'd be happy to explain {topic}! Configure your Groq/Gemini API key for live AI answers."},
            {"role": "user", "content": f"What are the key concepts in {topic}?"},
            {"role": "assistant", "content": f"Key concepts of {topic} will be outlined here when live AI is connected."}
        ]

    def generate_exam_questions(
        self,
        topic: str,
        difficulty: str = "intermediate",
        num_questions: int = 5,
        language: str = "English"
    ) -> List[Dict[str, Any]]:
        """Generate exam questions using provider chain."""
        logger.info(f"📝 Generating exam: topic='{topic}', difficulty='{difficulty}', questions={num_questions}, language='{language}'")
        
        language_instruction = f"\nWrite all content in {language} language." if language != "English" else ""
        prompt = f"""Create {num_questions} {difficulty} level exam questions about {topic}.{language_instruction}

Question 1: [your question text]
A) [option A]
B) [option B]
C) [option C]
D) [option D]
Correct: A
Explanation: [explanation]
"""
        raw_text = self.generate_response(prompt)
        parsed = self._parse_exam_questions(raw_text)
        return parsed if parsed else self._demo_exam(topic, num_questions)

    def _parse_exam_questions(self, text: str) -> List[Dict[str, Any]]:
        """Parse raw AI output into structured exam questions."""
        questions = []
        current = {}
        question_lines = []

        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue

            if any(marker in line.lower() for marker in ['question', 'প্রশ্ন', 'सवाल', 'pregunta', 'frage']) and (':' in line or '।' in line):
                if current and current.get("question"):
                    questions.append(current)
                separator = ':' if ':' in line else '।'
                q_text = line.split(separator, 1)[1].strip() if separator in line else ""
                current = {"question": q_text, "options": [], "question_lines": []}
                question_lines = [q_text] if q_text else []
            elif line.startswith(('A)', 'B)', 'C)', 'D)', 'a)', 'b)', 'c)', 'd)', 'A.', 'B.', 'C.', 'D.', 'ক)', 'খ)', 'গ)', 'ঘ)')):
                if question_lines and current:
                    current["question"] = " ".join(question_lines).strip()
                    question_lines = []
                current.get("options", []).append(line[2:].strip())
            elif any(marker in line.lower() for marker in ['correct', 'উত্তর', 'answer', 'সঠিক']):
                answer_part = line.split(':', 1)[1].strip() if ':' in line else line
                for char in answer_part.upper():
                    if char in 'ABCD':
                        current["correct"] = char
                        break
            elif any(marker in line.lower() for marker in ['explanation', 'ব্যাখ্যা', 'व्याख्या']):
                separator = ':' if ':' in line else '।'
                current["explanation"] = line.split(separator, 1)[1].strip() if separator in line else ""
            else:
                if current and not current.get("options"):
                    question_lines.append(line)

        if current and current.get("question"):
            questions.append(current)

        valid_questions = [
            q for q in questions
            if q.get("question") and q.get("options") and len(q["options"]) >= 4 and q.get("correct")
        ]
        return valid_questions if valid_questions else self._demo_exam("the topic", 3)

    def _demo_exam(self, topic: str, num_questions: int) -> List[Dict[str, Any]]:
        return [
            {
                "question": f"Sample question {i+1} about {topic}?",
                "options": ["Option A (Demo)", "Option B (Demo)", "Option C (Demo)", "Option D (Demo)"],
                "correct": "A",
                "explanation": "This is a demo question. Enable AI for real adaptive exams!"
            }
            for i in range(min(num_questions, 3))
        ]

    async def generate_study_notes(self, text: str) -> str:
        prompt = f"Generate comprehensive study notes for:\n\n{text[:3000]}"
        return self.generate_response(prompt)

    async def generate_summary(self, text: str) -> str:
        return self.chain.execute("summarize_text", text)

    async def generate_quiz_from_text(self, text: str, num_questions: int = 5) -> List[Dict[str, Any]]:
        prompt = f"Create {num_questions} exam questions from this document:\n\n{text[:3000]}"
        raw_text = self.generate_response(prompt)
        return self._parse_exam_questions(raw_text)
