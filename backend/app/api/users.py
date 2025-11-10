from fastapi import APIRouter, HTTPException, Depends
from typing import List
from uuid import UUID
import logging

from ..database import get_supabase_client
from ..schemas.models import User, UserCreate, UserUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/users", tags=["users"])


def get_db():
    """Dependency to get database client."""
    return get_supabase_client()


@router.post("/", response_model=User)
async def create_user(user_data: UserCreate, db=Depends(get_db)):
    """Create a new user profile."""
    try:
        # Convert user data to dict
        user_dict = user_data.model_dump()
        
        # Check if user already exists
        existing_user = db.from_("users").select("*").eq("id", str(user_data.id)).execute()
        if existing_user.data:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Insert new user
        response = db.from_("users").insert(user_dict).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        return User(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")


@router.get("/{user_id}", response_model=User)
async def get_user(user_id: UUID, db=Depends(get_db)):
    """Get user by ID."""
    try:
        response = db.from_("users").select("*").eq("id", str(user_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return User(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user: {str(e)}")


@router.put("/{user_id}", response_model=User)
async def update_user(user_id: UUID, user_data: UserUpdate, db=Depends(get_db)):
    """Update user profile."""
    try:
        # Only include non-None fields in update
        update_dict = {k: v for k, v in user_data.model_dump().items() if v is not None}
        
        if not update_dict:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add updated_at timestamp
        update_dict["updated_at"] = "now()"
        
        response = db.from_("users").update(update_dict).eq("id", str(user_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return User(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")


@router.delete("/{user_id}")
async def delete_user(user_id: UUID, db=Depends(get_db)):
    """Delete user profile."""
    try:
        response = db.from_("users").delete().eq("id", str(user_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")


@router.get("/", response_model=List[User])
async def list_users(limit: int = 50, offset: int = 0, db=Depends(get_db)):
    """List all users with pagination."""
    try:
        response = (
            db.from_("users")
            .select("*")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        
        return [User(**user) for user in response.data]
        
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")


@router.get("/{user_id}/profile", response_model=User)
async def get_user_profile(user_id: UUID, db=Depends(get_db)):
    """Get user profile with additional details."""
    try:
        response = db.from_("users").select("*").eq("id", str(user_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return User(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user profile: {str(e)}")