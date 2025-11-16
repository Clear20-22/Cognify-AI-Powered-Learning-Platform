"""
Database Base Classes
Base repository pattern and data access layer
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class BaseRepository:
    """Base repository for data access operations"""
    
    def __init__(self, db):
        self.db = db
    
    async def create(self, collection: str, document_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new document"""
        data["_id"] = document_id
        data["id"] = document_id
        data["created_at"] = datetime.now().isoformat()
        
        await self.db[collection].insert_one(data)
        return data
    
    async def get_by_id(self, collection: str, document_id: str) -> Optional[Dict[str, Any]]:
        """Get document by ID"""
        return await self.db[collection].find_one({"_id": document_id})
    
    async def update(self, collection: str, document_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a document"""
        updates["updated_at"] = datetime.now().isoformat()
        
        await self.db[collection].update_one(
            {"_id": document_id},
            {"$set": updates}
        )
        return await self.get_by_id(collection, document_id)
    
    async def delete(self, collection: str, document_id: str) -> bool:
        """Delete a document"""
        result = await self.db[collection].delete_one({"_id": document_id})
        return result.deleted_count > 0
    
    async def list(self, collection: str, filters: Dict[str, Any] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """List documents with optional filters"""
        filters = filters or {}
        cursor = self.db[collection].find(filters).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)


class MongoDataStore(BaseRepository):
    """MongoDB data store with specific collection methods"""
    
    def __init__(self, db):
        super().__init__(db)
        self.users = db.users
        self.chats = db.chats
        self.exams = db.exams
        self.notes = db.notes
        self.documents = db.documents
    
    # User methods
    async def add_user(self, user_id: str, user_data: Dict) -> Dict:
        return await self.create("users", user_id, user_data)
    
    async def get_user(self, user_id: str) -> Optional[Dict]:
        return await self.get_by_id("users", user_id)
    
    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        return await self.users.find_one({"email": email})
    
    # Chat methods
    async def add_chat(self, chat_id: str, chat_data: Dict) -> Dict:
        return await self.create("chats", chat_id, chat_data)
    
    async def get_chat(self, chat_id: str) -> Optional[Dict]:
        return await self.get_by_id("chats", chat_id)
    
    async def get_user_chats(self, user_id: str) -> List[Dict]:
        return await self.list("chats", {"user_id": user_id})
    
    # Exam methods
    async def add_exam(self, exam_id: str, exam_data: Dict) -> Dict:
        return await self.create("exams", exam_id, exam_data)
    
    async def get_exam(self, exam_id: str) -> Optional[Dict]:
        return await self.get_by_id("exams", exam_id)
    
    async def update_exam(self, exam_id: str, updates: Dict) -> Optional[Dict]:
        return await self.update("exams", exam_id, updates)
    
    # Note methods
    async def add_note(self, note_id: str, note_data: Dict) -> Dict:
        return await self.create("notes", note_id, note_data)
    
    async def get_note(self, note_id: str) -> Optional[Dict]:
        return await self.get_by_id("notes", note_id)
    
    async def get_user_notes(self, user_id: str, limit: int = 100) -> List[Dict]:
        return await self.list("notes", {"user_id": user_id}, limit)
    
    async def update_note(self, note_id: str, updates: Dict) -> Optional[Dict]:
        return await self.update("notes", note_id, updates)
    
    async def delete_note(self, note_id: str) -> bool:
        return await self.delete("notes", note_id)
