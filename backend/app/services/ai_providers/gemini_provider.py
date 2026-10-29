"""
Gemini AI Provider Strategy Implementation
"""

import os
import logging
import json
from typing import List, Dict, Any, Optional
from app.services.ai_providers.base_provider import BaseAIProvider
from app.services.ai_providers.resilience import with_retry_and_backoff

logger = logging.getLogger(__name__)


class GeminiProvider(BaseAIProvider):
    """Google Gemini LLM Provider Strategy using gemini-2.0-flash-exp or gemini-1.5-flash."""

    def __init__(self, api_key: Optional[str] = None):
        from app.core.config import get_settings
        self._api_key = api_key or os.getenv("GEMINI_API_KEY")
        self._model_name = get_settings().AI_MODEL_GEMINI
        self._model = None
        self._initialize()

    def _initialize(self) -> None:
        if self._api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self._api_key)
                self._model = genai.GenerativeModel(self._model_name)
                logger.info(f"✅ Gemini AI Provider initialized (Model: {self._model_name})")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Gemini client: {e}")

    @property
    def name(self) -> str:
        return "gemini"

    @property
    def model_name(self) -> str:
        return self._model_name

    def is_available(self) -> bool:
        return self._model is not None

    @with_retry_and_backoff(max_retries=2, initial_delay=0.5)
    def generate_response(self, prompt: str, context: Optional[str] = None) -> str:
        if not self.is_available():
            raise RuntimeError("Gemini provider is not available")

        full_prompt = f"Context: {context}\n\nQuestion: {prompt}" if context else prompt
        response = self._model.generate_content(full_prompt)
        return response.text

    @with_retry_and_backoff(max_retries=2, initial_delay=0.5)
    def generate_chat_response(self, messages: List[Dict[str, str]], context: Optional[str] = None) -> str:
        if not self.is_available():
            raise RuntimeError("Gemini provider is not available")

        chat_history = []
        if context:
            chat_history.append(f"Context for conversation:\n{context}")
        
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            chat_history.append(f"{role.capitalize()}: {content}")

        full_prompt = "\n".join(chat_history)
        response = self._model.generate_content(full_prompt)
        return response.text

    @with_retry_and_backoff(max_retries=2, initial_delay=0.5)
    def generate_exam_questions(
        self,
        topic: str,
        num_questions: int = 5,
        difficulty: str = "medium",
        question_type: str = "multiple_choice",
        context: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if not self.is_available():
            raise RuntimeError("Gemini provider is not available")

        prompt = f"""Generate {num_questions} {difficulty} level exam questions about {topic}.
Context: {context or 'None'}
Format as a raw JSON array of objects with keys: id, question, options (array of 4 strings), correct_answer (index 0-3), explanation."""

        response = self._model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        
        try:
            data = json.loads(text)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and "questions" in data:
                return data["questions"]
        except Exception as e:
            logger.error(f"Failed to parse Gemini exam JSON: {e}")
        return []

    @with_retry_and_backoff(max_retries=2, initial_delay=0.5)
    def summarize_text(self, text: str, max_length: int = 500) -> str:
        if not self.is_available():
            raise RuntimeError("Gemini provider is not available")

        prompt = f"Summarize the following educational content concisely:\n\n{text}"
        response = self._model.generate_content(prompt)
        return response.text
