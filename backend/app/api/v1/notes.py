"""
Note Routes - Note CRUD endpoints

Every endpoint requires a signed-in user, and notes are visible only to their
owner (FR-NOTE-04). The owner always comes from the token, never the request body.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
import logging
from app.schemas.note import (
    NoteCreateRequest,
    NoteUpdateRequest,
    NoteResponse,
    NoteListResponse
)
from app.services.note_service import NoteService
from app.api.deps import get_note_service, get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notes")


def _user_id(user: dict) -> str:
    return str(user.get("id") or user.get("_id"))


async def _get_owned_note(note_id: str, current_user: dict, note_service: NoteService) -> dict:
    """Return the note if the current user owns it; 404 if missing, 403 if someone else's."""
    note = await note_service.get_note(note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    if note.get("user_id") != _user_id(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own notes"
        )
    return note


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    request: NoteCreateRequest,
    current_user: dict = Depends(get_current_active_user),
    note_service: NoteService = Depends(get_note_service)
):
    """
    Save an AI response as a note for later review.

    Notes are linked to:
    - The signed-in user (always; any user_id in the body is ignored)
    - Chat ID, PDF document, topic, course (optional)
    - Timestamp (auto-generated)
    """
    try:
        result = await note_service.create_note(
            user_id=_user_id(current_user),
            content=request.content,
            title=request.title,
            chat_id=request.chat_id,
            pdf_name=request.pdf_name,
            tags=request.tags,
            topic=request.topic,
            course_id=request.course_id
        )

        return NoteResponse(**result["note"])

    except Exception as e:
        logger.error(f"Create note error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save note. Please try again."
        )


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    current_user: dict = Depends(get_current_active_user),
    note_service: NoteService = Depends(get_note_service)
):
    """Get one of your own notes by ID."""
    note = await _get_owned_note(note_id, current_user, note_service)
    return NoteResponse(**note)


@router.get("/users/{user_id}/notes", response_model=NoteListResponse)
async def get_user_notes(
    user_id: str,
    q: Optional[str] = Query(None, max_length=200, description="Keyword search in title, content, tags, and topic"),
    topic: Optional[str] = Query(None, max_length=100, description="Only notes with this topic"),
    course_id: Optional[str] = Query(None, max_length=100, description="Only notes linked to this course"),
    tag: Optional[str] = Query(None, max_length=50, description="Only notes with this tag"),
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(get_current_active_user),
    note_service: NoteService = Depends(get_note_service)
):
    """
    Get your notes, newest first, optionally searched and filtered
    (FR-NOTE-02, FR-NOTE-03). You can only list your own notes.
    """
    if user_id != _user_id(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own notes"
        )

    try:
        notes = await note_service.list_notes(
            user_id,
            query=q.strip() if q else None,
            topic=topic.strip() if topic else None,
            course_id=course_id,
            tag=tag.strip() if tag else None,
            limit=limit
        )

        note_responses = [NoteResponse(**note) for note in notes]

        return NoteListResponse(
            user_id=user_id,
            total=len(note_responses),
            notes=note_responses
        )

    except Exception as e:
        logger.error(f"Get user notes error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get notes. Please try again."
        )


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    request: NoteUpdateRequest,
    current_user: dict = Depends(get_current_active_user),
    note_service: NoteService = Depends(get_note_service)
):
    """
    Update one of your own notes.

    Can update content, title, tags, topic, course, and favorite status.
    """
    updates = request.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No updates provided"
        )

    await _get_owned_note(note_id, current_user, note_service)

    try:
        note = await note_service.update_note(note_id, updates)

        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found"
            )

        return NoteResponse(**note)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update note error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update note. Please try again."
        )


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    current_user: dict = Depends(get_current_active_user),
    note_service: NoteService = Depends(get_note_service)
):
    """
    Delete one of your own notes.

    Permanently removes the note from storage.
    """
    await _get_owned_note(note_id, current_user, note_service)

    try:
        success = await note_service.delete_note(note_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found"
            )

        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete note error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete note. Please try again."
        )
