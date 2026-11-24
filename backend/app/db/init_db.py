"""
In-Memory Data Store
Fallback storage implementing IDataStore contract when MongoDB is unavailable.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from app.db.base import IDataStore


class InMemoryDataStore(IDataStore):
    """Full-featured in-memory datastore implementing IDataStore."""
    
    def __init__(self):
        self.users: Dict[str, Dict[str, Any]] = {}
        self.chats: Dict[str, Dict[str, Any]] = {}
        self.exams: Dict[str, Dict[str, Any]] = {}
        self.notes: Dict[str, Dict[str, Any]] = {}
    
    # User methods
    async def add_user(self, user_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        user_data["id"] = user_id
        user_data["created_at"] = datetime.now().isoformat()
        self.users[user_id] = user_data
        return user_data
    
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        return self.users.get(user_id)
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        for user in self.users.values():
            if user.get("email") == email:
                return user
        return None

    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if user_id in self.users:
            self.users[user_id].update(updates)
            self.users[user_id]["updated_at"] = datetime.now().isoformat()
            return self.users[user_id]
        return None

    async def list_users(self, limit: int = 100) -> List[Dict[str, Any]]:
        return sorted(
            self.users.values(),
            key=lambda x: x.get("created_at", ""),
            reverse=True
        )[:limit]

    # Chat methods
    async def add_chat(self, chat_id: str, chat_data: Dict[str, Any]) -> Dict[str, Any]:
        chat_data["id"] = chat_id
        chat_data["created_at"] = datetime.now().isoformat()
        self.chats[chat_id] = chat_data
        return chat_data
    
    async def get_chat(self, chat_id: str) -> Optional[Dict[str, Any]]:
        return self.chats.get(chat_id)
    
    async def get_user_chats(self, user_id: str) -> List[Dict[str, Any]]:
        return [
            chat for chat in self.chats.values()
            if chat.get("user_id") == user_id
        ]

    async def update_chat(self, chat_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if chat_id in self.chats:
            self.chats[chat_id].update(updates)
            self.chats[chat_id]["updated_at"] = datetime.now().isoformat()
            return self.chats[chat_id]
        return None
    
    # Exam methods
    async def add_exam(self, exam_id: str, exam_data: Dict[str, Any]) -> Dict[str, Any]:
        exam_data["id"] = exam_id
        exam_data["created_at"] = datetime.now().isoformat()
        self.exams[exam_id] = exam_data
        return exam_data
    
    async def get_exam(self, exam_id: str) -> Optional[Dict[str, Any]]:
        return self.exams.get(exam_id)

    async def get_user_exams(self, user_id: str) -> List[Dict[str, Any]]:
        return [
            exam for exam in self.exams.values()
            if exam.get("user_id") == user_id
        ]
    
    async def update_exam(self, exam_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if exam_id in self.exams:
            self.exams[exam_id].update(updates)
            self.exams[exam_id]["updated_at"] = datetime.now().isoformat()
            return self.exams[exam_id]
        return None

    async def delete_exam(self, exam_id: str) -> bool:
        if exam_id in self.exams:
            del self.exams[exam_id]
            return True
        return False
    
    # Note methods
    async def add_note(self, note_id: str, note_data: Dict[str, Any]) -> Dict[str, Any]:
        note_data["id"] = note_id
        note_data["created_at"] = datetime.now().isoformat()
        note_data["updated_at"] = datetime.now().isoformat()
        self.notes[note_id] = note_data
        return note_data
    
    async def get_note(self, note_id: str) -> Optional[Dict[str, Any]]:
        return self.notes.get(note_id)
    
    async def get_user_notes(self, user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        user_notes = [
            note for note in self.notes.values()
            if note.get("user_id") == user_id
        ]
        return sorted(
            user_notes,
            key=lambda x: x.get("created_at", ""),
            reverse=True
        )[:limit]
    
    async def update_note(self, note_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if note_id in self.notes:
            self.notes[note_id].update(updates)
            self.notes[note_id]["updated_at"] = datetime.now().isoformat()
            return self.notes[note_id]
        return None
    
    async def delete_note(self, note_id: str) -> bool:
        if note_id in self.notes:
            del self.notes[note_id]
            return True
        return False
