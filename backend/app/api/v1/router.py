"""
API v1 Router - Main router combining all v1 endpoints
"""

from fastapi import APIRouter
from app.api.v1 import auth, users, chat, exams, notes, documents

router = APIRouter(prefix="/api")

# Include all v1 routers
router.include_router(auth.router, tags=["Authentication"])
router.include_router(users.router, tags=["Users"])
router.include_router(chat.router, tags=["Chat"])
router.include_router(exams.router, tags=["Exams"])
router.include_router(notes.router, tags=["Notes"])
router.include_router(documents.router, tags=["Documents"])
