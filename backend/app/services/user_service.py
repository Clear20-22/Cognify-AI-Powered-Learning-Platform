"""
User Service - Handles user-related operations
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime
from app.core.security import hash_password, verify_password, create_access_token
from app.core.utils import generate_uuid, sanitize_dict
from app.db.base import MongoDataStore

logger = logging.getLogger(__name__)


class UserService:
    """Service for handling user operations."""
    
    def __init__(self, data_store: MongoDataStore):
        self.data_store = data_store
    
    async def create_user(self, email: str, password: str, full_name: str) -> Dict[str, Any]:
        """
        Create a new user with email and password.
        
        Args:
            email: User email address
            password: Plain text password
            full_name: User's full name
            
        Returns:
            Dictionary with user data and access token
        """
        try:
            # Check if user already exists
            existing_user = await self.data_store.get_user_by_email(email)
            if existing_user:
                raise ValueError("Email already registered")
            
            # Hash password
            hashed_password = hash_password(password)
            
            # Create user
            user_id = f"user_{generate_uuid()}"
            user_data = {
                "email": email,
                "full_name": full_name,
                "hashed_password": hashed_password,
                "created_at": datetime.now().isoformat(),
                "is_active": True,
                "preferences": {},
                "learning_stats": {}
            }
            
            user = await self.data_store.add_user(user_id, user_data)
            
            # Create access token
            access_token = create_access_token(data={"sub": user_id, "email": email})
            
            # Remove password from response
            safe_user = sanitize_dict(user, exclude_keys=["hashed_password", "password"])
            
            return {
                "success": True,
                "user": safe_user,
                "access_token": access_token,
                "token_type": "bearer"
            }
        except Exception as e:
            logger.error(f"Create user error: {e}")
            raise
    
    async def authenticate_user(self, email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate a user with email and password.
        
        Args:
            email: User email address
            password: Plain text password
            
        Returns:
            Dictionary with user data and access token
        """
        try:
            # Get user by email
            user = await self.data_store.get_user_by_email(email)
            if not user:
                raise ValueError("Invalid email or password")
            
            # Verify password
            hashed_password = user.get("hashed_password") or user.get("password", "")
            if not verify_password(password, hashed_password):
                raise ValueError("Invalid email or password")
            
            # Create access token
            user_id = user.get("id") or user.get("_id")
            access_token = create_access_token(data={"sub": str(user_id), "email": email})
            
            # Remove password from response
            safe_user = sanitize_dict(user, exclude_keys=["hashed_password", "password"])
            
            return {
                "success": True,
                "user": safe_user,
                "access_token": access_token,
                "token_type": "bearer"
            }
        except Exception as e:
            logger.error(f"Authenticate user error: {e}")
            raise
    
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user by ID.
        
        Args:
            user_id: User identifier
            
        Returns:
            User data (without password)
        """
        user = await self.data_store.get_user(user_id)
        if user:
            return sanitize_dict(user, exclude_keys=["hashed_password", "password"])
        return None
    
    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Update user information.
        
        Args:
            user_id: User identifier
            updates: Dictionary of fields to update
            
        Returns:
            Updated user data
        """
        try:
            updates["updated_at"] = datetime.now().isoformat()
            user = await self.data_store.update_user(user_id, updates)
            if user:
                return sanitize_dict(user, exclude_keys=["hashed_password", "password"])
            return None
        except Exception as e:
            logger.error(f"Update user error: {e}")
            raise
