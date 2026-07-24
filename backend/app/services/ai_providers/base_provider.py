"""
Base AI Provider Interface (Strategy Pattern)
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseAIProvider(ABC):
    """Abstract base class defining the contract for AI providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the provider (e.g., 'groq', 'gemini', 'mock')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Name of the model currently in use."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is initialized and ready to handle requests."""
        pass

    @abstractmethod
    def generate_response(self, prompt: str, context: Optional[str] = None) -> str:
        """Generate general text response."""
        pass

    @abstractmethod
    def generate_chat_response(self, messages: List[Dict[str, str]], context: Optional[str] = None) -> str:
        """Generate conversational chat response."""
        pass

    @abstractmethod
    def generate_exam_questions(
        self,
        topic: str,
        num_questions: int = 5,
        difficulty: str = "medium",
        question_type: str = "multiple_choice",
        context: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Generate structured exam questions."""
        pass

    @abstractmethod
    def summarize_text(self, text: str, max_length: int = 500) -> str:
        """Summarize text content."""
        pass
