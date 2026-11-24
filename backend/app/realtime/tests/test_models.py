"""Boundary validation for authored questions and submitted answers."""

from copy import deepcopy

import pytest
from pydantic import ValidationError

from app.realtime.models import LiveAnswerRequest, LiveSessionCreate


@pytest.mark.parametrize(
    "field,value",
    [
        ("question", " "),
        ("options", ["One"]),
        ("options", [str(index) for index in range(7)]),
        ("options", ["Same", " same "]),
        ("options", ["", "Two"]),
        ("correct_answer", 3),
        ("correct_answer", -1),
        ("correct_answer", True),
        ("correct_answer", "1"),
        ("time_limit_seconds", 4),
        ("time_limit_seconds", 301),
        ("time_limit_seconds", False),
    ],
)
def test_invalid_authored_questions_are_rejected(quiz_payload, field, value):
    payload = deepcopy(quiz_payload)
    payload["questions"][0][field] = value
    with pytest.raises(ValidationError):
        LiveSessionCreate.model_validate(payload)


@pytest.mark.parametrize("field,value", [("title", " "), ("questions", []), ("host_id", "other-teacher")])
def test_invalid_or_spoofed_session_fields_are_rejected(quiz_payload, field, value):
    payload = deepcopy(quiz_payload)
    payload[field] = value
    with pytest.raises(ValidationError):
        LiveSessionCreate.model_validate(payload)


@pytest.mark.parametrize("answer", [True, False, "1", -1, 6, 1.5])
def test_answer_indexes_are_strict_integers(answer):
    with pytest.raises(ValidationError):
        LiveAnswerRequest.model_validate({"question_id": "question-1", "answer": answer})


def test_answer_cannot_supply_student_identity_or_score():
    with pytest.raises(ValidationError):
        LiveAnswerRequest.model_validate({
            "question_id": "question-1", "answer": 1,
            "user_id": "another-student", "score": 99999,
        })


def test_authored_text_is_trimmed_without_changing_correct_option(quiz_payload):
    quiz_payload["title"] = "  Quiz title  "
    quiz_payload["questions"][0]["options"] = [" Stack ", " Queue ", " Tree "]
    model = LiveSessionCreate.model_validate(quiz_payload)
    assert model.title == "Quiz title"
    assert model.questions[0].options[model.questions[0].correct_answer] == "Queue"
