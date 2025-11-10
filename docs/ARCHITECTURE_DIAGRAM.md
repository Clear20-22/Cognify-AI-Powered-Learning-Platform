# EduAI System Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT SIDE                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  React Frontend (Vite)                     │ │
│  │                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │ LandingPage  │  │   ChatPage   │  │   AuthModal     │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │ │
│  │                                                             │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │           useAuth Hook (Context)                   │   │ │
│  │  │  • User state management                           │   │ │
│  │  │  • Supabase Auth integration                       │   │ │
│  │  │  • Anonymous demo mode                             │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │           apiService (API Client)                  │   │ │
│  │  │  • HTTP requests to backend                        │   │ │
│  │  │  • Error handling                                  │   │ │
│  │  │  • Environment-based URL                           │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTP/REST
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER SIDE                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              FastAPI Backend (Python)                      │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │                  main.py (App)                       │ │ │
│  │  │  • CORS middleware                                   │ │ │
│  │  │  • Router registration                               │ │ │
│  │  │  • SimpleAI service                                  │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │ users.py     │  │ chats.py     │  │   exams.py      │ │ │
│  │  │ (API Routes) │  │ (API Routes) │  │   (API Routes)  │ │ │
│  │  │              │  │              │  │                 │ │ │
│  │  │ • Create     │  │ • Generate   │  │ • From chat     │ │ │
│  │  │ • Read       │  │ • Update     │  │ • By topic      │ │ │
│  │  │ • Update     │  │ • Add msg    │  │ • Submit answer │ │ │
│  │  │ • Delete     │  │ • Get msgs   │  │ • Complete      │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │ │
│  │                                                             │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │          content_generator.py (AI Service)         │   │ │
│  │  │  • generate_chat_conversation()                    │   │ │
│  │  │  • generate_exam_from_chat()                       │   │ │
│  │  │  • generate_exam_by_topic()                        │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  │                      │                                     │ │
│  │                      │                                     │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │          database.py (Supabase Client)             │   │ │
│  │  │  • Singleton pattern                               │   │ │
│  │  │  • Connection management                           │   │ │
│  │  │  • Health check                                    │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                │                              │
                │                              │
                ▼                              ▼
┌──────────────────────────┐   ┌───────────────────────────────┐
│   Google Gemini AI       │   │    Supabase (PostgreSQL)      │
│                          │   │                               │
│  • Content generation    │   │  ┌─────────────────────────┐ │
│  • Educational prompts   │   │  │   users table           │ │
│  • JSON responses        │   │  │   • id (UUID)           │ │
│  • gemini-pro model      │   │  │   • display_name        │ │
│                          │   │  │   • preferences (JSONB) │ │
└──────────────────────────┘   │  └─────────────────────────┘ │
                               │                               │
                               │  ┌─────────────────────────┐ │
                               │  │   chats table           │ │
                               │  │   • chat_id (UUID)      │ │
                               │  │   • user_id (FK)        │ │
                               │  │   • chat_data (JSONB)   │ │
                               │  └─────────────────────────┘ │
                               │                               │
                               │  ┌─────────────────────────┐ │
                               │  │   exams table           │ │
                               │  │   • exam_id (UUID)      │ │
                               │  │   • user_id (FK)        │ │
                               │  │   • chat_id (FK)        │ │
                               │  │   • exam_data (JSONB)   │ │
                               │  │   • status              │ │
                               │  └─────────────────────────┘ │
                               └───────────────────────────────┘
```

---

## 📊 Data Flow Diagrams

### 1. Chat Generation Flow

```
User                Frontend              Backend              Gemini AI         Database
 │                    │                     │                     │                │
 │   Click "New      │                     │                     │                │
 │   Chat"           │                     │                     │                │
 ├──────────────────>│                     │                     │                │
 │                    │                     │                     │                │
 │   Select subject  │                     │                     │                │
 │   & difficulty    │                     │                     │                │
 ├──────────────────>│                     │                     │                │
 │                    │                     │                     │                │
 │                    │  POST /api/chats/  │                     │                │
 │                    │  generate           │                     │                │
 │                    ├────────────────────>│                     │                │
 │                    │                     │                     │                │
 │                    │                     │  Generate prompt    │                │
 │                    │                     │  with subject &     │                │
 │                    │                     │  difficulty         │                │
 │                    │                     ├────────────────────>│                │
 │                    │                     │                     │                │
 │                    │                     │  AI generates       │                │
 │                    │                     │  conversation       │                │
 │                    │                     │  (6 messages)       │                │
 │                    │                     │<────────────────────┤                │
 │                    │                     │                     │                │
 │                    │                     │  Insert chat        │                │
 │                    │                     │  with messages      │                │
 │                    │                     ├────────────────────────────────────>│
 │                    │                     │                     │                │
 │                    │                     │  Chat saved         │                │
 │                    │                     │<────────────────────────────────────┤
 │                    │                     │                     │                │
 │                    │  Return chat        │                     │                │
 │                    │  with all data      │                     │                │
 │                    │<────────────────────┤                     │                │
 │                    │                     │                     │                │
 │   Display          │                     │                     │                │
 │   conversation     │                     │                     │                │
 │<───────────────────┤                     │                     │                │
 │                    │                     │                     │                │
```

### 2. Exam Generation from Chat Flow

```
User              Frontend            Backend           Gemini AI       Database
 │                  │                   │                  │              │
 │   Chat exists    │                   │                  │              │
 │   "Generate      │                   │                  │              │
 │    Exam"         │                   │                  │              │
 ├─────────────────>│                   │                  │              │
 │                  │                   │                  │              │
 │                  │  POST /api/exams/ │                  │              │
 │                  │  generate-from-   │                  │              │
 │                  │  chat/{chat_id}   │                  │              │
 │                  ├──────────────────>│                  │              │
 │                  │                   │                  │              │
 │                  │                   │  Get chat data   │              │
 │                  │                   ├─────────────────────────────────>│
 │                  │                   │                  │              │
 │                  │                   │  Chat data       │              │
 │                  │                   │<─────────────────────────────────┤
 │                  │                   │                  │              │
 │                  │                   │  Extract         │              │
 │                  │                   │  conversation    │              │
 │                  │                   │  text            │              │
 │                  │                   │                  │              │
 │                  │                   │  Send to AI:     │              │
 │                  │                   │  "Generate       │              │
 │                  │                   │   questions from │              │
 │                  │                   │   this content"  │              │
 │                  │                   ├─────────────────>│              │
 │                  │                   │                  │              │
 │                  │                   │  AI analyzes     │              │
 │                  │                   │  conversation    │              │
 │                  │                   │  & generates     │              │
 │                  │                   │  5 MCQ questions │              │
 │                  │                   │<─────────────────┤              │
 │                  │                   │                  │              │
 │                  │                   │  Create exam     │              │
 │                  │                   │  with questions  │              │
 │                  │                   ├─────────────────────────────────>│
 │                  │                   │                  │              │
 │                  │                   │  Exam saved      │              │
 │                  │                   │<─────────────────────────────────┤
 │                  │                   │                  │              │
 │                  │  Return exam      │                  │              │
 │                  │  data             │                  │              │
 │                  │<──────────────────┤                  │              │
 │                  │                   │                  │              │
 │  Show Question 1 │                   │                  │              │
 │<─────────────────┤                   │                  │              │
 │                  │                   │                  │              │
```

### 3. Answer Submission & Exam Completion Flow

```
User              Frontend            Backend                     Database
 │                  │                   │                            │
 │  Select answer   │                   │                            │
 │  for Question 1  │                   │                            │
 ├─────────────────>│                   │                            │
 │                  │                   │                            │
 │                  │  POST /api/exams/ │                            │
 │                  │  {exam_id}/       │                            │
 │                  │  submit-answer    │                            │
 │                  ├──────────────────>│                            │
 │                  │                   │                            │
 │                  │                   │  Get exam                  │
 │                  │                   ├───────────────────────────>│
 │                  │                   │                            │
 │                  │                   │  Exam data                 │
 │                  │                   │<───────────────────────────┤
 │                  │                   │                            │
 │                  │                   │  Find question             │
 │                  │                   │  Check if correct          │
 │                  │                   │  (compare answer)          │
 │                  │                   │                            │
 │                  │                   │  Update exam_data:         │
 │                  │                   │  Add to user_answers       │
 │                  │                   ├───────────────────────────>│
 │                  │                   │                            │
 │                  │                   │  Updated                   │
 │                  │                   │<───────────────────────────┤
 │                  │                   │                            │
 │                  │  Response:        │                            │
 │                  │  {is_correct,     │                            │
 │                  │   explanation}    │                            │
 │                  │<──────────────────┤                            │
 │                  │                   │                            │
 │  Show feedback   │                   │                            │
 │<─────────────────┤                   │                            │
 │                  │                   │                            │
 │  ... Answer all  │                   │                            │
 │  questions ...   │                   │                            │
 │                  │                   │                            │
 │  Click "Submit   │                   │                            │
 │  Exam"           │                   │                            │
 ├─────────────────>│                   │                            │
 │                  │                   │                            │
 │                  │  POST /api/exams/ │                            │
 │                  │  {exam_id}/       │                            │
 │                  │  complete         │                            │
 │                  ├──────────────────>│                            │
 │                  │                   │                            │
 │                  │                   │  Get exam                  │
 │                  │                   ├───────────────────────────>│
 │                  │                   │                            │
 │                  │                   │  Calculate:                │
 │                  │                   │  • Total questions         │
 │                  │                   │  • Correct answers         │
 │                  │                   │  • Score %                 │
 │                  │                   │  • Completion rate         │
 │                  │                   │                            │
 │                  │                   │  Update:                   │
 │                  │                   │  • exam_data.results       │
 │                  │                   │  • status = COMPLETED      │
 │                  │                   ├───────────────────────────>│
 │                  │                   │                            │
 │                  │  Response:        │                            │
 │                  │  {results}        │                            │
 │                  │<──────────────────┤                            │
 │                  │                   │                            │
 │  Show results    │                   │                            │
 │  modal           │                   │                            │
 │<─────────────────┤                   │                            │
 │                  │                   │                            │
```

---

## 🔄 Component Interaction Diagram

### Frontend Component Hierarchy

```
App (AuthProvider)
 │
 ├─ AppContent
 │   │
 │   ├─ currentPage === 'landing'
 │   │   └─ LandingPage
 │   │       ├─ Layout
 │   │       │   └─ Hero Content
 │   │       ├─ FeatureCard (x3)
 │   │       ├─ TestimonialCard (x2)
 │   │       └─ TeamMember (x4)
 │   │
 │   ├─ currentPage === 'chat'
 │   │   └─ ChatPage
 │   │       ├─ Chat Panel
 │   │       │   ├─ Header (with "New Chat" button)
 │   │       │   ├─ Messages List
 │   │       │   │   ├─ UserMessage (x many)
 │   │       │   │   └─ AIMessage (x many)
 │   │       │   └─ Input Area
 │   │       │       ├─ TextInput
 │   │       │       └─ SendButton
 │   │       │
 │   │       └─ Exam Panel (resizable)
 │   │           ├─ Question Display
 │   │           ├─ Options (x4)
 │   │           └─ Navigation
 │   │               ├─ Previous Button
 │   │               ├─ Next Button
 │   │               └─ Submit Button
 │   │
 │   └─ showAuthModal === true
 │       └─ AuthModal
 │           ├─ Email Input
 │           ├─ Password Input
 │           ├─ Sign In Button
 │           └─ Close Button
```

### State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Global State (Context)                    │
│                                                               │
│  AuthContext                                                 │
│  ├─ user: User | null                                        │
│  ├─ loading: boolean                                         │
│  ├─ signInAnonymously()                                      │
│  └─ signOut()                                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ useAuth() hook
                          │
         ┌────────────────┴────────────────┐
         │                                  │
         ▼                                  ▼
┌──────────────────┐           ┌─────────────────────┐
│   LandingPage    │           │     ChatPage        │
│   Component      │           │     Component       │
│                  │           │                     │
│  • Show "Start"  │           │  Local State:       │
│    if no user    │           │  ├─ currentChat     │
│  • Show          │           │  ├─ messages        │
│    "Continue"    │           │  ├─ input           │
│    if user       │           │  ├─ currentExam     │
│                  │           │  ├─ examStarted     │
└──────────────────┘           │  ├─ currentQuestion │
                               │  ├─ answers         │
                               │  └─ loading states  │
                               └─────────────────────┘
```

---

## 🗂️ Database Schema Relationships

```
┌──────────────────────────┐
│        users             │
│                          │
│  id (UUID) PK            │
│  display_name            │
│  avatar_url              │
│  preferences (JSONB)     │
│  created_at              │
│  updated_at              │
└──────────────────────────┘
             │
             │ 1
             │
             │ N
             ├─────────────────────────────┐
             │                             │
             ▼                             ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│        chats             │    │        exams             │
│                          │    │                          │
│  chat_id (UUID) PK       │    │  exam_id (UUID) PK       │
│  user_id (UUID) FK ──────┼───>│  user_id (UUID) FK       │
│  title                   │    │  chat_id (UUID) FK ──┐   │
│  subject                 │    │  title               │   │
│  chat_data (JSONB)       │    │  subject             │   │
│    ├─ messages[]         │    │  status              │   │
│    └─ metadata{}         │    │  exam_data (JSONB)   │   │
│  created_at              │    │    ├─ questions[]    │   │
│  updated_at              │    │    ├─ user_answers[] │   │
└──────────────────────────┘    │    └─ results{}      │   │
             │                  │  created_at          │   │
             │                  │  updated_at          │   │
             │ 1                └──────────────────────────┘
             │                             ▲
             │ N                           │
             └─────────────────────────────┘
                   (optional link)
```

### JSONB Structure Details

**chats.chat_data:**
```json
{
  "messages": [
    {
      "id": "msg_uuid",
      "from_user": "user" | "ai",
      "text": "Message content",
      "timestamp": "ISO8601"
    }
  ],
  "metadata": {
    "subject": "Mathematics",
    "difficulty": "intermediate",
    "tags": ["algebra", "equations"],
    "language": "en"
  }
}
```

**exams.exam_data:**
```json
{
  "questions": [
    {
      "id": "q_uuid",
      "type": "mcq",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Why this is correct"
    }
  ],
  "user_answers": [
    {
      "question_id": "q_uuid",
      "answer": "Option A",
      "is_correct": true,
      "time_taken": 30
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

## 🔐 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Authentication Flow                              │
└─────────────────────────────────────────────────────────────────────┘

┌──────────┐          ┌──────────┐          ┌──────────┐
│          │          │          │          │          │
│  User    │          │ Frontend │          │ Supabase │
│          │          │          │          │   Auth   │
│          │          │          │          │          │
└────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │
     │  Click "Sign In"    │                     │
     ├────────────────────>│                     │
     │                     │                     │
     │                     │  Option 1: Demo Mode
     │                     │  signInAnonymously()│
     │                     │  • Generate UUID    │
     │                     │  • Store in         │
     │                     │    localStorage     │
     │                     │                     │
     │                     │  Option 2: Real Auth
     │                     │  signInWithEmail()  │
     │                     ├────────────────────>│
     │                     │                     │
     │                     │  Session token      │
     │                     │<────────────────────┤
     │                     │                     │
     │                     │  Create user profile
     │                     │  POST /api/users/   │
     │                     ├──────────────────────────┐
     │                     │                          │
     │                     │                     Backend
     │                     │  User profile created    │
     │                     │<─────────────────────────┘
     │                     │                     │
     │  Redirect to        │                     │
     │  ChatPage           │                     │
     │<────────────────────┤                     │
     │                     │                     │
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Production Setup                             │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                           Cloud Infrastructure                     │
│                                                                    │
│  ┌──────────────────────┐         ┌──────────────────────┐       │
│  │   Vercel / Netlify   │         │   Railway / Fly.io   │       │
│  │   (Frontend Hosting) │         │  (Backend Hosting)   │       │
│  │                      │         │                      │       │
│  │  • React app         │         │  • FastAPI app       │       │
│  │  • Static files      │         │  • uvicorn server    │       │
│  │  • CDN distribution  │         │  • Auto-scaling      │       │
│  │  • SSL certificate   │         │  • Health checks     │       │
│  └──────────────────────┘         └──────────────────────┘       │
│           │                                 │                     │
│           │                                 │                     │
│           └─────────────┬───────────────────┘                     │
│                         │                                         │
│                    API Calls                                      │
│                         │                                         │
│       ┌─────────────────┼─────────────────┐                      │
│       │                 │                 │                      │
│       ▼                 ▼                 ▼                      │
│  ┌─────────┐    ┌──────────────┐   ┌──────────┐               │
│  │ Supabase│    │  Google AI   │   │  Redis   │               │
│  │         │    │    Platform  │   │  Cache   │               │
│  │ • DB    │    │              │   │          │               │
│  │ • Auth  │    │ • Gemini API │   │ • Session│               │
│  │ • Storage│   │ • Content    │   │ • Rate   │               │
│  │         │    │   generation │   │   limit  │               │
│  └─────────┘    └──────────────┘   └──────────┘               │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘

Environment Variables:
Frontend:                    Backend:
• VITE_API_URL              • SUPABASE_URL
• VITE_SUPABASE_URL         • SUPABASE_SERVICE_ROLE_KEY
• VITE_SUPABASE_ANON_KEY    • GEMINI_API_KEY
                            • PORT
                            • HOST
```

---

## 📈 Scalability Considerations

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Horizontal Scaling Architecture                   │
└─────────────────────────────────────────────────────────────────────┘

                           ┌─────────────┐
                           │    Users    │
                           └──────┬──────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │  Load Balancer   │
                        │   (Nginx/ALB)    │
                        └──────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
         ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
         │  FastAPI       │ │  FastAPI       │ │  FastAPI       │
         │  Instance 1    │ │  Instance 2    │ │  Instance N    │
         └────────────────┘ └────────────────┘ └────────────────┘
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
         ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
         │   Supabase     │ │  Gemini AI     │ │     Redis      │
         │  (Replicated)  │ │  (Rate limit)  │ │    Cluster     │
         └────────────────┘ └────────────────┘ └────────────────┘
```

---

## 🔍 Monitoring & Logging

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Observability Stack                             │
└─────────────────────────────────────────────────────────────────────┘

Application Layer
    │
    ├─ Logs ─────────────────> Logging Service (LogTail, CloudWatch)
    │                          • Error tracking
    │                          • Debug information
    │                          • User actions
    │
    ├─ Metrics ──────────────> Metrics Service (Prometheus, DataDog)
    │                          • Request latency
    │                          • Success/error rates
    │                          • AI API usage
    │                          • Database queries
    │
    └─ Traces ───────────────> Tracing Service (Sentry, New Relic)
                               • Performance bottlenecks
                               • Error stack traces
                               • User sessions

Dashboard View:
┌─────────────────────────────────────────────────────────┐
│  • Active Users: 1,234                                  │
│  • Avg Response Time: 234ms                             │
│  • Success Rate: 99.8%                                  │
│  • AI API Calls: 5,678 today                           │
│  • Database Queries: 23,456 today                      │
│  • Error Rate: 0.2%                                     │
└─────────────────────────────────────────────────────────┘
```

---

This architecture provides a clear visual representation of how all components interact in the EduAI platform!
