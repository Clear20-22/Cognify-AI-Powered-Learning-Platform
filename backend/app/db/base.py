"""
Database Base Classes & Interface Definitions
Base repository pattern and data access layer
"""

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

logger = logging.getLogger(__name__)


class IDataStore(ABC):
    """Abstract Interface contract for all DataStores (MongoDB, In-Memory, etc.)."""

    # User methods
    @abstractmethod
    async def add_user(self, user_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]: ...

    @abstractmethod
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    async def list_users(self, limit: int = 100) -> List[Dict[str, Any]]: ...

    # Chat methods
    @abstractmethod
    async def add_chat(self, chat_id: str, chat_data: Dict[str, Any]) -> Dict[str, Any]: ...

    @abstractmethod
    async def get_chat(self, chat_id: str) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    async def get_user_chats(self, user_id: str) -> List[Dict[str, Any]]: ...

    @abstractmethod
    async def update_chat(self, chat_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]: ...

    # Exam methods
    @abstractmethod
    async def add_exam(self, exam_id: str, exam_data: Dict[str, Any]) -> Dict[str, Any]: ...

    @abstractmethod
    async def get_exam(self, exam_id: str) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    async def get_user_exams(self, user_id: str) -> List[Dict[str, Any]]: ...

    @abstractmethod
    async def update_exam(self, exam_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    async def delete_exam(self, exam_id: str) -> bool: ...

    # Note methods
    @abstractmethod
    async def add_note(self, note_id: str, note_data: Dict[str, Any]) -> Dict[str, Any]: ...

    @abstractmethod
    async def get_note(self, note_id: str) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    async def get_user_notes(self, user_id: str, limit: int = 100) -> List[Dict[str, Any]]: ...

    @abstractmethod
    async def update_note(self, note_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    async def delete_note(self, note_id: str) -> bool: ...

    # Assignment methods
    @abstractmethod
    async def add_assignment(self, assignment_id: str, data: Dict[str, Any]) -> Dict[str, Any]: ...

    @abstractmethod
    async def get_assignment(self, assignment_id: str) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    async def list_assignments(self, filters: Dict[str, Any], limit: int = 500) -> List[Dict[str, Any]]: ...

    @abstractmethod
    async def update_assignment(self, assignment_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    async def delete_assignment(self, assignment_id: str) -> bool: ...

    # Submission methods (one submission per student per assignment)
    @abstractmethod
    async def save_submission(self, submission_id: str, data: Dict[str, Any]) -> Dict[str, Any]: ...

    @abstractmethod
    async def get_submission(self, submission_id: str) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    async def list_submissions(self, filters: Dict[str, Any], limit: int = 1000) -> List[Dict[str, Any]]: ...

    @abstractmethod
    async def update_submission(self, submission_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    async def delete_submissions(self, filters: Dict[str, Any]) -> int: ...

    # Binary file storage (assignment attachments and submission files)
    @abstractmethod
    async def store_file(self, file_id: str, filename: str, content_type: str, data: bytes) -> None: ...

    @abstractmethod
    async def get_file(self, file_id: str) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    async def delete_file(self, file_id: str) -> bool: ...


class BaseRepository:
    """Base repository for data access operations"""
    
    def __init__(self, db):
        self.db = db
    
    async def create(self, collection: str, document_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        data["_id"] = document_id
        data["id"] = document_id
        data["created_at"] = datetime.now().isoformat()
        await self.db[collection].insert_one(data)
        return data
    
    async def get_by_id(self, collection: str, document_id: str) -> Optional[Dict[str, Any]]:
        return await self.db[collection].find_one({"_id": document_id})
    
    async def update(self, collection: str, document_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        updates["updated_at"] = datetime.now().isoformat()
        await self.db[collection].update_one(
            {"_id": document_id},
            {"$set": updates}
        )
        return await self.get_by_id(collection, document_id)
    
    async def delete(self, collection: str, document_id: str) -> bool:
        result = await self.db[collection].delete_one({"_id": document_id})
        return result.deleted_count > 0
    
    async def list(self, collection: str, filters: Dict[str, Any] = None, limit: int = 100) -> List[Dict[str, Any]]:
        filters = filters or {}
        cursor = self.db[collection].find(filters).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)


class MongoDataStore(BaseRepository, IDataStore):
    """MongoDB data store implementing IDataStore interface."""
    
    def __init__(self, db):
        super().__init__(db)
        self.users = db.users
        self.chats = db.chats
        self.exams = db.exams
        self.notes = db.notes
        self.documents = db.documents
        self.fs = AsyncIOMotorGridFSBucket(db)
    
    async def add_user(self, user_id: str, user_data: Dict) -> Dict:
        return await self.create("users", user_id, user_data)
    
    async def get_user(self, user_id: str) -> Optional[Dict]:
        return await self.get_by_id("users", user_id)
    
    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        return await self.users.find_one({"email": email})

    async def update_user(self, user_id: str, updates: Dict) -> Optional[Dict]:
        return await self.update("users", user_id, updates)

    async def list_users(self, limit: int = 100) -> List[Dict]:
        return await self.list("users", {}, limit)

    async def add_chat(self, chat_id: str, chat_data: Dict) -> Dict:
        return await self.create("chats", chat_id, chat_data)
    
    async def get_chat(self, chat_id: str) -> Optional[Dict]:
        return await self.get_by_id("chats", chat_id)
    
    async def get_user_chats(self, user_id: str) -> List[Dict]:
        return await self.list("chats", {"user_id": user_id})
    
    async def update_chat(self, chat_id: str, updates: Dict) -> Optional[Dict]:
        return await self.update("chats", chat_id, updates)
    
    async def add_exam(self, exam_id: str, exam_data: Dict) -> Dict:
        return await self.create("exams", exam_id, exam_data)
    
    async def get_exam(self, exam_id: str) -> Optional[Dict]:
        return await self.get_by_id("exams", exam_id)
    
    async def update_exam(self, exam_id: str, updates: Dict) -> Optional[Dict]:
        return await self.update("exams", exam_id, updates)
    
    async def get_user_exams(self, user_id: str) -> List[Dict]:
        return await self.list("exams", {"user_id": user_id})
    
    async def delete_exam(self, exam_id: str) -> bool:
        return await self.delete("exams", exam_id)
    
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

    async def add_assignment(self, assignment_id: str, data: Dict) -> Dict:
        return await self.create("assignments", assignment_id, data)

    async def get_assignment(self, assignment_id: str) -> Optional[Dict]:
        return await self.get_by_id("assignments", assignment_id)

    async def list_assignments(self, filters: Dict, limit: int = 500) -> List[Dict]:
        return await self.list("assignments", filters, limit)

    async def update_assignment(self, assignment_id: str, updates: Dict) -> Optional[Dict]:
        return await self.update("assignments", assignment_id, updates)

    async def delete_assignment(self, assignment_id: str) -> bool:
        return await self.delete("assignments", assignment_id)

    async def save_submission(self, submission_id: str, data: Dict) -> Dict:
        data["_id"] = submission_id
        data["id"] = submission_id
        await self.db["submissions"].replace_one({"_id": submission_id}, data, upsert=True)
        return data

    async def get_submission(self, submission_id: str) -> Optional[Dict]:
        return await self.get_by_id("submissions", submission_id)

    async def list_submissions(self, filters: Dict, limit: int = 1000) -> List[Dict]:
        cursor = self.db["submissions"].find(filters).sort("submitted_at", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def update_submission(self, submission_id: str, updates: Dict) -> Optional[Dict]:
        return await self.update("submissions", submission_id, updates)

    async def delete_submissions(self, filters: Dict) -> int:
        result = await self.db["submissions"].delete_many(filters)
        return result.deleted_count

    async def store_file(self, file_id: str, filename: str, content_type: str, data: bytes) -> None:
        await self.fs.upload_from_stream_with_id(
            file_id, filename, data, metadata={"content_type": content_type}
        )

    async def get_file(self, file_id: str) -> Optional[Dict]:
        try:
            grid_out = await self.fs.open_download_stream(file_id)
        except Exception:
            return None
        return {
            "filename": grid_out.filename,
            "content_type": (grid_out.metadata or {}).get("content_type", "application/octet-stream"),
            "data": await grid_out.read(),
        }

    async def delete_file(self, file_id: str) -> bool:
        try:
            await self.fs.delete(file_id)
            return True
        except Exception:
            return False
