"""
Pytest Fixtures for Cognify Backend
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Tests must never touch a real database: an empty MONGODB_URI makes the app
# fall back to the in-memory store. Set before importing main so load_dotenv()
# (which does not override existing variables) cannot load the real URI.
os.environ["MONGODB_URI"] = ""

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
