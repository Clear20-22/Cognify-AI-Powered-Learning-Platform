"""Isolated fixtures for Masum's FR-RT-01..07 subsystem."""

import sys
from pathlib import Path

import pytest


sys.path.insert(0, str(Path(__file__).resolve().parents[3]))


@pytest.fixture
def teacher():
    return {"id": "teacher-1", "full_name": "Masum", "role": "teacher", "is_active": True}


@pytest.fixture
def student():
    return {"id": "student-1", "full_name": "Student One", "role": "student", "is_active": True}


@pytest.fixture
def quiz_payload():
    return {
        "title": "Data structures live quiz",
        "questions": [
            {
                "question": "Which structure follows FIFO?",
                "options": ["Stack", "Queue", "Tree"],
                "correct_answer": 1,
                "time_limit_seconds": 30,
            },
            {
                "question": "Which structure follows LIFO?",
                "options": ["Stack", "Queue"],
                "correct_answer": 0,
                "time_limit_seconds": 30,
            },
        ],
    }
