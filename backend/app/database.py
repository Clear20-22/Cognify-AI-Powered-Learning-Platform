"""
MongoDB Database Connection and Operations
"""

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from typing import Optional, Dict, List, Any
from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

class Database:
    """MongoDB Database Manager"""
    
    client: Optional[AsyncIOMotorClient] = None
    db = None
    
    @classmethod
    async def connect_db(cls):
        """Connect to MongoDB"""
        try:
            mongodb_uri = os.getenv("MONGODB_URI")
            if not mongodb_uri:
                logger.warning("⚠️  MONGODB_URI not found in environment variables")
                return False
            
            cls.client = AsyncIOMotorClient(mongodb_uri)
            cls.db = cls.client.cognify_db
            
            # Test connection
            await cls.client.admin.command('ping')
            logger.info("✅ MongoDB connected successfully")
            
            # Initialize collections and indexes
            await cls.init_collections()
            
            return True
        except Exception as e:
            logger.error(f"❌ MongoDB connection error: {e}")
            return False
    
    @classmethod
    async def init_collections(cls):
        """Initialize collections with indexes"""
        try:
            db = cls.db
            
            # Create users collection with indexes
            if 'users' not in await db.list_collection_names():
                await db.create_collection('users')
                logger.info("✅ Created 'users' collection")
            
            # Create indexes for users
            await db.users.create_index("email", unique=True)
            await db.users.create_index("created_at")
            logger.info("✅ Created indexes for 'users' collection")
            
            # Create chats collection with indexes
            if 'chats' not in await db.list_collection_names():
                await db.create_collection('chats')
                logger.info("✅ Created 'chats' collection")
            
            await db.chats.create_index("user_id")
            await db.chats.create_index("created_at")
            logger.info("✅ Created indexes for 'chats' collection")
            
            # Create exams collection with indexes
            if 'exams' not in await db.list_collection_names():
                await db.create_collection('exams')
                logger.info("✅ Created 'exams' collection")
            
            await db.exams.create_index("user_id")
            await db.exams.create_index("created_at")
            await db.exams.create_index("submitted")
            logger.info("✅ Created indexes for 'exams' collection")
            
            # Create sessions collection
            if 'sessions' not in await db.list_collection_names():
                await db.create_collection('sessions')
                logger.info("✅ Created 'sessions' collection")
            
            await db.sessions.create_index("user_id")
            await db.sessions.create_index("created_at")
            logger.info("✅ Created indexes for 'sessions' collection")
            
        except Exception as e:
            logger.warning(f"⚠️  Error initializing collections: {e}")
    
    @classmethod
    async def close_db(cls):
        """Close MongoDB connection"""
        if cls.client:
            cls.client.close()
            logger.info("👋 MongoDB connection closed")
    
    @classmethod
    def get_db(cls):
        """Get database instance"""
        return cls.db


class MongoDataStore:
    """MongoDB-based data store replacing in-memory storage"""
    
    def __init__(self, db):
        self.db = db
        self.users = db.users
        self.chats = db.chats
        self.exams = db.exams
        self.sessions = db.sessions
    
    async def add_user(self, user_id: str, user_data: Dict) -> Dict:
        """Add user to database"""
        try:
            user_data["_id"] = user_id
            user_data["id"] = user_id
            user_data["created_at"] = datetime.now().isoformat()
            
            await self.users.update_one(
                {"_id": user_id},
                {"$set": user_data},
                upsert=True
            )
            return user_data
        except Exception as e:
            logger.error(f"Error adding user: {e}")
            return {}
    
    async def get_user(self, user_id: str) -> Optional[Dict]:
        """Get user from database"""
        try:
            user = await self.users.find_one({"_id": user_id})
            return user
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None
    
    async def add_chat(self, chat_id: str, chat_data: Dict) -> Dict:
        """Add chat to database"""
        try:
            chat_data["_id"] = chat_id
            chat_data["id"] = chat_id
            chat_data["created_at"] = datetime.now().isoformat()
            
            await self.chats.insert_one(chat_data)
            return chat_data
        except Exception as e:
            logger.error(f"Error adding chat: {e}")
            return {}
    
    async def get_chat(self, chat_id: str) -> Optional[Dict]:
        """Get chat from database"""
        try:
            chat = await self.chats.find_one({"_id": chat_id})
            return chat
        except Exception as e:
            logger.error(f"Error getting chat: {e}")
            return None
    
    async def get_user_chats(self, user_id: str) -> List[Dict]:
        """Get all chats for a user"""
        try:
            cursor = self.chats.find({"user_id": user_id}).sort("created_at", -1)
            chats = await cursor.to_list(length=100)
            return chats
        except Exception as e:
            logger.error(f"Error getting user chats: {e}")
            return []
    
    async def add_exam(self, exam_id: str, exam_data: Dict) -> Dict:
        """Add exam to database"""
        try:
            exam_data["_id"] = exam_id
            exam_data["id"] = exam_id
            exam_data["created_at"] = datetime.now().isoformat()
            
            await self.exams.insert_one(exam_data)
            return exam_data
        except Exception as e:
            logger.error(f"Error adding exam: {e}")
            return {}
    
    async def get_exam(self, exam_id: str) -> Optional[Dict]:
        """Get exam from database"""
        try:
            exam = await self.exams.find_one({"_id": exam_id})
            return exam
        except Exception as e:
            logger.error(f"Error getting exam: {e}")
            return None
    
    async def update_exam(self, exam_id: str, updates: Dict) -> Optional[Dict]:
        """Update exam in database"""
        try:
            updates["updated_at"] = datetime.now().isoformat()
            
            result = await self.exams.find_one_and_update(
                {"_id": exam_id},
                {"$set": updates},
                return_document=True
            )
            return result
        except Exception as e:
            logger.error(f"Error updating exam: {e}")
            return None
