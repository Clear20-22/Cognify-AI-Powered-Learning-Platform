"""
AI Provider Factory and Chain of Responsibility
Manages provider discovery, strategy execution, and failover chains.
"""

import logging
from typing import List, Dict, Any, Optional
from app.services.ai_providers.base_provider import BaseAIProvider
from app.services.ai_providers.groq_provider import GroqProvider
from app.services.ai_providers.gemini_provider import GeminiProvider
from app.services.ai_providers.mock_provider import MockProvider

logger = logging.getLogger(__name__)


class AIProviderChain:
    """
    Chain of Responsibility implementation for AI providers.
    Executes providers in priority sequence (Groq -> Gemini -> Mock) until one succeeds.
    """

    def __init__(self, providers: List[BaseAIProvider]):
        self.providers = [p for p in providers if p.is_available()]
        if not self.providers:
            self.providers = [MockProvider()]

    @property
    def primary_provider(self) -> BaseAIProvider:
        return self.providers[0]

    def execute(self, method_name: str, *args: Any, **kwargs: Any) -> Any:
        """Execute a method on the provider chain with failover capability."""
        last_error = None

        for provider in self.providers:
            try:
                method = getattr(provider, method_name)
                logger.info(f"🔄 AI Execution attempting with [{provider.name}] for method '{method_name}'")
                result = method(*args, **kwargs)
                return result
            except Exception as e:
                logger.warning(f"⚠️ Provider [{provider.name}] failed during '{method_name}': {e}. Trying next provider...")
                last_error = e

        # Final fallback to MockProvider if all fail
        logger.error(f"❌ All AI Providers failed. Falling back to MockProvider. Last error: {last_error}")
        fallback_mock = MockProvider()
        return getattr(fallback_mock, method_name)(*args, **kwargs)


class AIProviderFactory:
    """Factory Pattern to construct configured AI Provider instances & Chains."""

    @staticmethod
    def create_chain() -> AIProviderChain:
        providers: List[BaseAIProvider] = []
        
        # 1. Primary Strategy: Groq
        groq = GroqProvider()
        if groq.is_available():
            providers.append(groq)

        # 2. Secondary Strategy: Gemini
        gemini = GeminiProvider()
        if gemini.is_available():
            providers.append(gemini)

        # 3. Fallback Strategy: Mock
        if not providers:
            providers.append(MockProvider())

        return AIProviderChain(providers)
