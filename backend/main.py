"""
Cognify AI Learning Platform - Backend API
A modern, AI-powered educational platform with intelligent chat and adaptive learning.
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
import os
from datetime import datetime
from dotenv import load_dotenv
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()

# Import database
from app.database import Database, MongoDataStore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# Application Lifespan
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("🚀 Cognify AI Learning Platform starting...")
    
    # Connect to MongoDB
    mongodb_connected = await Database.connect_db()
    
    if mongodb_connected:
        logger.info("✅ MongoDB connected")
        # Initialize global data store with MongoDB
        app.state.data_store = MongoDataStore(Database.get_db())
    else:
        logger.warning("⚠️  Running without database connection")
        # Fallback to in-memory storage
        app.state.data_store = InMemoryDataStore()
    
    # Check AI service
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        logger.info("✅ AI Service: Enabled")
    else:
        logger.info("✅ AI Service: Demo Mode")
    
    logger.info("✅ Server ready at http://localhost:8000")
    logger.info("📚 API Docs at http://localhost:8000/docs")
    
    yield
    
    # Shutdown
    logger.info("👋 Cognify AI Learning Platform shutting down...")
    await Database.close_db()

# ============================================================================
# FastAPI Application Configuration
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
# CORS Configuration
# ============================================================================

# Allow frontend origins
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Authentication Utilities
# ============================================================================

from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import timedelta

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def hash_password(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ============================================================================
# AI Service
# ============================================================================

class AIService:
    """
    AI Service using Google Gemini for educational content generation.
    Provides intelligent responses, content generation, and adaptive learning.
    """
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = None
        self._initialize()
    
    def _initialize(self) -> None:
        """Initialize the Gemini AI model."""
        if not self.api_key:
            logger.warning("⚠️  GEMINI_API_KEY not found. Using demo mode.")
            return
        
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
            logger.info("✅ Gemini AI initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Gemini AI: {e}")
            self.model = None
    
    def generate_response(self, prompt: str, context: Optional[str] = None) -> str:
        """Generate AI response to a prompt."""
        if not self.model:
            return self._demo_response(prompt)
        
        try:
            full_prompt = self._build_prompt(prompt, context)
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            logger.error(f"AI generation error: {e}")
            return f"I apologize, but I encountered an error: {str(e)}"
    
    def _build_prompt(self, prompt: str, context: Optional[str] = None) -> str:
        """Build a comprehensive prompt for the AI."""
        system_context = """You are an expert educational AI assistant for Cognify, a modern learning platform.

Your role:
- Provide clear, accurate, and engaging educational content
- Adapt explanations to the user's level
- Use examples and analogies to clarify concepts
- Encourage critical thinking
- Be patient and supportive

Always:
- Break down complex topics into digestible parts
- Use markdown formatting for better readability
- Provide practical examples
- Encourage questions and deeper exploration
"""
        
        if context:
            return f"{system_context}\n\nContext: {context}\n\nUser Question: {prompt}"
        return f"{system_context}\n\nUser Question: {prompt}"
    
    def _demo_response(self, prompt: str) -> str:
        """Provide demo response when AI is not available."""
        return f"""🤖 **Demo Mode Response**

You asked: *{prompt}*

**Note:** This is a demo response. To enable real AI-powered responses:
1. Get a Google Gemini API key from: https://makersuite.google.com/app/apikey
2. Add it to your `.env` file as `GEMINI_API_KEY=your_key_here`
3. Restart the backend server

**Features available with real AI:**
- Intelligent, context-aware responses
- Personalized learning paths
- Adaptive difficulty adjustment
- Custom exam generation
- Detailed explanations with examples

Ready to unlock the full potential of Cognify! 🚀"""
    
    def generate_chat_conversation(
        self,
        topic: str,
        difficulty: str = "intermediate",
        num_exchanges: int = 3
    ) -> List[Dict[str, str]]:
        """Generate an educational chat conversation on a topic."""
        if not self.model:
            return self._demo_conversation(topic, difficulty)
        
        try:
            prompt = f"""Generate an educational conversation about {topic} at {difficulty} difficulty level.

Create {num_exchanges} question-answer exchanges that:
1. Start with fundamentals and build up complexity
2. Include practical examples
3. Encourage deeper understanding
4. Are engaging and conversational

Format each exchange as:
Q: [Student question]
A: [Expert answer]

Make it natural and educational."""
            
            response = self.model.generate_content(prompt)
            return self._parse_conversation(response.text)
        except Exception as e:
            logger.error(f"Conversation generation error: {e}")
            return self._demo_conversation(topic, difficulty)
    
    def _parse_conversation(self, text: str) -> List[Dict[str, str]]:
        """Parse AI-generated conversation into structured format."""
        messages = []
        lines = text.split('\n')
        current_q = None
        current_a = []
        
        for line in lines:
            line = line.strip()
            if line.startswith('Q:'):
                if current_q and current_a:
                    messages.append({
                        "role": "user",
                        "content": current_q
                    })
                    messages.append({
                        "role": "assistant",
                        "content": ' '.join(current_a)
                    })
                    current_a = []
                current_q = line[2:].strip()
            elif line.startswith('A:'):
                current_a.append(line[2:].strip())
            elif current_q and line:
                current_a.append(line)
        
        # Add last exchange
        if current_q and current_a:
            messages.append({"role": "user", "content": current_q})
            messages.append({"role": "assistant", "content": ' '.join(current_a)})
        
        return messages if messages else self._demo_conversation("the topic", "intermediate")
    
    def _demo_conversation(self, topic: str, difficulty: str) -> List[Dict[str, str]]:
        """Generate demo conversation."""
        return [
            {
                "role": "user",
                "content": f"Can you explain {topic} to me?"
            },
            {
                "role": "assistant",
                "content": f"I'd be happy to explain {topic}! This is a demo conversation. Enable AI for detailed, personalized explanations."
            },
            {
                "role": "user",
                "content": f"What are the key concepts in {topic}?"
            },
            {
                "role": "assistant",
                "content": f"The key concepts would be explained here with real AI. Get your Gemini API key to unlock full features!"
            }
        ]
    
    def generate_exam_questions(
        self,
        topic: str,
        difficulty: str = "intermediate",
        num_questions: int = 5
    ) -> List[Dict[str, Any]]:
        """Generate exam questions on a topic."""
        if not self.model:
            return self._demo_exam(topic, num_questions)
        
        try:
            prompt = f"""Create {num_questions} {difficulty} level exam questions about {topic}.

For each question provide:
1. Question text
2. Four answer options (A, B, C, D)
3. Correct answer
4. Brief explanation

Format as JSON-like structure:
Question 1: [text]
A) [option]
B) [option]
C) [option]
D) [option]
Correct: [letter]
Explanation: [text]"""
            
            response = self.model.generate_content(prompt)
            return self._parse_exam_questions(response.text)
        except Exception as e:
            logger.error(f"Exam generation error: {e}")
            return self._demo_exam(topic, num_questions)
    
    def _parse_exam_questions(self, text: str) -> List[Dict[str, Any]]:
        """Parse AI-generated exam questions."""
        # Simplified parsing - in production, use more robust parsing
        questions = []
        current = {}
        
        for line in text.split('\n'):
            line = line.strip()
            if line.startswith('Question'):
                if current:
                    questions.append(current)
                current = {"question": line.split(':', 1)[1].strip() if ':' in line else line, "options": []}
            elif line.startswith(('A)', 'B)', 'C)', 'D)')):
                current.get("options", []).append(line[2:].strip())
            elif line.startswith('Correct:'):
                current["correct"] = line.split(':', 1)[1].strip()
            elif line.startswith('Explanation:'):
                current["explanation"] = line.split(':', 1)[1].strip()
        
        if current:
            questions.append(current)
        
        return questions if questions else self._demo_exam("the topic", 3)
    
    def _demo_exam(self, topic: str, num_questions: int) -> List[Dict[str, Any]]:
        """Generate demo exam questions."""
        return [
            {
                "question": f"Sample question {i+1} about {topic}?",
                "options": [
                    "Option A (Demo)",
                    "Option B (Demo)",
                    "Option C (Demo)",
                    "Option D (Demo)"
                ],
                "correct": "A",
                "explanation": "This is a demo question. Enable AI for real adaptive exams!"
            }
            for i in range(min(num_questions, 3))
        ]

# Initialize AI service
ai_service = AIService()

# ============================================================================
# In-Memory Data Store (Fallback if MongoDB is unavailable)
# ============================================================================

class InMemoryDataStore:
    """Simple in-memory data store for demo purposes."""
    
    def __init__(self):
        self.users: Dict[str, Dict] = {}
        self.chats: Dict[str, Dict] = {}
        self.exams: Dict[str, Dict] = {}
        self.sessions: Dict[str, Dict] = {}
    
    async def add_user(self, user_id: str, user_data: Dict) -> Dict:
        """Add user to store."""
        user_data["id"] = user_id
        user_data["created_at"] = datetime.now().isoformat()
        self.users[user_id] = user_data
        return user_data
    
    async def get_user(self, user_id: str) -> Optional[Dict]:
        """Get user from store."""
        return self.users.get(user_id)
    
    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user from store by email."""
        for user in self.users.values():
            if user.get("email") == email:
                return user
        return None
    
    async def add_chat(self, chat_id: str, chat_data: Dict) -> Dict:
        """Add chat to store."""
        chat_data["id"] = chat_id
        chat_data["created_at"] = datetime.now().isoformat()
        self.chats[chat_id] = chat_data
        return chat_data
    
    async def get_chat(self, chat_id: str) -> Optional[Dict]:
        """Get chat from store."""
        return self.chats.get(chat_id)
    
    async def get_user_chats(self, user_id: str) -> List[Dict]:
        """Get all chats for a user."""
        return [chat for chat in self.chats.values() if chat.get("user_id") == user_id]
    
    async def add_exam(self, exam_id: str, exam_data: Dict) -> Dict:
        """Add exam to store."""
        exam_data["id"] = exam_id
        exam_data["created_at"] = datetime.now().isoformat()
        self.exams[exam_id] = exam_data
        return exam_data
    
    async def get_exam(self, exam_id: str) -> Optional[Dict]:
        """Get exam from store."""
        return self.exams.get(exam_id)
    
    async def update_exam(self, exam_id: str, updates: Dict) -> Optional[Dict]:
        """Update exam in store."""
        if exam_id in self.exams:
            self.exams[exam_id].update(updates)
            return self.exams[exam_id]
        return None

# ============================================================================
# Request/Response Models
# ============================================================================

class ChatRequest(BaseModel):
    """Request model for chat."""
    message: str = Field(..., description="User message", min_length=1)
    user_id: Optional[str] = Field(None, description="User ID for context")
    context: Optional[str] = Field(None, description="Additional context")

class ChatResponse(BaseModel):
    """Response model for chat."""
    response: str = Field(..., description="AI response")
    timestamp: str = Field(..., description="Response timestamp")
    user_id: Optional[str] = None

class ChatCreateRequest(BaseModel):
    """Request to create a new chat conversation."""
    user_id: str = Field(..., description="User ID")
    topic: str = Field(..., description="Chat topic", min_length=1)
    difficulty: str = Field("intermediate", description="Difficulty level")

class ExamCreateRequest(BaseModel):
    """Request to create a new exam."""
    user_id: str = Field(..., description="User ID")
    topic: str = Field(..., description="Exam topic", min_length=1)
    difficulty: str = Field("intermediate", description="Difficulty level")
    num_questions: int = Field(5, description="Number of questions", ge=1, le=20)

class ExamSubmitRequest(BaseModel):
    """Request to submit exam answers."""
    exam_id: str = Field(..., description="Exam ID")
    answers: Dict[int, str] = Field(..., description="Question index to answer mapping")

class UserCreateRequest(BaseModel):
    """Request to create a new user."""
    email: str = Field(..., description="User email")
    name: Optional[str] = Field(None, description="User name")

class SignUpRequest(BaseModel):
    """Request to sign up a new user."""
    email: str = Field(..., description="User email")
    password: str = Field(..., min_length=6, description="User password (min 6 characters)")
    fullName: str = Field(..., description="User full name")

class SignInRequest(BaseModel):
    """Request to sign in."""
    email: str = Field(..., description="User email")
    password: str = Field(..., description="User password")

# ============================================================================
# API Routes
# ============================================================================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Cognify AI Learning Platform",
        "version": "3.0.0",
        "status": "active",
        "ai_enabled": ai_service.model is not None,
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "chat": "/api/chat",
            "users": "/api/users",
            "chats": "/api/chats",
            "exams": "/api/exams"
        },
        "message": "Welcome to Cognify! Check /docs for API documentation."
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Cognify AI Learning Platform",
        "version": "3.0.0",
        "ai_service": {
            "available": ai_service.model is not None,
            "provider": "Google Gemini",
            "model": "gemini-2.0-flash-exp" if ai_service.model else "demo"
        },
        "features": {
            "chat": True,
            "exams": True,
            "adaptive_learning": True,
            "content_generation": True
        }
    }

# ============================================================================
# Chat Endpoints
# ============================================================================

@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest):
    """
    Send a message and get an AI response.
    
    This is the main chat endpoint for conversational learning.
    """
    try:
        if not request.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )
        
        logger.info(f"💬 Processing chat message: {request.message[:50]}...")
        
        # Generate AI response
        response_text = ai_service.generate_response(
            request.message,
            context=request.context
        )
        
        return ChatResponse(
            response=response_text,
            timestamp=datetime.now().isoformat(),
            user_id=request.user_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat: {str(e)}"
        )

@app.post("/api/chats", tags=["Chat"])
async def create_chat(request: ChatCreateRequest):
    """
    Create a new chat conversation with AI-generated content.
    
    This generates an educational conversation on a specific topic.
    """
    try:
        logger.info(f"📝 Creating chat: {request.topic} ({request.difficulty})")
        
        # Generate conversation
        messages = ai_service.generate_chat_conversation(
            topic=request.topic,
            difficulty=request.difficulty,
            num_exchanges=3
        )
        
        # Create chat in store
        import uuid
        chat_id = f"chat_{uuid.uuid4().hex[:8]}"
        chat_data = {
            "user_id": request.user_id,
            "topic": request.topic,
            "difficulty": request.difficulty,
            "messages": messages
        }
        
        chat = await app.state.data_store.add_chat(chat_id, chat_data)
        
        return {
            "success": True,
            "chat_id": chat_id,
            "chat": chat,
            "message": "Chat created successfully"
        }
        
    except Exception as e:
        logger.error(f"Create chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create chat: {str(e)}"
        )

@app.get("/api/chats/{chat_id}", tags=["Chat"])
async def get_chat(chat_id: str):
    """Get a specific chat by ID."""
    chat = await app.state.data_store.get_chat(chat_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    return chat

@app.get("/api/users/{user_id}/chats", tags=["Chat"])
async def get_user_chats(user_id: str):
    """Get all chats for a specific user."""
    chats = await app.state.data_store.get_user_chats(user_id)
    return {
        "user_id": user_id,
        "total": len(chats),
        "chats": chats
    }

# ============================================================================
# Exam Endpoints
# ============================================================================

@app.post("/api/exams", tags=["Exams"])
async def create_exam(request: ExamCreateRequest):
    """
    Create a new adaptive exam on a topic.
    
    Generates personalized questions based on difficulty level.
    """
    try:
        logger.info(f"📝 Creating exam: {request.topic} ({request.difficulty})")
        
        # Generate exam questions
        questions = ai_service.generate_exam_questions(
            topic=request.topic,
            difficulty=request.difficulty,
            num_questions=request.num_questions
        )
        
        # Create exam in store
        import uuid
        exam_id = f"exam_{uuid.uuid4().hex[:8]}"
        exam_data = {
            "user_id": request.user_id,
            "topic": request.topic,
            "difficulty": request.difficulty,
            "questions": questions,
            "status": "active",
            "submitted": False,
            "score": None
        }
        
        exam = await app.state.data_store.add_exam(exam_id, exam_data)
        
        # Remove correct answers and explanations from response
        safe_questions = [
            {
                "index": i,
                "question": q.get("question"),
                "options": q.get("options", [])
            }
            for i, q in enumerate(questions)
        ]
        
        return {
            "success": True,
            "exam_id": exam_id,
            "topic": request.topic,
            "difficulty": request.difficulty,
            "num_questions": len(questions),
            "questions": safe_questions,
            "message": "Exam created successfully"
        }
        
    except Exception as e:
        logger.error(f"Create exam error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create exam: {str(e)}"
        )

@app.post("/api/exams/submit", tags=["Exams"])
async def submit_exam(request: ExamSubmitRequest):
    """
    Submit exam answers for grading.
    
    Returns score and detailed feedback for each question.
    """
    try:
        exam = await app.state.data_store.get_exam(request.exam_id)
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam not found"
            )
        
        if exam.get("submitted"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exam already submitted"
            )
        
        # Grade exam
        questions = exam["questions"]
        results = []
        correct_count = 0
        
        for i, question in enumerate(questions):
            user_answer = request.answers.get(i, "")
            correct_answer = question.get("correct", "")
            is_correct = user_answer.upper() == correct_answer.upper()
            
            if is_correct:
                correct_count += 1
            
            results.append({
                "question_index": i,
                "question": question.get("question"),
                "your_answer": user_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "explanation": question.get("explanation", "")
            })
        
        score = (correct_count / len(questions)) * 100 if questions else 0
        
        # Update exam
        await app.state.data_store.update_exam(request.exam_id, {
            "submitted": True,
            "score": score,
            "results": results,
            "submitted_at": datetime.now().isoformat()
        })
        
        return {
            "success": True,
            "exam_id": request.exam_id,
            "score": round(score, 2),
            "correct": correct_count,
            "total": len(questions),
            "percentage": f"{round(score, 1)}%",
            "results": results,
            "message": f"You scored {correct_count}/{len(questions)} ({round(score, 1)}%)"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Submit exam error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit exam: {str(e)}"
        )

@app.get("/api/exams/{exam_id}", tags=["Exams"])
async def get_exam(exam_id: str):
    """Get exam details (only after submission)."""
    exam = await app.state.data_store.get_exam(exam_id)
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )
    
    # If not submitted, don't show answers
    if not exam.get("submitted"):
        safe_exam = {
            "id": exam_id,
            "topic": exam.get("topic"),
            "difficulty": exam.get("difficulty"),
            "status": exam.get("status"),
            "submitted": False,
            "num_questions": len(exam.get("questions", []))
        }
        return safe_exam
    
    return exam

# ============================================================================
# Authentication Endpoints
# ============================================================================

@app.post("/api/auth/signup", tags=["Authentication"])
async def sign_up(request: SignUpRequest):
    """
    Sign up a new user with email and password.
    Creates a user account and returns authentication token.
    """
    try:
        # Check if user already exists
        existing_user = await app.state.data_store.get_user_by_email(request.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = hash_password(request.password)
        
        # Create user
        import uuid
        user_id = f"user_{uuid.uuid4().hex[:8]}"
        user_data = {
            "email": request.email,
            "name": request.fullName,
            "password": hashed_password,
            "created_at": datetime.now().isoformat()
        }
        
        user = await app.state.data_store.add_user(user_id, user_data)
        
        # Create access token
        access_token = create_access_token(data={"sub": user_id, "email": request.email})
        
        # Remove password from response
        user_response = {
            "id": user_id,
            "email": user["email"],
            "name": user["name"],
            "created_at": user["created_at"]
        }
        
        return {
            "success": True,
            "user": user_response,
            "access_token": access_token,
            "token_type": "bearer",
            "message": "Account created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sign up error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create account: {str(e)}"
        )

@app.post("/api/auth/signin", tags=["Authentication"])
async def sign_in(request: SignInRequest):
    """
    Sign in with email and password.
    Returns authentication token for authenticated user.
    """
    try:
        # Get user by email
        user = await app.state.data_store.get_user_by_email(request.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not verify_password(request.password, user.get("password", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create access token
        user_id = user.get("id") or user.get("_id")
        access_token = create_access_token(data={"sub": str(user_id), "email": user["email"]})
        
        # Remove password from response
        user_response = {
            "id": str(user_id),
            "email": user["email"],
            "name": user.get("name", ""),
            "created_at": user.get("created_at", "")
        }
        
        return {
            "success": True,
            "user": user_response,
            "access_token": access_token,
            "token_type": "bearer",
            "message": "Signed in successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sign in error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sign in: {str(e)}"
        )

# ============================================================================
# User Endpoints
# ============================================================================

@app.post("/api/users", tags=["Users"])
async def create_user(request: UserCreateRequest):
    """Create a new user profile."""
    try:
        import uuid
        user_id = f"user_{uuid.uuid4().hex[:8]}"
        user_data = {
            "email": request.email,
            "name": request.name or request.email.split('@')[0]
        }
        
        user = await app.state.data_store.add_user(user_id, user_data)
        
        return {
            "success": True,
            "user_id": user_id,
            "user": user,
            "message": "User created successfully"
        }
        
    except Exception as e:
        logger.error(f"Create user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@app.get("/api/users/{user_id}", tags=["Users"])
async def get_user(user_id: str):
    """Get user profile."""
    user = await app.state.data_store.get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

# ============================================================================
# Application Startup/Shutdown
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    logger.info("🚀 Cognify AI Learning Platform starting...")
    logger.info(f"✅ AI Service: {'Enabled' if ai_service.model else 'Demo Mode'}")
    logger.info("✅ Server ready at http://localhost:8000")
    logger.info("📚 API Docs at http://localhost:8000/docs")

@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    logger.info("👋 Cognify AI Learning Platform shutting down...")

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
