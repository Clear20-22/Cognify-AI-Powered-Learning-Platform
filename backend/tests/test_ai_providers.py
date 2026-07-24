"""
Unit tests for AI Provider Strategy, Chain of Responsibility, and Resilience Decorator.
"""

import pytest
from app.services.ai_providers import MockProvider, AIProviderFactory, AIProviderChain
from app.services.ai_providers.resilience import with_retry_and_backoff


def test_mock_provider_response():
    provider = MockProvider()
    assert provider.name == "mock"
    assert provider.is_available() is True
    
    res = provider.generate_response("What is Python?")
    assert "Demo Mode Response" in res
    assert "What is Python?" in res


def test_mock_provider_exam_questions():
    provider = MockProvider()
    questions = provider.generate_exam_questions(topic="Data Structures", num_questions=3)
    assert len(questions) == 3
    assert questions[0]["correct_answer"] == 1
    assert "Data Structures" in questions[0]["question"]


def test_ai_provider_chain_failover():
    chain = AIProviderChain([MockProvider()])
    assert chain.primary_provider.name == "mock"
    
    result = chain.execute("generate_response", "Test Prompt")
    assert "Demo Mode Response" in result


def test_retry_decorator_success():
    call_count = 0

    @with_retry_and_backoff(max_retries=3, initial_delay=0.01)
    def flaky_func():
        nonlocal call_count
        call_count += 1
        if call_count < 2:
            raise ValueError("Temporary failure")
        return "Success"

    assert flaky_func() == "Success"
    assert call_count == 2


def test_retry_decorator_exhaustion():
    @with_retry_and_backoff(max_retries=2, initial_delay=0.01)
    def failing_func():
        raise RuntimeError("Persistent error")

    with pytest.raises(RuntimeError):
        failing_func()
