"""
Note Routes - Note CRUD endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
import logging
from app.schemas.note import (
    NoteCreateRequest,
    NoteUpdateRequest,
    NoteResponse,
    NoteListResponse
)
from app.services.note_service import NoteService
from app.api.deps import get_note_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notes")


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    request: NoteCreateRequest,
    note_service: NoteService = Depends(get_note_service)
):
    """
    Save an AI response as a note for later review.
    
    Notes are linked to:
    - User ID (required)
    - Chat ID (optional)
    - PDF document (optional)
    - Timestamp (auto-generated)
    """
    try:
        result = await note_service.create_note(
            user_id=request.user_id,
            content=request.content,
            title=request.title,
            chat_id=request.chat_id,
            pdf_name=request.pdf_name,
            tags=request.tags
        )
        
        return NoteResponse(**result["note"])
        
    except Exception as e:
        logger.error(f"Create note error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save note: {str(e)}"
        )


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    note_service: NoteService = Depends(get_note_service)
):
    """Get a specific note by ID."""
    note = await note_service.get_note(note_id)
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    return NoteResponse(**note)


@router.get("/users/{user_id}/notes", response_model=NoteListResponse)
async def get_user_notes(
    user_id: str,
    limit: int = 100,
    note_service: NoteService = Depends(get_note_service)
):
    """
    Get all notes for a user.
    
    Returns notes sorted by creation date (newest first).
    Useful for reviewing saved AI responses.
    """
    try:
        notes = await note_service.get_user_notes(user_id, limit)
        
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
            detail=f"Failed to get notes: {str(e)}"
        )


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    request: NoteUpdateRequest,
    note_service: NoteService = Depends(get_note_service)
):
    """
    Update an existing note.
    
    Can update content, title, tags, and favorite status.
    """
    try:
        updates = request.dict(exclude_unset=True)
        
        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No updates provided"
            )
        
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
            detail=f"Failed to update note: {str(e)}"
        )


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    note_service: NoteService = Depends(get_note_service)
):
    """
    Delete a note.
    
    Permanently removes the note from storage.
    """
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
            detail=f"Failed to delete note: {str(e)}"
        )
