"""
In-Memory Data Store
Fallback storage when database is not available
"""

from typing import Dict, List, Optional
from datetime import datetime


class InMemoryDataStore:
    """Simple in-memory data store for development without database"""
    
    def __init__(self):
        self.users: Dict[str, Dict] = {}
        self.chats: Dict[str, Dict] = {}
        self.exams: Dict[str, Dict] = {}
        self.notes: Dict[str, Dict] = {}
    
    # User methods
    async def add_user(self, user_id: str, user_data: Dict) -> Dict:
        user_data["id"] = user_id
        user_data["created_at"] = datetime.now().isoformat()
        self.users[user_id] = user_data
        return user_data
    
    async def get_user(self, user_id: str) -> Optional[Dict]:
        return self.users.get(user_id)
    
    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        for user in self.users.values():
            if user.get("email") == email:
                return user
        return None
    
    # Chat methods
    async def add_chat(self, chat_id: str, chat_data: Dict) -> Dict:
        chat_data["id"] = chat_id
        chat_data["created_at"] = datetime.now().isoformat()
        self.chats[chat_id] = chat_data
        return chat_data
    
    async def get_chat(self, chat_id: str) -> Optional[Dict]:
        return self.chats.get(chat_id)
    
    async def get_user_chats(self, user_id: str) -> List[Dict]:
        return [
            chat for chat in self.chats.values()
            if chat.get("user_id") == user_id
        ]
    
    # Exam methods
    async def add_exam(self, exam_id: str, exam_data: Dict) -> Dict:
        exam_data["id"] = exam_id
        exam_data["created_at"] = datetime.now().isoformat()
        self.exams[exam_id] = exam_data
        return exam_data
    
    async def get_exam(self, exam_id: str) -> Optional[Dict]:
        return self.exams.get(exam_id)
    
    async def update_exam(self, exam_id: str, updates: Dict) -> Optional[Dict]:
        if exam_id in self.exams:
            self.exams[exam_id].update(updates)
            self.exams[exam_id]["updated_at"] = datetime.now().isoformat()
            return self.exams[exam_id]
        return None
    
    # Note methods
    async def add_note(self, note_id: str, note_data: Dict) -> Dict:
        note_data["id"] = note_id
        note_data["created_at"] = datetime.now().isoformat()
        note_data["updated_at"] = datetime.now().isoformat()
        self.notes[note_id] = note_data
        return note_data
    
    async def get_note(self, note_id: str) -> Optional[Dict]:
        return self.notes.get(note_id)
    
    async def get_user_notes(self, user_id: str, limit: int = 100) -> List[Dict]:
        user_notes = [
            note for note in self.notes.values()
            if note.get("user_id") == user_id
        ]
        return sorted(
            user_notes,
            key=lambda x: x.get("created_at", ""),
            reverse=True
        )[:limit]
    
    async def update_note(self, note_id: str, updates: Dict) -> Optional[Dict]:
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
