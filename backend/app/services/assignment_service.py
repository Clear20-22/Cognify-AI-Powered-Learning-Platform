"""
Assignment Service - Assignment management and submissions (FR-ASG-01..08)

Permissions:
- Teachers create assignments and manage (edit, delete, review, grade) only their own.
- Admins can manage every assignment.
- Students submit and see their own submission and marks.

Until the course module exists, every student can see every assignment.
`_student_visibility_filters` is the single place to plug in course enrollment.
"""

import logging
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
from app.core.utils import generate_uuid
from app.db.base import MongoDataStore
from app.models.user import UserRole
from app.models.assignment import SubmissionStatus

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB (FR-ASG-03)
MAX_ATTACHMENTS = 5

# Allowed extensions -> (MIME type, accepted leading bytes). None means "must be UTF-8 text".
ALLOWED_FILE_TYPES = {
    ".pdf": ("application/pdf", (b"%PDF",)),
    ".docx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", (b"PK\x03\x04",)),
    ".pptx": ("application/vnd.openxmlformats-officedocument.presentationml.presentation", (b"PK\x03\x04",)),
    ".zip": ("application/zip", (b"PK\x03\x04",)),
    ".png": ("image/png", (b"\x89PNG\r\n\x1a\n",)),
    ".jpg": ("image/jpeg", (b"\xff\xd8\xff",)),
    ".jpeg": ("image/jpeg", (b"\xff\xd8\xff",)),
    ".txt": ("text/plain", None),
}


def _user_id(user: Dict[str, Any]) -> str:
    return str(user.get("id") or user.get("_id"))


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_utc(value: Any) -> Optional[datetime]:
    """Parse a stored timestamp; naive values are treated as UTC."""
    if value is None:
        return None
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


def validate_upload(filename: str, data: bytes) -> Tuple[str, str]:
    """
    Check an uploaded file's name, size, type and content (FR-ASG-03, NFR-SEC-05).

    Returns:
        (safe file name, MIME type)

    Raises:
        ValueError: If the file is not acceptable
    """
    safe_name = Path(filename or "").name.strip()
    if not safe_name:
        raise ValueError("File name is missing")

    extension = Path(safe_name).suffix.lower()
    if extension not in ALLOWED_FILE_TYPES:
        allowed = ", ".join(sorted(ALLOWED_FILE_TYPES))
        raise ValueError(f"File type not allowed. Allowed types: {allowed}")
    if not data:
        raise ValueError("File is empty")
    if len(data) > MAX_FILE_SIZE:
        raise ValueError(f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB")

    content_type, signatures = ALLOWED_FILE_TYPES[extension]
    if signatures is None:
        try:
            data.decode("utf-8")
        except UnicodeDecodeError:
            raise ValueError("File content does not match its extension")
    elif not any(data.startswith(signature) for signature in signatures):
        raise ValueError("File content does not match its extension")

    return safe_name, content_type


class AssignmentService:
    """Service for assignments and submissions."""

    def __init__(self, data_store: MongoDataStore):
        self.data_store = data_store

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _store_upload(self, filename: str, data: bytes) -> Dict[str, Any]:
        safe_name, content_type = validate_upload(filename, data)
        file_id = f"file_{generate_uuid()}"
        await self.data_store.store_file(file_id, safe_name, content_type, data)
        return {"file_id": file_id, "filename": safe_name, "content_type": content_type, "size": len(data)}

    @staticmethod
    def _can_manage(user: Dict[str, Any], assignment: Dict[str, Any]) -> bool:
        return user.get("role") == UserRole.ADMIN.value or assignment.get("teacher_id") == _user_id(user)

    @staticmethod
    def _student_visibility_filters(user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Data-store filters for the assignments a student may see.

        Course enrollment does not exist yet, so students see every assignment.
        When the course module ships, restrict this to the student's enrolled course_ids.
        """
        return {}

    @staticmethod
    def _submission_id(assignment_id: str, student_id: str) -> str:
        return f"sub_{assignment_id}_{student_id}"

    async def _get_or_404(self, assignment_id: str) -> Dict[str, Any]:
        assignment = await self.data_store.get_assignment(assignment_id)
        if not assignment:
            raise LookupError("Assignment not found")
        return assignment

    async def _get_viewable(self, user: Dict[str, Any], assignment_id: str) -> Dict[str, Any]:
        assignment = await self._get_or_404(assignment_id)
        role = user.get("role")
        if role == UserRole.STUDENT.value:
            filters = self._student_visibility_filters(user)
            if all(assignment.get(key) == value for key, value in filters.items()):
                return assignment
            raise PermissionError("You do not have access to this assignment")
        if self._can_manage(user, assignment):
            return assignment
        raise PermissionError("You can only access your own assignments")

    async def _get_manageable(self, user: Dict[str, Any], assignment_id: str) -> Dict[str, Any]:
        assignment = await self._get_or_404(assignment_id)
        if not self._can_manage(user, assignment):
            raise PermissionError("You can only manage your own assignments")
        return assignment

    def _with_deadline_flag(self, assignment: Dict[str, Any]) -> Dict[str, Any]:
        result = dict(assignment)
        result["is_past_deadline"] = _now() > _parse_utc(assignment["deadline"])
        return result

    # ------------------------------------------------------------------
    # Assignments
    # ------------------------------------------------------------------

    async def create_assignment(
        self,
        teacher: Dict[str, Any],
        fields: Dict[str, Any],
        files: List[Tuple[str, bytes]]
    ) -> Dict[str, Any]:
        """Create an assignment with optional supporting files (FR-ASG-01)."""
        if len(files) > MAX_ATTACHMENTS:
            raise ValueError(f"At most {MAX_ATTACHMENTS} supporting files are allowed")

        # Validate every file before storing any of them
        for filename, data in files:
            validate_upload(filename, data)
        attachments = [await self._store_upload(filename, data) for filename, data in files]

        assignment_id = f"asg_{generate_uuid()}"
        data = {
            "course_id": fields.get("course_id") or None,
            "title": fields["title"],
            "description": fields.get("description") or "",
            "deadline": fields["deadline"].isoformat(),
            "max_marks": fields["max_marks"],
            "allow_late": fields.get("allow_late", False),
            "teacher_id": _user_id(teacher),
            "teacher_name": teacher.get("full_name", ""),
            "attachments": attachments,
        }
        assignment = await self.data_store.add_assignment(assignment_id, data)
        logger.info(f"Assignment {assignment_id} created by {data['teacher_id']}")
        return self._with_deadline_flag(assignment)

    async def list_assignments(self, user: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Assignments for the current user: a teacher's own (with submission counts),
        all for admins, and visible ones with the student's own status for students (FR-ASG-02).
        """
        role = user.get("role")
        if role == UserRole.STUDENT.value:
            assignments = await self.data_store.list_assignments(self._student_visibility_filters(user))
            own = {
                sub["assignment_id"]: sub
                for sub in await self.data_store.list_submissions({"student_id": _user_id(user)})
            }
            result = []
            for assignment in assignments:
                item = self._with_deadline_flag(assignment)
                submission = own.get(assignment["id"])
                item["my_status"] = submission["status"] if submission else SubmissionStatus.PENDING.value
                item["my_submitted_at"] = submission["submitted_at"] if submission else None
                # Marks are visible only once graded (FR-ASG-08)
                if submission and submission["status"] == SubmissionStatus.GRADED.value:
                    item["my_marks"] = submission.get("marks")
                result.append(item)
            return result

        filters = {} if role == UserRole.ADMIN.value else {"teacher_id": _user_id(user)}
        assignments = await self.data_store.list_assignments(filters)
        result = []
        for assignment in assignments:
            item = self._with_deadline_flag(assignment)
            submissions = await self.data_store.list_submissions({"assignment_id": assignment["id"]})
            graded = sum(1 for s in submissions if s["status"] == SubmissionStatus.GRADED.value)
            item["submission_count"] = len(submissions)
            item["graded_count"] = graded
            item["awaiting_review"] = len(submissions) - graded
            result.append(item)
        return result

    async def get_assignment(self, user: Dict[str, Any], assignment_id: str) -> Dict[str, Any]:
        assignment = await self._get_viewable(user, assignment_id)
        return self._with_deadline_flag(assignment)

    async def update_assignment(
        self,
        user: Dict[str, Any],
        assignment_id: str,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Edit an assignment the user owns."""
        await self._get_manageable(user, assignment_id)

        if "max_marks" in updates:
            graded = await self.data_store.list_submissions(
                {"assignment_id": assignment_id, "status": SubmissionStatus.GRADED.value}
            )
            highest = max((s.get("marks") or 0 for s in graded), default=0)
            if updates["max_marks"] < highest:
                raise ValueError(
                    f"Max marks cannot be lower than marks already given ({highest:g})"
                )
        if updates.get("deadline") is not None:
            updates["deadline"] = updates["deadline"].isoformat()
        if "course_id" in updates:
            updates["course_id"] = updates["course_id"] or None

        assignment = await self.data_store.update_assignment(assignment_id, updates)
        return self._with_deadline_flag(assignment)

    async def delete_assignment(self, user: Dict[str, Any], assignment_id: str) -> None:
        """Delete an assignment with all its files and submissions."""
        assignment = await self._get_manageable(user, assignment_id)
        for attachment in assignment.get("attachments", []):
            await self.data_store.delete_file(attachment["file_id"])
        for submission in await self.data_store.list_submissions({"assignment_id": assignment_id}):
            if submission.get("file"):
                await self.data_store.delete_file(submission["file"]["file_id"])
        await self.data_store.delete_submissions({"assignment_id": assignment_id})
        await self.data_store.delete_assignment(assignment_id)
        logger.info(f"Assignment {assignment_id} deleted by {_user_id(user)}")

    async def get_attachment(self, user: Dict[str, Any], assignment_id: str, file_id: str) -> Dict[str, Any]:
        """Download a supporting file of an assignment the user can see."""
        assignment = await self._get_viewable(user, assignment_id)
        if not any(a["file_id"] == file_id for a in assignment.get("attachments", [])):
            raise LookupError("File not found")
        stored = await self.data_store.get_file(file_id)
        if not stored:
            raise LookupError("File not found")
        return stored

    # ------------------------------------------------------------------
    # Submissions
    # ------------------------------------------------------------------

    async def submit(
        self,
        student: Dict[str, Any],
        assignment_id: str,
        text: str,
        upload: Optional[Tuple[str, bytes]]
    ) -> Dict[str, Any]:
        """
        Submit or resubmit (FR-ASG-03, FR-ASG-04, FR-ASG-05).
        The latest submission replaces the earlier one; a graded submission is final.
        """
        assignment = await self._get_viewable(student, assignment_id)
        text = (text or "").strip()
        if not text and not upload:
            raise ValueError("Add a text answer or a file")

        now = _now()
        is_late = now > _parse_utc(assignment["deadline"])
        if is_late and not assignment.get("allow_late"):
            raise ValueError("The deadline has passed and late submissions are not accepted")

        student_id = _user_id(student)
        submission_id = self._submission_id(assignment_id, student_id)
        previous = await self.data_store.get_submission(submission_id)
        if previous and previous["status"] == SubmissionStatus.GRADED.value:
            raise ValueError("This submission has already been graded and cannot be changed")

        new_file = await self._store_upload(*upload) if upload else None
        if previous and previous.get("file"):
            await self.data_store.delete_file(previous["file"]["file_id"])

        data = {
            "assignment_id": assignment_id,
            "student_id": student_id,
            "student_name": student.get("full_name", ""),
            "student_email": student.get("email", ""),
            "text": text,
            "file": new_file,
            "submitted_at": now.isoformat(),
            "first_submitted_at": previous["first_submitted_at"] if previous else now.isoformat(),
            "is_late": is_late,
            "resubmission_count": previous["resubmission_count"] + 1 if previous else 0,
            "status": SubmissionStatus.SUBMITTED.value,
            "marks": None,
            "feedback": None,
            "graded_at": None,
            "graded_by": None,
        }
        return await self.data_store.save_submission(submission_id, data)

    async def get_own_submission(self, student: Dict[str, Any], assignment_id: str) -> Optional[Dict[str, Any]]:
        """The student's own submission, including marks and feedback once graded (FR-ASG-08)."""
        await self._get_viewable(student, assignment_id)
        return await self.data_store.get_submission(self._submission_id(assignment_id, _user_id(student)))

    async def list_submissions(self, user: Dict[str, Any], assignment_id: str) -> List[Dict[str, Any]]:
        """All submissions of an assignment, for its teacher or an admin (FR-ASG-06)."""
        await self._get_manageable(user, assignment_id)
        return await self.data_store.list_submissions({"assignment_id": assignment_id})

    async def grade(
        self,
        user: Dict[str, Any],
        assignment_id: str,
        submission_id: str,
        marks: float,
        feedback: Optional[str]
    ) -> Dict[str, Any]:
        """Save marks and feedback (FR-ASG-06, FR-ASG-07)."""
        assignment = await self._get_manageable(user, assignment_id)
        submission = await self.data_store.get_submission(submission_id)
        if not submission or submission["assignment_id"] != assignment_id:
            raise LookupError("Submission not found")
        if marks > assignment["max_marks"]:
            raise ValueError(f"Marks cannot exceed the maximum of {assignment['max_marks']:g}")

        return await self.data_store.update_submission(submission_id, {
            "marks": marks,
            "feedback": feedback or None,
            "status": SubmissionStatus.GRADED.value,
            "graded_at": _now().isoformat(),
            "graded_by": _user_id(user),
        })

    async def get_submission_file(
        self,
        user: Dict[str, Any],
        assignment_id: str,
        submission_id: str
    ) -> Dict[str, Any]:
        """Download a submitted file: its student, the assignment's teacher, or an admin."""
        assignment = await self._get_or_404(assignment_id)
        submission = await self.data_store.get_submission(submission_id)
        if not submission or submission["assignment_id"] != assignment_id:
            raise LookupError("Submission not found")
        if submission["student_id"] != _user_id(user) and not self._can_manage(user, assignment):
            raise PermissionError("You cannot access this submission")
        if not submission.get("file"):
            raise LookupError("This submission has no file")
        stored = await self.data_store.get_file(submission["file"]["file_id"])
        if not stored:
            raise LookupError("File not found")
        return stored
