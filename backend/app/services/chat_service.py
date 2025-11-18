"""
Chat Service - Handles chat-related operations
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.utils import generate_uuid
from app.db.base import MongoDataStore
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)


class ChatService:
    """Service for handling chat operations."""
    
    def __init__(self, data_store: MongoDataStore, ai_service: AIService):
        self.data_store = data_store
        self.ai_service = ai_service
    
    async def send_message(
        self,
        message: str,
        user_id: Optional[str] = None,
        context: Optional[str] = None,
        chat_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a message and get AI response.
        
        Args:
            message: User message
            user_id: Optional user ID for context
            context: Optional additional context
            chat_id: Optional chat ID to save conversation
            
        Returns:
            Dictionary with AI response and chat info
        """
        try:
            response_text = self.ai_service.generate_response(message, context)
            timestamp = datetime.now().isoformat()
            
            # Save the conversation to database if user_id is provided
            if user_id:
                # Create or update chat
                if not chat_id:
                    chat_id = f"chat_{generate_uuid()}"
                    # Create new chat
                    chat_data = {
                        "user_id": user_id,
                        "topic": message[:50],  # Use first 50 chars as topic
                        "difficulty": "intermediate",
                        "messages": [
                            {
                                "id": f"msg_{generate_uuid()}",
                                "from_user": "user",
                                "text": message,
                                "timestamp": timestamp
                            },
                            {
                                "id": f"msg_{generate_uuid()}",
                                "from_user": "ai",
                                "text": response_text,
                                "timestamp": timestamp
                            }
                        ],
                        "created_at": timestamp
                    }
                    await self.data_store.add_chat(chat_id, chat_data)
                else:
                    # Add messages to existing chat
                    chat = await self.get_chat(chat_id)
                    if chat:
                        messages = chat.get("messages", [])
                        messages.extend([
                            {
                                "id": f"msg_{generate_uuid()}",
                                "from_user": "user",
                                "text": message,
                                "timestamp": timestamp
                            },
                            {
                                "id": f"msg_{generate_uuid()}",
                                "from_user": "ai",
                                "text": response_text,
                                "timestamp": timestamp
                            }
                        ])
                        await self.data_store.update_chat(chat_id, {
                            "messages": messages,
                            "updated_at": timestamp
                        })
            
            return {
                "response": response_text,
                "timestamp": timestamp,
                "user_id": user_id,
                "chat_id": chat_id
            }
        except Exception as e:
            logger.error(f"Send message error: {e}")
            raise
    
    async def create_chat(
        self,
        user_id: str,
        topic: str,
        difficulty: str = "intermediate"
    ) -> Dict[str, Any]:
        """
        Create a new chat conversation with AI-generated content.
        
        Args:
            user_id: User identifier
            topic: Chat topic
            difficulty: Difficulty level (beginner, intermediate, advanced)
            
        Returns:
            Dictionary with chat data including generated messages
        """
        try:
            # Generate conversation
            messages = self.ai_service.generate_chat_conversation(
                topic=topic,
                difficulty=difficulty,
                num_exchanges=3
            )
            
            # Create chat in store
            chat_id = f"chat_{generate_uuid()}"
            chat_data = {
                "user_id": user_id,
                "topic": topic,
                "difficulty": difficulty,
                "messages": messages,
                "created_at": datetime.now().isoformat()
            }
            
            chat = await self.data_store.add_chat(chat_id, chat_data)
            
            return {
                "success": True,
                "chat_id": chat_id,
                "chat": chat
            }
        except Exception as e:
            logger.error(f"Create chat error: {e}")
            raise
    
    async def get_chat(self, chat_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific chat by ID.
        
        Args:
            chat_id: Chat identifier
            
        Returns:
            Chat data
        """
        return await self.data_store.get_chat(chat_id)
    
    async def get_user_chats(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all chats for a user.
        
        Args:
            user_id: User identifier
            
        Returns:
            List of user's chats
        """
        return await self.data_store.get_user_chats(user_id)
    
    async def add_message(
        self,
        chat_id: str,
        role: str,
        content: str
    ) -> Optional[Dict[str, Any]]:
        """
        Add a message to an existing chat.
        
        Args:
            chat_id: Chat identifier
            role: Message role ('user' or 'assistant')
            content: Message content
            
        Returns:
            Updated chat data
        """
        try:
            chat = await self.get_chat(chat_id)
            if not chat:
                return None
            
            message = {
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat()
            }
            
            messages = chat.get("messages", [])
            messages.append(message)
            
            updates = {
                "messages": messages,
                "updated_at": datetime.now().isoformat()
            }
            
            return await self.data_store.update_chat(chat_id, updates)
        except Exception as e:
            logger.error(f"Add message error: {e}")
            raise
