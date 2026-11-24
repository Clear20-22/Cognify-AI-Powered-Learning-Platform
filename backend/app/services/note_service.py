"""
Note Service - Handles note-related operations
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.utils import generate_uuid
from app.db.base import MongoDataStore

logger = logging.getLogger(__name__)


class NoteService:
    """Service for handling note operations."""
    
    def __init__(self, data_store: MongoDataStore):
        self.data_store = data_store
    
    async def create_note(
        self,
        user_id: str,
        content: str,
        title: Optional[str] = None,
        chat_id: Optional[str] = None,
        pdf_name: Optional[str] = None,
        tags: Optional[List[str]] = None,
        topic: Optional[str] = None,
        course_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new note.

        Args:
            user_id: User identifier
            content: Note content
            title: Optional note title
            chat_id: Optional associated chat ID
            pdf_name: Optional associated PDF name
            tags: Optional tags for organizing notes
            topic: Optional topic the note belongs to
            course_id: Optional associated course ID

        Returns:
            Dictionary with created note data
        """
        try:
            note_id = f"note_{generate_uuid()}"

            note_data = {
                "user_id": user_id,
                "content": content,
                "title": title,
                "chat_id": chat_id,
                "pdf_name": pdf_name,
                "tags": tags or [],
                "topic": topic,
                "course_id": course_id,
                "is_favorite": False,
                "created_at": datetime.now().isoformat()
            }
            
            note = await self.data_store.add_note(note_id, note_data)
            
            return {
                "success": True,
                "note_id": note_id,
                "note": note
            }
        except Exception as e:
            logger.error(f"Create note error: {e}")
            raise
    
    async def get_note(self, note_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific note by ID.
        
        Args:
            note_id: Note identifier
            
        Returns:
            Note data
        """
        return await self.data_store.get_note(note_id)
    
    async def get_user_notes(
        self,
        user_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get all notes for a user.
        
        Args:
            user_id: User identifier
            limit: Maximum number of notes to return
            
        Returns:
            List of user's notes
        """
        return await self.data_store.get_user_notes(user_id, limit)
    
    async def update_note(
        self,
        note_id: str,
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update an existing note.
        
        Args:
            note_id: Note identifier
            updates: Dictionary of fields to update
            
        Returns:
            Updated note data
        """
        try:
            updates["updated_at"] = datetime.now().isoformat()
            return await self.data_store.update_note(note_id, updates)
        except Exception as e:
            logger.error(f"Update note error: {e}")
            raise
    
    async def delete_note(self, note_id: str) -> bool:
        """
        Delete a note.
        
        Args:
            note_id: Note identifier
            
        Returns:
            True if deleted successfully
        """
        try:
            return await self.data_store.delete_note(note_id)
        except Exception as e:
            logger.error(f"Delete note error: {e}")
            raise
    
    async def list_notes(
        self,
        user_id: str,
        query: Optional[str] = None,
        topic: Optional[str] = None,
        course_id: Optional[str] = None,
        tag: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        List a user's notes, optionally searched and filtered (FR-NOTE-02, FR-NOTE-03).

        Args:
            user_id: User identifier
            query: Keyword matched against title, content, tags, and topic
            topic: Only notes with this topic (case-insensitive)
            course_id: Only notes linked to this course
            tag: Only notes carrying this tag (case-insensitive)
            limit: Maximum number of results

        Returns:
            Matching notes, newest first
        """
        try:
            if not any([query, topic, course_id, tag]):
                return await self.get_user_notes(user_id, limit)

            # Simple in-memory filtering (in production, use MongoDB text search)
            all_notes = await self.get_user_notes(user_id, limit=1000)
            query_lower = query.lower() if query else None
            topic_lower = topic.lower() if topic else None
            tag_lower = tag.lower() if tag else None

            def matches(note: Dict[str, Any]) -> bool:
                tags = [t.lower() for t in note.get("tags") or []]
                if topic_lower and (note.get("topic") or "").lower() != topic_lower:
                    return False
                if course_id and note.get("course_id") != course_id:
                    return False
                if tag_lower and tag_lower not in tags:
                    return False
                if query_lower:
                    searchable = [
                        note.get("content") or "",
                        note.get("title") or "",
                        note.get("topic") or "",
                        *tags,
                    ]
                    return any(query_lower in text.lower() for text in searchable)
                return True

            return [note for note in all_notes if matches(note)][:limit]
        except Exception as e:
            logger.error(f"List notes error: {e}")
            raise
