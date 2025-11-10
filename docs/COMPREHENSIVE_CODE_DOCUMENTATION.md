# EduAI - Comprehensive Code Documentation

## 🎓 Overview

**EduAI** is an AI-powered educational platform that enables students to have interactive learning conversations with an AI tutor and take adaptive exams. The platform uses Google's Gemini AI for content generation and Supabase for data persistence.

### Tech Stack
- **Frontend**: React.js 19 + Vite + TailwindCSS
- **Backend**: FastAPI (Python) + Supabase
- **AI**: Google Gemini Pro
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL

---

## 📂 Project Structure

```
EduAI/
├── backend/                  # FastAPI Backend
│   ├── main.py              # Main application entry point
│   ├── requirements.txt     # Python dependencies
│   ├── app/
│   │   ├── database.py      # Supabase database client
│   │   ├── api/             # API route modules
│   │   │   ├── users.py     # User management endpoints
│   │   │   ├── chats.py     # Chat management endpoints
│   │   │   └── exams.py     # Exam management endpoints
│   │   ├── schemas/
│   │   │   └── models.py    # Pydantic data models
│   │   └── services/
│   │       └── content_generator.py  # AI content generation service
│   
├── src/                     # React Frontend
│   ├── App.jsx             # Main React component
│   ├── main.jsx            # React entry point
│   ├── supabase.jsx        # Supabase client configuration
│   ├── components/         # React components
│   │   ├── LandingPage.jsx
│   │   ├── ChatPage.jsx
│   │   ├── AuthModal.jsx
│   │   └── ...
│   ├── hooks/
│   │   └── useAuth.jsx     # Authentication hook
│   └── services/
│       └── apiService.js   # Backend API client
│
└── package.json            # Frontend dependencies
```

---

# 🔧 BACKEND ARCHITECTURE (FastAPI)

## 1. Main Application (`backend/main.py`)

### Core Setup

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="EduAI API",
    description="AI-powered Educational Platform",
    version="2.0.0"
)

# CORS Configuration for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### AI Service Integration

```python
class SimpleAI:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
    
    def get_response(self, message: str) -> str:
        """Get AI response with educational context"""
        if self.model:
            response = self.model.generate_content(
                f"You are an educational AI assistant: {message}"
            )
            return response.text
        else:
            return "Demo response (no API key configured)"
```

**Key Features:**
- Lazy initialization of Gemini AI
- Fallback to demo mode if no API key
- Educational context in prompts

### Health Check Endpoint

```python
@app.get("/health")
async def health_check():
    """Check system health including Supabase and AI"""
    return {
        "status": "healthy",
        "ai_available": ai_service.model is not None,
        "database_connected": supabase_client.health_check(),
        "features": {
            "chat": True,
            "exams": True,
            "user_management": True
        }
    }
```

---

## 2. Database Layer (`backend/app/database.py`)

### Supabase Client (Singleton Pattern)

```python
class SupabaseClient:
    """Singleton pattern ensures single database connection"""
    _instance: Optional['SupabaseClient'] = None
    _client: Optional[Client] = None
    
    def __new__(cls) -> 'SupabaseClient':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            self._initialize_client()
    
    def _initialize_client(self) -> None:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self._client = create_client(supabase_url, supabase_key)
```

**Key Design Decisions:**
- **Singleton Pattern**: Only one database connection throughout app lifecycle
- **Environment Variables**: Secure credential management
- **Health Check**: Connection validation for monitoring

---

## 3. Data Models (`backend/app/schemas/models.py`)

### User Model

```python
class UserBase(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None

class User(UserBase, TimestampModel):
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
```

### Chat Model

```python
class ChatMessage(BaseModel):
    id: str
    from_user: str  # "user" or "ai"
    text: str
    timestamp: datetime

class ChatData(BaseModel):
    messages: List[ChatMessage] = []
    metadata: ChatMetadata = ChatMetadata()

class Chat(ChatBase, TimestampModel):
    chat_id: UUID
    user_id: UUID
    title: str = "New Chat"
    subject: Optional[str] = None
    chat_data: ChatData = ChatData()
```

**Structure Logic:**
- `ChatMessage`: Individual message in conversation
- `ChatData`: Contains all messages + metadata (subject, difficulty, tags)
- `Chat`: Complete chat session with user relationship

### Exam Model

```python
class ExamQuestion(BaseModel):
    id: str
    type: str  # "mcq", "open", "true_false"
    question: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None

class ExamAnswer(BaseModel):
    question_id: str
    answer: str
    is_correct: Optional[bool] = None
    time_taken: Optional[int] = None

class ExamData(BaseModel):
    questions: List[ExamQuestion] = []
    user_answers: List[ExamAnswer] = []
    results: ExamResults = ExamResults()

class Exam(ExamBase, TimestampModel):
    exam_id: UUID
    user_id: UUID
    chat_id: Optional[UUID] = None  # Link to source chat
    status: ExamStatus = ExamStatus.IN_PROGRESS
```

**Exam Status Flow:**
```
IN_PROGRESS → User takes exam, submits answers
            ↓
        COMPLETED → Calculate results, show score
            ↓
        ABANDONED (optional) → User leaves exam
```

---

## 4. API Routes

### 4.1 Users API (`backend/app/api/users.py`)

#### Create User Profile
```python
@router.post("/", response_model=User)
async def create_user(user_data: UserCreate, db=Depends(get_db)):
    """Create new user profile in Supabase"""
    user_dict = user_data.model_dump()
    
    # Check if user exists
    existing_user = db.from_("users").select("*").eq("id", str(user_data.id)).execute()
    if existing_user.data:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Insert new user
    response = db.from_("users").insert(user_dict).execute()
    return User(**response.data[0])
```

#### Get User Profile
```python
@router.get("/{user_id}", response_model=User)
async def get_user(user_id: UUID, db=Depends(get_db)):
    """Retrieve user by ID"""
    response = db.from_("users").select("*").eq("id", str(user_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**response.data[0])
```

#### Update User Profile
```python
@router.put("/{user_id}", response_model=User)
async def update_user(user_id: UUID, user_data: UserUpdate, db=Depends(get_db)):
    """Update user profile (only non-None fields)"""
    update_dict = {k: v for k, v in user_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = "now()"
    
    response = db.from_("users").update(update_dict).eq("id", str(user_id)).execute()
    return User(**response.data[0])
```

---

### 4.2 Chats API (`backend/app/api/chats.py`)

#### Create Chat with AI-Generated Content
```python
@router.post("/generate", response_model=Chat)
async def create_chat_with_generated_content(
    user_id: UUID,
    subject: str,
    difficulty: str = "intermediate",
    db=Depends(get_db)
):
    """
    Generate complete educational conversation using AI
    1. Use ContentGenerator to create conversation
    2. Save to database
    3. Return chat with all messages
    """
    # Generate conversation
    chat_data = await content_generator.generate_chat_conversation(
        subject=subject,
        difficulty=difficulty,
        num_messages=6
    )
    
    # Create chat in database
    chat_id = uuid4()
    chat_dict = {
        "chat_id": str(chat_id),
        "user_id": str(user_id),
        "title": f"{subject} Discussion - {difficulty.title()} Level",
        "subject": subject,
        "chat_data": chat_data.model_dump()
    }
    
    response = db.from_("chats").insert(chat_dict).execute()
    return Chat(**response.data[0])
```

**Logic Flow:**
1. Frontend requests chat generation with subject + difficulty
2. Backend uses Gemini AI to generate realistic conversation
3. Conversation saved as JSONB in Supabase
4. Frontend displays pre-generated conversation

#### Get User's Chats
```python
@router.get("/user/{user_id}", response_model=List[Chat])
async def get_user_chats(
    user_id: UUID, 
    limit: int = 50, 
    offset: int = 0, 
    db=Depends(get_db)
):
    """Get all chats for a user with pagination"""
    response = (
        db.from_("chats")
        .select("*")
        .eq("user_id", str(user_id))
        .order("updated_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return [Chat(**chat) for chat in response.data]
```

#### Add Message to Chat (Interactive)
```python
@router.post("/{chat_id}/messages", response_model=ChatMessageResponse)
async def add_message_to_chat(
    chat_id: UUID, 
    message_request: ChatMessageRequest, 
    db=Depends(get_db)
):
    """
    Interactive chat: User sends message, AI responds
    1. Add user message to chat_data
    2. Get AI response
    3. Add AI message to chat_data
    4. Update database
    """
    # Get current chat
    chat = await get_chat(chat_id, db)
    
    # Create user message
    user_message = ChatMessage(
        id=str(uuid4()),
        from_user="user",
        text=message_request.message,
        timestamp=datetime.now()
    )
    chat.chat_data.messages.append(user_message)
    
    # Get AI response
    ai_response_text = ai_service.get_response(message_request.message)
    
    # Create AI message
    ai_message = ChatMessage(
        id=str(uuid4()),
        from_user="ai",
        text=ai_response_text,
        timestamp=datetime.now()
    )
    chat.chat_data.messages.append(ai_message)
    
    # Update in database
    update_dict = {
        "chat_data": chat.chat_data.model_dump(),
        "updated_at": "now()"
    }
    db.from_("chats").update(update_dict).eq("chat_id", str(chat_id)).execute()
    
    return ChatMessageResponse(
        response=ai_response_text,
        chat_id=chat_id,
        message_id=ai_message.id
    )
```

---

### 4.3 Exams API (`backend/app/api/exams.py`)

#### Generate Exam from Chat
```python
@router.post("/generate-from-chat/{chat_id}", response_model=Exam)
async def generate_exam_from_chat(
    chat_id: UUID,
    user_id: UUID,
    num_questions: int = 5,
    db=Depends(get_db)
):
    """
    Generate exam based on chat conversation content
    1. Retrieve chat conversation
    2. Analyze conversation with AI
    3. Generate relevant questions
    4. Save exam to database
    """
    # Get chat
    chat_response = db.from_("chats").select("*").eq("chat_id", str(chat_id)).execute()
    chat = Chat(**chat_response.data[0])
    
    # Generate exam from chat content
    exam_data = await content_generator.generate_exam_from_chat(
        chat_data=chat.chat_data,
        num_questions=num_questions
    )
    
    # Create exam in database
    exam_id = uuid4()
    exam_dict = {
        "exam_id": str(exam_id),
        "user_id": str(user_id),
        "chat_id": str(chat_id),
        "title": f"{chat.subject} Assessment",
        "subject": chat.subject,
        "exam_data": exam_data.model_dump(),
        "status": ExamStatus.IN_PROGRESS.value
    }
    
    response = db.from_("exams").insert(exam_dict).execute()
    return Exam(**response.data[0])
```

**Generation Logic:**
- Extracts all messages from chat
- Sends to Gemini AI with prompt: "Create questions from this conversation"
- AI returns structured JSON with questions, options, answers, explanations
- Questions directly relate to topics discussed in chat

#### Generate Exam by Topic
```python
@router.post("/generate-by-topic", response_model=Exam)
async def generate_exam_by_topic(
    user_id: UUID,
    subject: str,
    topic: Optional[str] = None,
    difficulty: str = "intermediate",
    num_questions: int = 5,
    db=Depends(get_db)
):
    """
    Generate exam for specific subject/topic
    - Used when user wants exam without chat
    - Difficulty: beginner/intermediate/advanced
    """
    exam_data = await content_generator.generate_exam_by_topic(
        subject=subject,
        topic=topic,
        difficulty=difficulty,
        num_questions=num_questions
    )
    
    # Create and save exam
    ...
```

#### Submit Answer
```python
@router.post("/{exam_id}/submit-answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    exam_id: UUID, 
    answer_request: SubmitAnswerRequest, 
    db=Depends(get_db)
):
    """
    Submit answer for a single question
    1. Verify exam is IN_PROGRESS
    2. Find the question
    3. Check if answer is correct
    4. Update user_answers in exam_data
    5. Return immediate feedback
    """
    # Get exam
    exam = await get_exam(exam_id, db)
    
    if exam.status != ExamStatus.IN_PROGRESS:
        raise HTTPException(400, "Exam is not in progress")
    
    # Find question
    question = next(q for q in exam.exam_data.questions if q.id == answer_request.question_id)
    
    # Check correctness
    is_correct = (
        answer_request.answer.strip().lower() == 
        question.correct_answer.strip().lower()
    )
    
    # Create answer
    answer = ExamAnswer(
        question_id=answer_request.question_id,
        answer=answer_request.answer,
        is_correct=is_correct
    )
    
    # Update exam (remove old answer for this question, add new)
    exam.exam_data.user_answers = [
        ans for ans in exam.exam_data.user_answers 
        if ans.question_id != answer_request.question_id
    ]
    exam.exam_data.user_answers.append(answer)
    
    # Save to database
    update_dict = {"exam_data": exam.exam_data.model_dump()}
    db.from_("exams").update(update_dict).eq("exam_id", str(exam_id)).execute()
    
    return SubmitAnswerResponse(
        success=True,
        is_correct=is_correct,
        explanation=question.explanation
    )
```

#### Complete Exam
```python
@router.post("/{exam_id}/complete", response_model=CompleteExamResponse)
async def complete_exam(exam_id: UUID, db=Depends(get_db)):
    """
    Finalize exam and calculate results
    1. Count correct answers
    2. Calculate score percentage
    3. Calculate completion rate
    4. Mark status as COMPLETED
    """
    exam = await get_exam(exam_id, db)
    
    # Calculate results
    total_questions = len(exam.exam_data.questions)
    correct_answers = sum(
        1 for answer in exam.exam_data.user_answers 
        if answer.is_correct is True
    )
    
    score = (correct_answers / total_questions * 100) if total_questions > 0 else 0
    completion_rate = (
        len(exam.exam_data.user_answers) / total_questions * 100
    ) if total_questions > 0 else 0
    
    # Update results
    exam.exam_data.results = ExamResults(
        score=score,
        total_questions=total_questions,
        correct_answers=correct_answers,
        completion_rate=completion_rate
    )
    
    exam.status = ExamStatus.COMPLETED
    
    # Save to database
    update_dict = {
        "exam_data": exam.exam_data.model_dump(),
        "status": ExamStatus.COMPLETED.value
    }
    db.from_("exams").update(update_dict).eq("exam_id", str(exam_id)).execute()
    
    return CompleteExamResponse(
        success=True,
        results=exam.exam_data.results
    )
```

---

## 5. AI Content Generator (`backend/app/services/content_generator.py`)

### Initialize Gemini AI

```python
class ContentGenerator:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None  # Fallback to demo mode
```

### Generate Chat Conversation

```python
async def generate_chat_conversation(
    self, 
    subject: str, 
    difficulty: str = "intermediate",
    num_messages: int = 6
) -> ChatData:
    """
    Create realistic educational conversation
    - Student asks questions
    - AI tutor provides helpful responses
    - Natural back-and-forth dialogue
    """
    if not self.model:
        return self._get_demo_chat_conversation(subject, difficulty)
    
    prompt = f"""
    Generate a realistic educational chat between student and AI tutor about {subject}.
    Difficulty: {difficulty}
    Messages: {num_messages} (alternating student/AI)
    
    Requirements:
    - Start with student question
    - AI provides helpful educational responses
    - Include follow-up questions
    - Natural learning conversation
    
    Format as JSON:
    {{
        "messages": [
            {{"id": "msg_1", "from_user": "user", "text": "...", "timestamp": "..."}},
            {{"id": "msg_2", "from_user": "ai", "text": "...", "timestamp": "..."}}
        ],
        "metadata": {{
            "subject": "{subject}",
            "difficulty": "{difficulty}",
            "tags": [...]
        }}
    }}
    """
    
    response = self.model.generate_content(prompt)
    chat_data_dict = json.loads(response.text)
    
    # Convert to proper objects
    messages = [ChatMessage(**msg) for msg in chat_data_dict["messages"]]
    metadata = ChatMetadata(**chat_data_dict["metadata"])
    
    return ChatData(messages=messages, metadata=metadata)
```

**AI Prompt Engineering:**
- Clear instructions for conversation structure
- Specify alternating roles (user/AI)
- Request JSON format for easy parsing
- Include educational context

### Generate Exam from Chat

```python
async def generate_exam_from_chat(
    self,
    chat_data: ChatData,
    num_questions: int = 5
) -> ExamData:
    """
    Analyze chat conversation and create relevant exam questions
    """
    # Extract conversation text
    conversation_text = "\n".join([
        f"{msg.from_user}: {msg.text}" for msg in chat_data.messages
    ])
    
    prompt = f"""
    Based on this educational conversation, generate {num_questions} exam questions.
    
    Conversation:
    {conversation_text}
    
    Requirements:
    - Multiple choice questions (3-4 options each)
    - Test understanding of discussed topics
    - Include correct answers and explanations
    - Difficulty: {chat_data.metadata.difficulty}
    
    Format as JSON:
    {{
        "questions": [
            {{
                "id": "q1",
                "type": "mcq",
                "question": "Question text?",
                "options": ["A", "B", "C"],
                "correct_answer": "A",
                "explanation": "Why this is correct"
            }}
        ]
    }}
    """
    
    response = self.model.generate_content(prompt)
    exam_dict = json.loads(response.text)
    
    questions = [ExamQuestion(**q) for q in exam_dict["questions"]]
    return ExamData(questions=questions, user_answers=[], results={})
```

### Generate Exam by Topic

```python
async def generate_exam_by_topic(
    self,
    subject: str,
    topic: Optional[str] = None,
    difficulty: str = "intermediate",
    num_questions: int = 5
) -> ExamData:
    """
    Generate exam for specific subject/topic without chat
    """
    topic_text = f" focusing on {topic}" if topic else ""
    
    prompt = f"""
    Create {num_questions} educational exam questions about {subject}{topic_text}.
    Difficulty: {difficulty}
    
    Requirements:
    - Multiple choice with 3-4 options
    - One clearly correct answer
    - Educational explanations
    - Test understanding, not just memorization
    
    Format as JSON: [questions array]
    """
    
    response = self.model.generate_content(prompt)
    exam_dict = json.loads(response.text)
    
    questions = [ExamQuestion(**q) for q in exam_dict["questions"]]
    return ExamData(questions=questions, user_answers=[], results={})
```

### Demo Fallbacks

```python
def _get_demo_chat_conversation(self, subject: str, difficulty: str) -> ChatData:
    """Fallback when no AI available"""
    messages = [
        ChatMessage(
            id="msg_1",
            from_user="user",
            text=f"Hi! Can you help me understand {subject}?",
            timestamp="2025-09-19T10:00:00Z"
        ),
        ChatMessage(
            id="msg_2",
            from_user="ai",
            text=f"Of course! I'd be happy to help with {subject}.",
            timestamp="2025-09-19T10:01:00Z"
        )
    ]
    # ... more demo messages
    
    return ChatData(messages=messages, metadata=metadata)

def _get_demo_exam(self, subject: str) -> ExamData:
    """Fallback exam when no AI"""
    questions = [
        ExamQuestion(
            id="q1",
            type="mcq",
            question=f"What is a fundamental concept in {subject}?",
            options=["Correct answer", "Wrong 1", "Wrong 2", "Wrong 3"],
            correct_answer="Correct answer",
            explanation="This is why..."
        )
    ]
    
    return ExamData(questions=questions, user_answers=[], results={})
```

---

# ⚛️ FRONTEND ARCHITECTURE (React.js)

## 1. Application Entry Point (`src/main.jsx`)

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## 2. Main App Component (`src/App.jsx`)

```jsx
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, loading, signInAnonymously } = useAuth();

  const handleGetStarted = async () => {
    if (!user && !loading) {
      await signInAnonymously();  // Demo mode
    }
    setCurrentPage('chat');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="App">
      {currentPage === 'landing' ? (
        <LandingPage 
          onGetStarted={handleGetStarted}
          onSignIn={() => setShowAuthModal(true)}
        />
      ) : (
        <ChatPage />
      )}
      
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            setCurrentPage('chat');
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
```

**App Flow:**
1. Wrap app in `AuthProvider` for global auth state
2. Show landing page by default
3. "Get Started" → Sign in anonymously (demo) → Show ChatPage
4. Optional: Show AuthModal for real authentication

---

## 3. Authentication Hook (`src/hooks/useAuth.jsx`)

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      if (session?.user) {
        await createUserProfile(session.user);
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await createUserProfile(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Sign in anonymously (demo mode)
  const signInAnonymously = async () => {
    const mockUser = {
      id: crypto.randomUUID(),
      email: 'demo@example.com',
      user_metadata: { display_name: 'Demo User' }
    };
    
    setUser(mockUser);
    localStorage.setItem('demo_user', JSON.stringify(mockUser));
    
    try {
      await createUserProfile(mockUser);
    } catch (error) {
      console.log('Database not available, continuing in demo mode');
    }
    
    return { user: mockUser, error: null };
  };

  // Create user profile in backend
  const createUserProfile = async (user) => {
    try {
      await fetch(`${API_URL}/api/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          display_name: user.user_metadata?.display_name || user.email,
          avatar_url: user.user_metadata?.avatar_url,
          preferences: {}
        })
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  const value = {
    user,
    loading,
    signInAnonymously,
    signOut: async () => {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('demo_user');
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Helper hook to get user ID
export const useUserId = () => {
  const { user } = useAuth();
  return user?.id;
};
```

**Authentication Flow:**
1. Check for existing session on mount
2. Listen for auth state changes (login/logout)
3. Create user profile in backend when signed in
4. Demo mode: Generate UUID and store in localStorage
5. Real mode: Use Supabase authentication

---

## 4. API Service (`src/services/apiService.js`)

```javascript
class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  // Generate chat with AI conversation
  async generateChat(userId, subject, difficulty = 'intermediate') {
    const response = await fetch(
      `${this.baseURL}/api/chats/generate?` +
      `user_id=${userId}&subject=${encodeURIComponent(subject)}&difficulty=${difficulty}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  // Get specific chat
  async getChat(chatId) {
    const response = await fetch(`${this.baseURL}/api/chats/${chatId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  // Get all user's chats
  async getUserChats(userId) {
    const response = await fetch(`${this.baseURL}/api/chats/user/${userId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  // Add message to chat (interactive chat)
  async addMessageToChat(chatId, message) {
    const response = await fetch(
      `${this.baseURL}/api/chats/${chatId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      }
    );
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  // Generate exam from chat
  async generateExamFromChat(chatId, userId, numQuestions = 5) {
    const response = await fetch(
      `${this.baseURL}/api/exams/generate-from-chat/${chatId}?` +
      `user_id=${userId}&num_questions=${numQuestions}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  // Generate exam by topic
  async generateExamByTopic(userId, subject, topic, difficulty, numQuestions, chatId) {
    const params = new URLSearchParams({
      user_id: userId,
      subject,
      difficulty,
      num_questions: numQuestions
    });
    
    if (topic) params.append('topic', topic);
    if (chatId) params.append('chat_id', chatId);
    
    const response = await fetch(
      `${this.baseURL}/api/exams/generate-by-topic?${params}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  // Submit answer to exam
  async submitAnswer(examId, questionId, answer) {
    const response = await fetch(
      `${this.baseURL}/api/exams/${examId}/submit-answer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: examId,
          question_id: questionId,
          answer
        })
      }
    );
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  // Complete exam
  async completeExam(examId) {
    const response = await fetch(
      `${this.baseURL}/api/exams/${examId}/complete`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  // Get exam results
  async getExamResults(examId) {
    const response = await fetch(`${this.baseURL}/api/exams/${examId}/results`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  // Get user's exams
  async getUserExams(userId) {
    const response = await fetch(`${this.baseURL}/api/exams/user/${userId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }
}

export const apiService = new ApiService();
```

**API Service Pattern:**
- Centralized API calls
- Error handling with HTTP status checks
- Environment-based base URL configuration
- Singleton instance for global access

---

## 5. Landing Page (`src/components/LandingPage.jsx`)

```jsx
function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();

  return (
    <Layout showHero={true} heroContent={
      <>
        <h2 className="text-5xl font-bold mb-6">
          AI-Powered Learning Experience
        </h2>
        <p className="text-xl mb-8">
          Ask intelligent questions, take adaptive exams, and accelerate 
          your education journey with our AI platform.
        </p>
        
        {user ? (
          <button onClick={() => window.location.href = "/chat"}>
            Continue Learning
          </button>
        ) : (
          <button onClick={() => setShowAuthModal(true)}>
            Start Learning Now
          </button>
        )}
      </>
    }>
      {/* Features Section */}
      <section id="features">
        <FeatureCard
          title="Ask Questions"
          description="Get instant, intelligent answers from our AI tutor"
        />
        <FeatureCard
          title="Take Exams"
          description="Personalized exams that adapt to your knowledge level"
        />
        <FeatureCard
          title="Track Progress"
          description="Monitor your educational journey with detailed analytics"
        />
      </section>

      {/* Testimonials */}
      <section>
        <TestimonialCard
          quote="This platform transformed how I study."
          author="Sarah, Computer Science Student"
        />
      </section>

      {/* Team Section */}
      <section id="about">
        <TeamMember name="Istiak Ahammed Rhyme" />
        {/* ... more team members */}
      </section>
    </Layout>
  );
}
```

**Landing Page Components:**
- Hero with call-to-action
- Features showcase
- Social proof (testimonials)
- Team introduction
- Responsive design with TailwindCSS

---

## 6. Chat Page (`src/components/ChatPage.jsx`)

### State Management

```jsx
function ChatPage() {
  // Chat states
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Exam states
  const [currentExam, setCurrentExam] = useState(null);
  const [examStarted, setExamStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [examLoading, setExamLoading] = useState(false);
  
  // UI states
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [examPanelWidth, setExamPanelWidth] = useState(320);
  
  const userId = useUserId();
  const currentQuestion = currentExam?.exam_data?.questions?.[currentQuestionIndex];
```

### Create New Chat with Generated Content

```jsx
const createNewChat = async (subject = "Mathematics", difficulty = "intermediate") => {
  try {
    setChatLoading(true);
    
    // Generate chat with AI conversation
    const newChat = await apiService.generateChat(userId, subject, difficulty);
    setCurrentChat(newChat);
    
    // Convert to display format
    const displayMessages = newChat.chat_data.messages.map(msg => ({
      id: msg.id,
      from: msg.from_user === 'user' ? 'user' : 'ai',
      text: msg.text
    }));
    setMessages(displayMessages);
    
    // Automatically generate exam from chat
    await generateExamFromCurrentChat(newChat.chat_id);
    
  } catch (error) {
    console.error('Failed to create chat:', error);
    await createDemoChat(subject, difficulty);  // Fallback
  } finally {
    setChatLoading(false);
  }
};
```

**Chat Creation Flow:**
1. User selects subject + difficulty
2. Backend generates full conversation with AI
3. Frontend displays conversation immediately
4. Automatically generate related exam
5. Fallback to demo mode if backend unavailable

### Generate Exam from Chat

```jsx
const generateExamFromCurrentChat = async (chatId = null) => {
  if (!chatId && !currentChat) return;
  
  try {
    setExamLoading(true);
    const examChatId = chatId || currentChat.chat_id;
    
    // Request exam generation from backend
    const newExam = await apiService.generateExamFromChat(examChatId, userId, 5);
    
    setCurrentExam(newExam);
    setExamStarted(true);
    setCurrentQuestionIndex(0);
    setAnswers({});
    
  } catch (error) {
    console.error('Failed to generate exam:', error);
    // Fallback: generate by topic
    await generateExamByTopic(currentChat?.subject || "Mathematics");
  } finally {
    setExamLoading(false);
  }
};
```

### Handle Answer Selection

```jsx
const handleAnswerSelect = async (answer) => {
  if (!currentQuestion) return;
  
  // Store answer locally
  setAnswers({
    ...answers,
    [currentQuestion.id]: answer
  });
  
  // Submit to backend
  try {
    const result = await apiService.submitAnswer(
      currentExam.exam_id,
      currentQuestion.id,
      answer
    );
    
    // Show immediate feedback (optional)
    if (result.is_correct) {
      console.log('✅ Correct!', result.explanation);
    } else {
      console.log('❌ Incorrect', result.explanation);
    }
    
  } catch (error) {
    console.error('Failed to submit answer:', error);
  }
};
```

### Navigate Questions

```jsx
const handleNext = () => {
  if (currentQuestionIndex < currentExam.exam_data.questions.length - 1) {
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  }
};

const handlePrevious = () => {
  if (currentQuestionIndex > 0) {
    setCurrentQuestionIndex(currentQuestionIndex - 1);
  }
};
```

### Submit Exam

```jsx
const handleSubmitExam = async () => {
  try {
    setExamSubmitting(true);
    
    // Complete exam and get results
    const response = await apiService.completeExam(currentExam.exam_id);
    
    // Show results
    alert(`
      Exam Complete!
      Score: ${response.results.score}%
      Correct: ${response.results.correct_answers}/${response.results.total_questions}
    `);
    
    setExamStarted(false);
    
  } catch (error) {
    console.error('Failed to submit exam:', error);
  } finally {
    setExamSubmitting(false);
  }
};
```

### Send Interactive Message

```jsx
const handleSendMessage = async () => {
  if (!input.trim() || !currentChat) return;
  
  try {
    setIsLoading(true);
    
    // Add user message to UI immediately
    const userMessage = { id: Date.now(), from: 'user', text: input };
    setMessages([...messages, userMessage]);
    setInput('');
    
    // Send to backend and get AI response
    const response = await apiService.addMessageToChat(currentChat.chat_id, input);
    
    // Add AI response to UI
    const aiMessage = {
      id: response.message_id,
      from: 'ai',
      text: response.response
    };
    setMessages(prev => [...prev, aiMessage]);
    
  } catch (error) {
    console.error('Failed to send message:', error);
  } finally {
    setIsLoading(false);
  }
};
```

### UI Rendering

```jsx
return (
  <div className="flex h-screen">
    {/* Chat Panel */}
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <h1 className="text-xl font-bold">
          {currentChat?.title || "Chat"}
        </h1>
        <button onClick={() => setShowNewChatModal(true)}>
          New Chat
        </button>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={msg.from === 'user' ? 'user-message' : 'ai-message'}
          >
            {msg.text}
          </div>
        ))}
        {chatLoading && <LoadingSpinner />}
      </div>
      
      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
    
    {/* Exam Panel */}
    <div
      className="border-l bg-gray-50"
      style={{ width: `${examPanelWidth}px` }}
    >
      {examStarted && currentQuestion ? (
        <>
          {/* Question */}
          <div className="p-4">
            <p className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {currentExam.exam_data.questions.length}
            </p>
            <h3 className="text-lg font-semibold mt-2">
              {currentQuestion.question}
            </h3>
          </div>
          
          {/* Options */}
          <div className="p-4 space-y-2">
            {currentQuestion.options?.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                className={`
                  w-full text-left p-3 rounded border
                  ${answers[currentQuestion.id] === option 
                    ? 'bg-blue-100 border-blue-500' 
                    : 'bg-white hover:bg-gray-50'}
                `}
              >
                {option}
              </button>
            ))}
          </div>
          
          {/* Navigation */}
          <div className="p-4 flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 border rounded"
            >
              Previous
            </button>
            
            {currentQuestionIndex === currentExam.exam_data.questions.length - 1 ? (
              <button
                onClick={handleSubmitExam}
                disabled={examSubmitting}
                className="px-4 py-2 bg-green-500 text-white rounded"
              >
                Submit Exam
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Next
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="p-4 text-center">
          <p className="text-gray-600 mb-4">No active exam</p>
          <button
            onClick={() => generateExamFromCurrentChat()}
            disabled={!currentChat || examLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Generate Exam
          </button>
        </div>
      )}
    </div>
    
    {/* New Chat Modal */}
    {showNewChatModal && (
      <NewChatModal
        onClose={() => setShowNewChatModal(false)}
        onCreate={createNewChat}
      />
    )}
  </div>
);
```

---

# 🔄 COMPLETE USER FLOW

## Scenario 1: New User Learning Flow

1. **Landing Page**
   - User visits website
   - Sees hero section, features, testimonials
   - Clicks "Start Learning Now"

2. **Authentication**
   - `signInAnonymously()` creates demo user
   - User ID generated and stored
   - User profile created in backend database

3. **Chat Creation**
   - User clicks "New Chat" button
   - Modal appears: Select subject (Math, Science, History) + difficulty
   - User selects "Mathematics" + "Intermediate"
   - Frontend calls: `apiService.generateChat(userId, "Mathematics", "intermediate")`

4. **Backend Chat Generation**
   - `ContentGenerator.generate_chat_conversation()` called
   - Gemini AI generates 6-message conversation
   - AI creates:
     - Student: "Can you help me with algebra?"
     - AI: "Of course! Let's start with basic equations..."
     - Student: "What about quadratic equations?"
     - AI: "Great question! Quadratic equations have the form..."
     - [2 more message pairs]
   - Chat saved to Supabase with JSONB data

5. **Display Chat**
   - Frontend receives chat with all messages
   - Messages displayed in chat panel
   - User can read the educational conversation

6. **Automatic Exam Generation**
   - After chat created, frontend calls: `apiService.generateExamFromChat(chatId, userId, 5)`
   - Backend analyzes conversation
   - Gemini AI generates 5 MCQ questions:
     - "What is the standard form of a quadratic equation?"
     - "How do you solve a linear equation?"
     - etc.
   - Each question includes:
     - 4 multiple choice options
     - Correct answer
     - Explanation
   - Exam saved to database with status IN_PROGRESS

7. **Taking Exam**
   - Exam panel shows Question 1
   - User selects answer "ax² + bx + c = 0"
   - Frontend calls: `apiService.submitAnswer(examId, "q1", "ax² + bx + c = 0")`
   - Backend checks correctness
   - Returns: `{is_correct: true, explanation: "..."}`
   - User clicks "Next" to Question 2
   - Repeat for all 5 questions

8. **Complete Exam**
   - User on last question, clicks "Submit Exam"
   - Frontend calls: `apiService.completeExam(examId)`
   - Backend calculates:
     - Total questions: 5
     - Correct answers: 4
     - Score: 80%
     - Completion rate: 100%
   - Results saved, status changed to COMPLETED
   - Frontend displays results modal

9. **Interactive Chat (Optional)**
   - User types in input: "Can you explain more about factoring?"
   - Frontend calls: `apiService.addMessageToChat(chatId, message)`
   - Backend adds user message to chat_data
   - Gemini AI generates response
   - AI message added to chat_data
   - Both messages returned and displayed
   - Conversation continues...

---

## Scenario 2: Topic-Based Exam (No Chat)

1. User clicks "Take Exam" without creating chat
2. Modal: Select subject + topic + difficulty
3. User selects: "Physics" + "Newton's Laws" + "Advanced"
4. Frontend calls: `apiService.generateExamByTopic(userId, "Physics", "Newton's Laws", "advanced", 10)`
5. Backend generates 10 advanced physics questions
6. User takes exam (same flow as above)

---

# 🗄️ DATABASE SCHEMA (Supabase)

## Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Chats Table

```sql
CREATE TABLE chats (
  chat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  chat_data JSONB NOT NULL DEFAULT '{"messages": [], "metadata": {}}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_updated_at ON chats(updated_at DESC);
```

**chat_data JSONB structure:**
```json
{
  "messages": [
    {
      "id": "msg_1",
      "from_user": "user",
      "text": "Message text",
      "timestamp": "2025-09-19T10:00:00Z"
    }
  ],
  "metadata": {
    "subject": "Mathematics",
    "difficulty": "intermediate",
    "tags": ["math", "algebra"],
    "language": "en"
  }
}
```

## Exams Table

```sql
CREATE TABLE exams (
  exam_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(chat_id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  exam_data JSONB NOT NULL DEFAULT '{"questions": [], "user_answers": [], "results": {}}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- Indexes
CREATE INDEX idx_exams_user_id ON exams(user_id);
CREATE INDEX idx_exams_chat_id ON exams(chat_id);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_created_at ON exams(created_at DESC);
```

**exam_data JSONB structure:**
```json
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "What is 2+2?",
      "options": ["3", "4", "5", "6"],
      "correct_answer": "4",
      "explanation": "Basic addition"
    }
  ],
  "user_answers": [
    {
      "question_id": "q1",
      "answer": "4",
      "is_correct": true,
      "time_taken": 5
    }
  ],
  "results": {
    "score": 80.0,
    "total_questions": 5,
    "correct_answers": 4,
    "time_taken": 300,
    "completion_rate": 100.0
  }
}
```

---

# 🔐 ENVIRONMENT VARIABLES

## Backend (.env)

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Server
PORT=8000
HOST=0.0.0.0
```

## Frontend (.env)

```bash
# Backend API
VITE_API_URL=http://localhost:8000

# Supabase (for auth)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

# 🚀 RUNNING THE APPLICATION

## Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your credentials

# Run server
python main.py
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server runs on: http://localhost:8000
API docs: http://localhost:8000/docs

## Frontend Setup

```bash
cd EduAI

# Install dependencies
npm install

# Create .env file

# Run development server
npm run dev
```

App runs on: http://localhost:5173

---

# 🎯 KEY DESIGN PATTERNS

## 1. Singleton Pattern (Database Client)
- Single database connection shared across all requests
- Thread-safe initialization
- Resource efficiency

## 2. Dependency Injection (FastAPI)
- `Depends(get_db)` provides database client to routes
- Easy testing and mocking
- Clean separation of concerns

## 3. Context Provider (React)
- `AuthProvider` wraps entire app
- Global auth state accessible via `useAuth()` hook
- Automatic session management

## 4. Service Layer (Backend)
- Business logic separated from routes
- `ContentGenerator` service for AI operations
- Reusable across multiple endpoints

## 5. API Client Pattern (Frontend)
- Centralized API calls in `apiService`
- Error handling in one place
- Easy to mock for testing

---

# 🔍 ERROR HANDLING

## Backend

```python
try:
    # Operation
    result = db.from_("users").select("*").execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]
except HTTPException:
    raise  # Re-raise HTTP exceptions
except Exception as e:
    logger.error(f"Error: {e}")
    raise HTTPException(status_code=500, detail=str(e))
```

## Frontend

```javascript
try {
  const chat = await apiService.generateChat(userId, subject, difficulty);
  setCurrentChat(chat);
} catch (error) {
  console.error('Failed to create chat:', error);
  // Fallback to demo mode
  await createDemoChat(subject, difficulty);
}
```

---

# 📊 PERFORMANCE OPTIMIZATIONS

1. **JSONB Storage**: Fast queries on nested data without joins
2. **Database Indexes**: Fast lookups on user_id, created_at
3. **Pagination**: Limit/offset to avoid loading all data
4. **Lazy Loading**: Only load messages when chat opened
5. **Caching**: Store user in localStorage (demo mode)
6. **Connection Pooling**: Supabase manages connection pool
7. **React Memoization**: Use `useMemo`/`useCallback` for expensive operations

---

# 🧪 TESTING STRATEGIES

## Backend Tests

```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_chat():
    response = client.post("/api/chats/generate", params={
        "user_id": "test-uuid",
        "subject": "Math",
        "difficulty": "intermediate"
    })
    assert response.status_code == 200
    assert "chat_id" in response.json()
```

## Frontend Tests

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import ChatPage from './components/ChatPage';

test('sends message on button click', async () => {
  render(<ChatPage />);
  
  const input = screen.getByPlaceholderText('Type your message...');
  const button = screen.getByText('Send');
  
  fireEvent.change(input, { target: { value: 'Hello' } });
  fireEvent.click(button);
  
  expect(await screen.findByText('Hello')).toBeInTheDocument();
});
```

---

# 🔮 FUTURE ENHANCEMENTS

1. **Real-time Chat**: WebSocket support for instant AI responses
2. **Progress Tracking**: Analytics dashboard showing learning progress
3. **Spaced Repetition**: Review system for exam questions
4. **Collaborative Learning**: Group chats and shared exams
5. **Voice Input**: Speech-to-text for questions
6. **PDF Upload**: Generate exams from uploaded materials
7. **Gamification**: Points, badges, leaderboards
8. **Mobile App**: React Native version
9. **Offline Mode**: Service workers for offline access
10. **Multiple AI Models**: Support for Claude, GPT-4, etc.

---

# 📝 SUMMARY

**EduAI** is a full-stack educational platform that leverages AI to create personalized learning experiences. The backend (FastAPI + Supabase + Gemini AI) generates dynamic educational content and manages user data, while the frontend (React + TailwindCSS) provides an intuitive interface for learning and assessment.

**Key Technologies:**
- **Backend**: FastAPI, Supabase, Google Gemini AI
- **Frontend**: React 19, Vite, TailwindCSS, Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **AI**: Google Gemini Pro for content generation

**Core Features:**
1. AI-generated educational conversations
2. Adaptive exam generation from conversations
3. Real-time answer validation
4. Comprehensive results tracking
5. User profile management
6. Authentication (demo + real mode)

This architecture is scalable, maintainable, and provides a solid foundation for building advanced educational features.

---

**Created for EduAI Platform**  
*Empowering education through artificial intelligence*
