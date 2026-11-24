"""
Assignment Domain Models (Pydantic V2)
"""

from enum import Enum
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class SubmissionStatus(str, Enum):
    """Assignment status from a student's point of view (FR-ASG-02)."""

    PENDING = "pending"        # nothing submitted yet
    SUBMITTED = "submitted"    # submitted, waiting for marks
    GRADED = "graded"          # marks and feedback released


class StoredFile(BaseModel):
    """Metadata of a file kept in the data store's file storage."""

    file_id: str = Field(..., description="File storage identifier")
    filename: str = Field(..., description="Sanitised original file name")
    content_type: str = Field(..., description="MIME type derived from the extension")
    size: int = Field(..., description="Size in bytes")


class Assignment(BaseModel):
    """Assignment created by a teacher (FR-ASG-01)."""

    id: str = Field(..., description="Unique assignment identifier")
    course_id: Optional[str] = Field(None, description="Course this assignment belongs to (course module contract)")
    title: str = Field(..., description="Assignment title")
    description: str = Field("", description="Instructions for students")
    deadline: datetime = Field(..., description="Submission deadline (UTC)")
    max_marks: float = Field(..., description="Maximum marks")
    allow_late: bool = Field(False, description="Accept submissions after the deadline (FR-ASG-04)")
    teacher_id: str = Field(..., description="Owner teacher's user ID")
    teacher_name: str = Field("", description="Owner teacher's name")
    attachments: List[StoredFile] = Field(default_factory=list, description="Supporting files")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")


class Submission(BaseModel):
    """A student's submission for an assignment; resubmitting replaces it (FR-ASG-05)."""

    id: str = Field(..., description="Submission ID: one per student per assignment")
    assignment_id: str = Field(..., description="Assignment ID")
    student_id: str = Field(..., description="Student's user ID")
    student_name: str = Field("", description="Student's name")
    student_email: str = Field("", description="Student's email")
    text: str = Field("", description="Text answer")
    file: Optional[StoredFile] = Field(None, description="Submitted file")
    submitted_at: datetime = Field(..., description="Time of the latest submission (UTC)")
    is_late: bool = Field(False, description="Submitted after the deadline")
    resubmission_count: int = Field(0, description="How many times the submission was replaced")
    status: SubmissionStatus = Field(SubmissionStatus.SUBMITTED, description="Submitted or graded")
    marks: Optional[float] = Field(None, description="Marks given by the teacher")
    feedback: Optional[str] = Field(None, description="Teacher's feedback")
    graded_at: Optional[datetime] = Field(None, description="When marks were saved")
    graded_by: Optional[str] = Field(None, description="User ID of the grader")
