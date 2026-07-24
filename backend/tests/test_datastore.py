"""
Unit tests for IDataStore contract parity (InMemoryDataStore).
"""

import pytest


@pytest.mark.asyncio
async def test_user_operations(in_memory_store):
    user_data = {"name": "Test User", "email": "test@example.com"}
    created = await in_memory_store.add_user("usr_123", user_data)
    assert created["id"] == "usr_123"

    fetched = await in_memory_store.get_user("usr_123")
    assert fetched["name"] == "Test User"

    by_email = await in_memory_store.get_user_by_email("test@example.com")
    assert by_email["id"] == "usr_123"


@pytest.mark.asyncio
async def test_exam_operations(in_memory_store):
    exam_data = {"topic": "Algorithms", "user_id": "usr_123", "submitted": False}
    created = await in_memory_store.add_exam("ex_1", exam_data)
    assert created["id"] == "ex_1"

    updated = await in_memory_store.update_exam("ex_1", {"submitted": True, "score": 90.0})
    assert updated["submitted"] is True
    assert updated["score"] == 90.0

    user_exams = await in_memory_store.get_user_exams("usr_123")
    assert len(user_exams) == 1

    deleted = await in_memory_store.delete_exam("ex_1")
    assert deleted is True
    assert await in_memory_store.get_exam("ex_1") is None


@pytest.mark.asyncio
async def test_note_operations(in_memory_store):
    note_data = {"title": "Math Notes", "content": "Calculus 101", "user_id": "usr_123"}
    await in_memory_store.add_note("nt_1", note_data)

    notes = await in_memory_store.get_user_notes("usr_123")
    assert len(notes) == 1
    assert notes[0]["title"] == "Math Notes"

    deleted = await in_memory_store.delete_note("nt_1")
    assert deleted is True
