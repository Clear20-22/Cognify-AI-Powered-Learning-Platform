"""
Database Session Management
MongoDB connection and session handling
"""

from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class DatabaseSession:
    """MongoDB database session manager"""
    
    client: Optional[AsyncIOMotorClient] = None
    db = None
    
    @classmethod
    async def connect(cls):
        """Connect to MongoDB"""
        try:
            if not settings.MONGODB_URI:
                logger.warning("⚠️  MONGODB_URI not found in environment variables")
                return False
            
            cls.client = AsyncIOMotorClient(settings.MONGODB_URI)
            cls.db = cls.client[settings.DATABASE_NAME]
            
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
            
            # Users collection
            if 'users' not in await db.list_collection_names():
                await db.create_collection('users')
            await db.users.create_index("email", unique=True)
            await db.users.create_index("created_at")
            
            # Chats collection
            if 'chats' not in await db.list_collection_names():
                await db.create_collection('chats')
            await db.chats.create_index("user_id")
            await db.chats.create_index("created_at")
            
            # Exams collection
            if 'exams' not in await db.list_collection_names():
                await db.create_collection('exams')
            await db.exams.create_index("user_id")
            await db.exams.create_index("created_at")
            await db.exams.create_index("submitted")
            
            # Notes collection
            if 'notes' not in await db.list_collection_names():
                await db.create_collection('notes')
            await db.notes.create_index("user_id")
            await db.notes.create_index("created_at")
            await db.notes.create_index([("user_id", 1), ("created_at", -1)])
            
            logger.info("✅ Database collections initialized")
            
        except Exception as e:
            logger.warning(f"⚠️  Error initializing collections: {e}")
    
    @classmethod
    async def close(cls):
        """Close MongoDB connection"""
        if cls.client:
            cls.client.close()
            logger.info("👋 MongoDB connection closed")
    
    @classmethod
    def get_db(cls):
        """Get database instance"""
        return cls.db


# Alias for backward compatibility
Database = DatabaseSession
