"""
Cognify AI Learning Platform - Backend API
A modern, AI-powered educational platform with intelligent chat and adaptive learning.

Refactored with clean architecture:
- Core: Configuration, security, utilities
- DB: Database layer with repository pattern
- Models: Domain models
- Schemas: Request/response validation
- Services: Business logic layer
- API: Versioned routes with dependency injection
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import datetime
import logging
import os

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Core imports
from app.core.config import get_settings

# Database imports
from app.database import Database
from app.db.base import MongoDataStore
from app.db.init_db import InMemoryDataStore

# Service imports
from app.services.ai_service import AIService

# API router
from app.api.v1.router import router as api_v1_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()

# ============================================================================
# Application Lifespan
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - handles startup and shutdown"""
    # Startup
    logger.info("🚀 Cognify AI Learning Platform starting...")
    
    # Connect to MongoDB
    mongodb_connected = await Database.connect_db()
    
    if mongodb_connected:
        logger.info("✅ MongoDB connected")
        app.state.data_store = MongoDataStore(Database.get_db())
    else:
        logger.warning("⚠️  Running without database connection")
        app.state.data_store = InMemoryDataStore()
    
    # Initialize AI service
    app.state.ai_service = AIService()
    
    # Log AI service status
    if app.state.ai_service.active_provider:
        providers = []
        if app.state.ai_service.groq_client:
            providers.append("Groq")
        if app.state.ai_service.gemini_model:
            providers.append("Gemini")
        logger.info(f"✅ AI Service: Enabled ({', '.join(providers)})")
        logger.info(f"✅ Primary Provider: {app.state.ai_service.active_provider.capitalize()}")
    else:
        logger.info("✅ AI Service: Demo Mode")
    
    logger.info("✅ Server ready at http://localhost:8000")
    logger.info("📚 API Docs at http://localhost:8000/docs")
    
    yield
    
    # Shutdown
    logger.info("👋 Cognify AI Learning Platform shutting down...")
    await Database.close_db()

# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="Cognify AI Learning Platform",
    description="Modern AI-powered educational platform with intelligent chat, adaptive learning, and personalized exams",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    contact={
        "name": "Cognify Team",
        "url": "https://github.com/Clear20-22/Cognify-AI-Powered-Learning-Platform",
    },
    license_info={
        "name": "MIT",
    }
)

# ============================================================================
# CORS Middleware
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Include API Routers
# ============================================================================

# Include all v1 API routes
app.include_router(api_v1_router)

# ============================================================================
# Root Endpoints
# ============================================================================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Cognify AI Learning Platform",
        "version": "3.0.0",
        "status": "active",
        "architecture": "Clean Architecture (Refactored)",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "api": "/api"
        },
        "message": "Welcome to Cognify! Check /docs for API documentation."
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint with system status."""
    ai_service = app.state.ai_service
    
    providers = []
    if ai_service.groq_client:
        providers.append(f"Groq ({ai_service.groq_model_name})")
    if ai_service.gemini_model:
        providers.append(f"Gemini ({ai_service.gemini_model_name})")
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Cognify AI Learning Platform",
        "version": "3.0.0",
        "architecture": "Clean Architecture",
        "ai_service": {
            "available": ai_service.active_provider is not None,
            "primary_provider": ai_service.active_provider or "demo",
            "available_providers": providers if providers else ["demo"],
            "groq_enabled": ai_service.groq_client is not None,
            "gemini_enabled": ai_service.gemini_model is not None
        },
        "database": {
            "connected": isinstance(app.state.data_store, MongoDataStore),
            "type": "MongoDB" if isinstance(app.state.data_store, MongoDataStore) else "InMemory"
        },
        "features": {
            "chat": True,
            "exams": True,
            "notes": True,
            "users": True,
            "adaptive_learning": True,
            "content_generation": True
        }
    }

# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Handle 404 errors."""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": "The requested resource was not found",
            "path": str(request.url)
        }
    )


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Handle 500 errors."""
    logger.error(f"Internal error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred",
            "detail": str(exc)
        }
    )

# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
