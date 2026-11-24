"""Validated commands and errors for the real-time subsystem."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator


QuestionText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
OptionText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class LiveQuestionCreate(BaseModel):
    """An authored MCQ. The answer key is never included in public state."""

    model_config = ConfigDict(extra="forbid")

    question: QuestionText
    options: list[OptionText] = Field(min_length=2, max_length=6)
    correct_answer: int = Field(strict=True, ge=0, le=5)
    time_limit_seconds: int = Field(default=30, strict=True, ge=5, le=300)

    @model_validator(mode="after")
    def validate_options(self):
        if self.correct_answer >= len(self.options):
            raise ValueError("correct_answer must identify an existing option")
        if len({option.casefold() for option in self.options}) != len(self.options):
            raise ValueError("Answer options must be distinct")
        return self


class LiveSessionCreate(BaseModel):
    """Bounded input for a teacher-created live session."""

    model_config = ConfigDict(extra="forbid")

    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
    questions: list[LiveQuestionCreate] = Field(min_length=1, max_length=50)


class LiveAnswerRequest(BaseModel):
    """A student's answer to exactly one server-issued question."""

    model_config = ConfigDict(extra="forbid")

    question_id: Annotated[str, StringConstraints(min_length=1, max_length=80)]
    answer: int = Field(strict=True, ge=0, le=5)


class LiveQuizError(Exception):
    """An expected domain failure suitable for REST and WebSocket clients."""

    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
