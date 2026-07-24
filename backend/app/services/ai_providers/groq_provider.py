"""
Groq AI Provider Strategy Implementation
"""

import os
import logging
from typing import List, Dict, Any, Optional
from app.services.ai_providers.base_provider import BaseAIProvider
from app.services.ai_providers.resilience import with_retry_and_backoff

logger = logging.getLogger(__name__)


class GroqProvider(BaseAIProvider):
    """Groq LLM Provider Strategy using Llama-3.3-70b-versatile."""

    def __init__(self, api_key: Optional[str] = None):
        self._api_key = api_key or os.getenv("GROQ_API_KEY")
        self._model_name = "llama-3.3-70b-versatile"
        self._client = None
        self._initialize()

    def _initialize(self) -> None:
        if self._api_key:
            try:
                from groq import Groq
                self._client = Groq(api_key=self._api_key)
                logger.info(f"✅ Groq AI Provider initialized (Model: {self._model_name})")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Groq client: {e}")

    @property
    def name(self) -> str:
        return "groq"

    @property
    def model_name(self) -> str:
        return self._model_name

    def is_available(self) -> bool:
        return self._client is not None

    @with_retry_and_backoff(max_retries=2, initial_delay=0.5)
    def generate_response(self, prompt: str, context: Optional[str] = None) -> str:
        if not self.is_available():
            raise RuntimeError("Groq provider is not available")

        system_prompt = (
            "You are an expert educational AI assistant for Cognify, a modern learning platform.\n"
            "Provide clear, accurate, and engaging educational content with markdown formatting."
        )
        full_content = f"Context: {context}\n\nUser Question: {prompt}" if context else prompt

        response = self._client.chat.completions.create(
            model=self._model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_content}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        return response.choices[0].message.content

    @with_retry_and_backoff(max_retries=2, initial_delay=0.5)
    def generate_chat_response(self, messages: List[Dict[str, str]], context: Optional[str] = None) -> str:
        if not self.is_available():
            raise RuntimeError("Groq provider is not available")

        formatted_messages = [{"role": "system", "content": "You are an expert educational AI tutor for Cognify."}]
        if context:
            formatted_messages.append({"role": "system", "content": f"Relevant Study Context:\n{context}"})
        
        for msg in messages:
            formatted_messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })

        response = self._client.chat.completions.create(
            model=self._model_name,
            messages=formatted_messages,
            temperature=0.7,
            max_tokens=2000
        )
        return response.choices[0].message.content

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
            raise RuntimeError("Groq provider is not available")

        prompt = f"""Generate {num_questions} {difficulty} level exam questions about {topic} in JSON format.
Context: {context or 'None'}

Return ONLY a valid JSON array of objects with keys:
- "id": number
- "question": string
- "options": array of 4 string choices
- "correct_answer": number (0-indexed index of correct option)
- "explanation": string explanation
"""
        response = self._client.chat.completions.create(
            model=self._model_name,
            messages=[
                {"role": "system", "content": "You are a JSON-only generating educational assessment engine."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            response_format={"type": "json_object"} if hasattr(self._client.chat.completions, 'create') else None
        )
        content = response.choices[0].message.content
        import json
        try:
            data = json.loads(content)
            if isinstance(data, dict) and "questions" in data:
                return data["questions"]
            elif isinstance(data, list):
                return data
        except Exception:
            pass
        return []

    @with_retry_and_backoff(max_retries=2, initial_delay=0.5)
    def summarize_text(self, text: str, max_length: int = 500) -> str:
        if not self.is_available():
            raise RuntimeError("Groq provider is not available")

        prompt = f"Summarize the following educational content in under {max_length} characters:\n\n{text}"
        response = self._client.chat.completions.create(
            model=self._model_name,
            messages=[
                {"role": "system", "content": "You are a concise educational summarizer."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=1000
        )
        return response.choices[0].message.content
