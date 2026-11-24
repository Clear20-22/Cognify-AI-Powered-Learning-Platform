"""
Assignment Schemas - Request/Response Models (Pydantic V2)
"""

from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator
from app.models.assignment import StoredFile, SubmissionStatus


def _to_utc(value: datetime) -> datetime:
    """Treat naive datetimes as UTC and convert aware ones to UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _future_deadline(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    value = _to_utc(value)
    if value <= datetime.now(timezone.utc):
        raise ValueError("Deadline must be in the future")
    return value


def _clean_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    return value.strip()


class AssignmentCreate(BaseModel):
    """Fields for a new assignment (sent as multipart form fields with optional files)."""

    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=10000)
    deadline: datetime = Field(..., description="ISO 8601; naive values are treated as UTC")
    max_marks: float = Field(..., gt=0, le=1000)
    allow_late: bool = Field(False)
    course_id: Optional[str] = Field(None, max_length=100)

    _clean = field_validator("title", "description", "course_id")(_clean_text)
    _deadline = field_validator("deadline")(_future_deadline)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        if not value:
            raise ValueError("Title is required")
        return value


class AssignmentUpdate(BaseModel):
    """Editable assignment fields; only the fields sent are changed."""

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=10000)
    deadline: Optional[datetime] = Field(None)
    max_marks: Optional[float] = Field(None, gt=0, le=1000)
    allow_late: Optional[bool] = Field(None)
    course_id: Optional[str] = Field(None, max_length=100)

    _clean = field_validator("title", "description", "course_id")(_clean_text)
    _deadline = field_validator("deadline")(_future_deadline)


class GradeRequest(BaseModel):
    """Marks and feedback for a submission (FR-ASG-06, FR-ASG-07)."""

    marks: float = Field(..., ge=0, description="Must not exceed the assignment's max marks")
    feedback: Optional[str] = Field(None, max_length=5000)

    _clean = field_validator("feedback")(_clean_text)


class SubmissionResponse(BaseModel):
    """A submission as seen by its student or the assignment's teacher."""

    id: str
    assignment_id: str
    student_id: str
    student_name: str = ""
    student_email: str = ""
    text: str = ""
    file: Optional[StoredFile] = None
    submitted_at: datetime
    is_late: bool = False
    resubmission_count: int = 0
    status: SubmissionStatus
    marks: Optional[float] = None
    feedback: Optional[str] = None
    graded_at: Optional[datetime] = None


class SubmissionListResponse(BaseModel):
    submissions: List[SubmissionResponse]
    total: int


class AssignmentResponse(BaseModel):
    """An assignment, with teacher-side counts or the student's own status."""

    id: str
    course_id: Optional[str] = None
    title: str
    description: str = ""
    deadline: datetime
    max_marks: float
    allow_late: bool = False
    teacher_id: str
    teacher_name: str = ""
    attachments: List[StoredFile] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_past_deadline: bool = False

    # Teacher / admin view
    submission_count: Optional[int] = None
    graded_count: Optional[int] = None
    awaiting_review: Optional[int] = Field(None, description="Submissions not graded yet (FR-TDSH-02)")

    # Student view
    my_status: Optional[SubmissionStatus] = None
    my_marks: Optional[float] = None
    my_submitted_at: Optional[datetime] = None


class AssignmentListResponse(BaseModel):
    assignments: List[AssignmentResponse]
    total: int
