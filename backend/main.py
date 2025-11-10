from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import os
from typing import Optional
from dotenv import load_dotenv

# Import new API routers
from app.api.users import router as users_router
from app.api.chats import router as chats_router
from app.api.exams import router as exams_router
from app.database import supabase_client

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="EduAI API",
    description="AI-powered Educational Platform with Chat and Exam Features",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(users_router)
app.include_router(chats_router)
app.include_router(exams_router)

# Simple AI service using Gemini
class SimpleAI:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-2.0-flash')
                logger.info("✅ Gemini AI initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Gemini AI: {e}")
                self.model = None
        else:
            logger.warning("⚠️ GEMINI_API_KEY not found. AI will return demo responses.")
            self.model = None
    
    def get_response(self, message: str) -> str:
        """Get AI response to user message."""
        try:
            if self.model:
                response = self.model.generate_content(f"You are an educational AI assistant. Please respond helpfully to: {message}")
                return response.text
            else:
                # Demo response when no API key
                return f"🤖 Demo AI Response: I understand you asked about '{message}'. This is a demo response since no Gemini API key is configured. Please add GEMINI_API_KEY to your .env file for real AI responses."
        except Exception as e:
            logger.error(f"AI Error: {e}")
            return f"Sorry, I encountered an error while processing your request: {str(e)}"

# Initialize AI service
ai_service = SimpleAI()

# Request/Response models
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    success: bool = True

# Routes
@app.get("/health")
async def health_check():
    """Enhanced health check endpoint."""
    try:
        # Check Supabase connection
        supabase_healthy = supabase_client.health_check()
        
        return {
            "status": "healthy",
            "service": "EduAI API",
            "version": "2.0.0",
            "ai_available": ai_service.model is not None,
            "database_connected": supabase_healthy,
            "features": {
                "chat": True,
                "exams": True,
                "user_management": True
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "EduAI API",
            "error": str(e)
        }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Legacy chat endpoint for backward compatibility."""
    try:
        if not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        logger.info(f"💬 Processing legacy chat message: {request.message[:50]}...")
        
        # Get AI response
        ai_response = ai_service.get_response(request.message)
        
        logger.info(f"✅ AI response generated successfully")
        
        return ChatResponse(
            response=ai_response,
            success=True
        )
        
    except Exception as e:
        logger.error(f"❌ Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")


@app.get("/api")
async def api_info():
    """API information endpoint."""
    return {
        "name": "EduAI API",
        "version": "2.0.0",
        "description": "AI-powered Educational Platform",
        "endpoints": {
            "users": "/api/users",
            "chats": "/api/chats", 
            "exams": "/api/exams",
            "health": "/health",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)