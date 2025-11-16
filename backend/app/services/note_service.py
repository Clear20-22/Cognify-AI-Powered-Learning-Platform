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
        tags: Optional[List[str]] = None
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
    
    async def search_notes(
        self,
        user_id: str,
        query: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Search user's notes by content or tags.
        
        Args:
            user_id: User identifier
            query: Search query
            limit: Maximum number of results
            
        Returns:
            List of matching notes
        """
        try:
            all_notes = await self.get_user_notes(user_id, limit=1000)
            
            # Simple text search (in production, use MongoDB text search)
            query_lower = query.lower()
            matching_notes = [
                note for note in all_notes
                if (
                    query_lower in note.get("content", "").lower()
                    or query_lower in note.get("title", "").lower()
                    or any(query_lower in tag.lower() for tag in note.get("tags", []))
                )
            ]
            
            return matching_notes[:limit]
        except Exception as e:
            logger.error(f"Search notes error: {e}")
            raise
