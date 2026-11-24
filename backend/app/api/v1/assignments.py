"""
Assignment Routes - Assignment management and submissions (FR-ASG-01..08)

Teachers (and admins) create, edit, delete and grade assignments; teachers only
manage their own. Students submit and see their own submission and marks.
"""

from typing import List, Optional
from urllib.parse import quote
from fastapi import APIRouter, HTTPException, status, Depends, File, Form, UploadFile
from fastapi.responses import Response
from pydantic import ValidationError
import logging
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentUpdate,
    AssignmentResponse,
    AssignmentListResponse,
    GradeRequest,
    SubmissionResponse,
    SubmissionListResponse,
)
from app.services.assignment_service import AssignmentService, MAX_FILE_SIZE
from app.api.deps import get_assignment_service, get_current_active_user, require_role
from app.models.user import UserRole

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/assignments")

teacher_or_admin = require_role(UserRole.TEACHER, UserRole.ADMIN)
student_only = require_role(UserRole.STUDENT)


def _http_error(error: Exception) -> HTTPException:
    """Map service errors to HTTP responses."""
    if isinstance(error, LookupError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    if isinstance(error, PermissionError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error))
    if isinstance(error, ValueError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))
    logger.error(f"Assignment error: {error}")
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Something went wrong. Please try again."
    )


async def _read_upload(upload: UploadFile) -> tuple:
    """Read at most one byte past the size limit so huge uploads are not held in memory."""
    data = await upload.read(MAX_FILE_SIZE + 1)
    return upload.filename or "", data


def _file_response(stored: dict) -> Response:
    return Response(
        content=stored["data"],
        media_type=stored["content_type"],
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(stored['filename'])}"}
    )


# ---------------------------------------------------------------------------
# Assignments
# ---------------------------------------------------------------------------

@router.post("", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    title: str = Form(...),
    deadline: str = Form(..., description="ISO 8601, e.g. 2026-12-01T18:00:00Z"),
    max_marks: float = Form(...),
    description: str = Form(""),
    allow_late: bool = Form(False),
    course_id: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    teacher: dict = Depends(teacher_or_admin),
    service: AssignmentService = Depends(get_assignment_service)
):
    """
    Create an assignment with optional supporting files (FR-ASG-01). Teachers and admins only.

    Sent as multipart/form-data. Files: PDF, DOCX, PPTX, ZIP, PNG, JPG or TXT, up to 20 MB each.
    """
    try:
        fields = AssignmentCreate(
            title=title,
            description=description,
            deadline=deadline,
            max_marks=max_marks,
            allow_late=allow_late,
            course_id=course_id,
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.errors()[0]["msg"].replace("Value error, ", "")
        )

    try:
        uploads = [await _read_upload(f) for f in files if f.filename]
        assignment = await service.create_assignment(teacher, fields.model_dump(), uploads)
        return AssignmentResponse(**assignment)
    except Exception as e:
        raise _http_error(e)


@router.get("", response_model=AssignmentListResponse)
async def list_assignments(
    current_user: dict = Depends(get_current_active_user),
    service: AssignmentService = Depends(get_assignment_service)
):
    """
    List assignments for the current user (FR-ASG-02).

    - Teachers: their own, with submission counts and how many await review
    - Admins: all assignments
    - Students: assignments they can see, with their own status (pending / submitted / graded)
    """
    try:
        assignments = await service.list_assignments(current_user)
        items = [AssignmentResponse(**a) for a in assignments]
        return AssignmentListResponse(assignments=items, total=len(items))
    except Exception as e:
        raise _http_error(e)


@router.get("/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: str,
    current_user: dict = Depends(get_current_active_user),
    service: AssignmentService = Depends(get_assignment_service)
):
    """Get one assignment."""
    try:
        return AssignmentResponse(**await service.get_assignment(current_user, assignment_id))
    except Exception as e:
        raise _http_error(e)


@router.patch("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: str,
    request: AssignmentUpdate,
    teacher: dict = Depends(teacher_or_admin),
    service: AssignmentService = Depends(get_assignment_service)
):
    """Edit your own assignment. Only the fields sent are changed."""
    updates = request.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No updates provided")
    try:
        return AssignmentResponse(**await service.update_assignment(teacher, assignment_id, updates))
    except Exception as e:
        raise _http_error(e)


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: str,
    teacher: dict = Depends(teacher_or_admin),
    service: AssignmentService = Depends(get_assignment_service)
):
    """Delete your own assignment with all its files and submissions."""
    try:
        await service.delete_assignment(teacher, assignment_id)
    except Exception as e:
        raise _http_error(e)


@router.get("/{assignment_id}/attachments/{file_id}")
async def download_attachment(
    assignment_id: str,
    file_id: str,
    current_user: dict = Depends(get_current_active_user),
    service: AssignmentService = Depends(get_assignment_service)
):
    """Download a supporting file of an assignment you can see."""
    try:
        return _file_response(await service.get_attachment(current_user, assignment_id, file_id))
    except Exception as e:
        raise _http_error(e)


# ---------------------------------------------------------------------------
# Submissions
# ---------------------------------------------------------------------------

@router.post("/{assignment_id}/submission", response_model=SubmissionResponse)
async def submit_assignment(
    assignment_id: str,
    text: str = Form("", max_length=20000),
    file: Optional[UploadFile] = File(None),
    student: dict = Depends(student_only),
    service: AssignmentService = Depends(get_assignment_service)
):
    """
    Submit a text answer and/or a file; submitting again replaces the earlier
    submission (FR-ASG-03, FR-ASG-05). After the deadline this is refused unless
    the teacher allowed late submissions (FR-ASG-04). Students only.
    """
    try:
        upload = await _read_upload(file) if file and file.filename else None
        submission = await service.submit(student, assignment_id, text, upload)
        return SubmissionResponse(**submission)
    except Exception as e:
        raise _http_error(e)


@router.get("/{assignment_id}/submission", response_model=Optional[SubmissionResponse])
async def get_my_submission(
    assignment_id: str,
    student: dict = Depends(student_only),
    service: AssignmentService = Depends(get_assignment_service)
):
    """Your own submission with marks and feedback once graded (FR-ASG-08); null if none."""
    try:
        submission = await service.get_own_submission(student, assignment_id)
        return SubmissionResponse(**submission) if submission else None
    except Exception as e:
        raise _http_error(e)


@router.get("/{assignment_id}/submissions", response_model=SubmissionListResponse)
async def list_submissions(
    assignment_id: str,
    teacher: dict = Depends(teacher_or_admin),
    service: AssignmentService = Depends(get_assignment_service)
):
    """All submissions for your assignment (FR-ASG-06)."""
    try:
        submissions = [SubmissionResponse(**s) for s in await service.list_submissions(teacher, assignment_id)]
        return SubmissionListResponse(submissions=submissions, total=len(submissions))
    except Exception as e:
        raise _http_error(e)


@router.patch("/{assignment_id}/submissions/{submission_id}/grade", response_model=SubmissionResponse)
async def grade_submission(
    assignment_id: str,
    submission_id: str,
    request: GradeRequest,
    teacher: dict = Depends(teacher_or_admin),
    service: AssignmentService = Depends(get_assignment_service)
):
    """Give marks and feedback; marks must be between 0 and the max marks (FR-ASG-06, FR-ASG-07)."""
    try:
        submission = await service.grade(teacher, assignment_id, submission_id, request.marks, request.feedback)
        return SubmissionResponse(**submission)
    except Exception as e:
        raise _http_error(e)


@router.get("/{assignment_id}/submissions/{submission_id}/file")
async def download_submission_file(
    assignment_id: str,
    submission_id: str,
    current_user: dict = Depends(get_current_active_user),
    service: AssignmentService = Depends(get_assignment_service)
):
    """Download a submitted file: its student, the assignment's teacher, or an admin."""
    try:
        return _file_response(await service.get_submission_file(current_user, assignment_id, submission_id))
    except Exception as e:
        raise _http_error(e)
