"""
Pytest Fixtures for Cognify Backend
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from app.db.init_db import InMemoryDataStore
from app.services.ai_providers import MockProvider, AIProviderChain


@pytest.fixture
def test_client():
    """FastAPI TestClient fixture."""
    with TestClient(app) as client:
        yield client


@pytest.fixture
def in_memory_store():
    """Fresh InMemoryDataStore instance for tests."""
    return InMemoryDataStore()


@pytest.fixture
def mock_ai_chain():
    """AIProviderChain initialized with MockProvider."""
    return AIProviderChain([MockProvider()])
