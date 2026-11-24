# 🚀 Cognify — AI-Powered Learning Platform

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_AI-F05032?style=for-the-badge&logo=git&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)

**Cognify** is a modern, full-stack AI-driven educational platform built with **FastAPI**, **React 19**, and **Enterprise Design Patterns**. It provides students with intelligent AI tutoring, adaptive multi-language exam generation, PDF/PPTX study document extraction, and real-time performance analytics.

</div>

---

## 📖 About The Project

Cognify transforms standard studying into an interactive, personalized learning journey:
- **Intelligent AI Tutoring**: Engage in context-aware Q&A sessions backed by primary (`Groq`) and fallback (`Gemini`) LLM engines.
- **Persistent Chat Sessions & History**: Every tutoring conversation is saved, reloadable by session, and browsable from a unified History view alongside past exams.
- **Adaptive Practice Exams**: Generate multi-choice quizzes instantly on any topic, at any difficulty level, currently in **English** and **Bangla** (more languages coming soon).
- **Document Content Extractor**: Upload PDF notes or PPTX slide decks to extract text and generate instant study summaries and quizzes.
- **Document-Based Quizzes with Scoring**: Take quizzes generated from your uploaded documents, submit answers, and get scored results that are saved for review.
- **Performance Analytics**: Track quiz accuracy and learning progress with visual charts.
- **Study Patterns & Streak Tracking**: Visualize daily activity, current and longest study streaks, most active day, and average activity per day to build consistent habits.
- **Exam Progress Tracking**: Record and revisit exam progress and past attempts per user.
- **Zero-Downtime Resilience**: Features automatic failover chains and offline in-memory demo modes, allowing the platform to run seamlessly even without external API keys or a local database server.

---

## 📁 Comprehensive Project Structure

```
Cognify-AI-Powered-Learning-Platform/
├── 📁 backend/                        # FastAPI Python REST API
│   ├── 📁 app/
│   │   ├── 📁 api/                    # API Routing Layer
│   │   │   ├── deps.py                # Dependency Injection container
│   │   │   └── 📁 v1/                 # Version 1 Endpoint Handlers
│   │   │       ├── auth.py            # User registration & JWT authentication
│   │   │       ├── chat.py            # AI tutoring conversation routes
│   │   │       ├── documents.py       # File upload & document processing
│   │   │       ├── exams.py           # Exam generation & grading routes
│   │   │       ├── notes.py           # Study notes management
│   │   │       ├── router.py          # Central v1 route aggregator
│   │   │       └── users.py           # User profile management
│   │   ├── 📁 core/                   # Core App Infrastructure
│   │   │   ├── config.py              # Environment settings & @lru_cache Singleton
│   │   │   ├── security.py            # JWT token creation & Passlib hashing
│   │   │   └── utils.py               # Shared utility functions (UUID generators)
│   │   ├── database.py                # Async MongoDB Connection Singleton
│   │   ├── 📁 db/                     # Data Storage Layer
│   │   │   ├── base.py                # IDataStore interface & MongoDataStore repository
│   │   │   └── init_db.py             # InMemoryDataStore fallback implementation
│   │   ├── 📁 models/                 # Domain Data Models (Pydantic / BSON)
│   │   ├── 📁 pdfReader/              # Low-level PDF/PPTX extraction utilities
│   │   ├── 📁 schemas/                # Request & Response Validation Schemas
│   │   └── 📁 services/               # Core Business Logic Layer
│   │       ├── 📁 ai_providers/       # AI Strategy Implementations
│   │       │   ├── base_provider.py   # BaseAIProvider abstract strategy interface
│   │       │   ├── gemini_provider.py # Google Gemini provider (model: AI_MODEL_GEMINI in config.py)
│   │       │   ├── groq_provider.py   # Groq provider (model: AI_MODEL_GROQ in config.py)
│   │       │   ├── mock_provider.py   # Offline Demo provider strategy
│   │       │   ├── provider_factory.py# AIProviderFactory & AIProviderChain (Failover)
│   │       │   └── resilience.py      # Exponential backoff retry decorator
│   │       ├── ai_service.py          # AI Subsystem Facade
│   │       ├── chat_service.py        # Chat session management service
│   │       ├── document_extractors.py # Document Extraction Template Method & Strategies
│   │       ├── document_service.py    # Document record management
│   │       ├── exam_service.py        # Exam Service with ExamBuilder pattern
│   │       ├── note_service.py        # Notes creation and retrieval service
│   │       ├── pdf_service.py         # PDF & PPTX Service entry point
│   │       └── user_service.py        # User account service
│   ├── 📁 tests/                      # Pytest suite
│   └── main.py                        # FastAPI Application Entrypoint & Lifespan
│
├── 📁 frontend/                       # React 19 + Vite Frontend SPA
│   ├── 📁 public/                     # Static web assets
│   └── 📁 src/
│       ├── 📁 components/             # React UI View Components
│       │   ├── AuthModal.jsx          # Login & Signup Modal UI
│       │   ├── Avatar.jsx             # User avatar with initials
│       │   ├── ChatPage.jsx           # AI Tutoring Conversational View
│       │   ├── Dashboard.jsx          # Learning Overview & Quick Actions
│       │   ├── Documents.jsx          # File Upload & Summary View
│       │   ├── History.jsx            # Past chats & exams in one view
│       │   ├── LandingPage.jsx        # Landing & Intro Page
│       │   ├── Layout.jsx             # Shared page layout wrapper
│       │   ├── Notes.jsx              # Study Notes Workspace
│       │   ├── Performance.jsx        # Analytics & Accuracy Charts
│       │   ├── PracticeTest.jsx       # Adaptive Exam Interface
│       │   ├── Sidebar.jsx            # App navigation sidebar
│       │   └── StudyPatterns.jsx      # Study streaks & daily activity
│       ├── 📁 hooks/                  # Encapsulated Custom React Hooks
│       │   ├── useAuth.jsx            # Auth Context Provider Hook
│       │   ├── useChatSession.js      # Chat state & messaging side-effects hook
│       │   ├── useDocumentManager.js  # Document upload & delete management hook
│       │   └── useExamSession.js      # Exam creation & test submission hook
│       ├── 📁 services/
│       │   └── apiService.js          # API Facade & DTO Adapters
│       ├── App.jsx                    # Client-side Router & Route Guards
│       └── main.jsx                   # React DOM Mount Entrypoint
│
├── 📁 design_patterns/                # Software Architecture Documentation
│   └── README.md                      # In-depth Design Pattern Reference Guide
└── requirements.txt                   # Backend Python Dependencies
```

---

## 🛠️ Tech Stack

### **Backend (`/backend`)**
* **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (ASGI via `uvicorn`)
* **AI Integration**: Groq SDK (`groq`), Google Generative AI (`google-generativeai`)
* **Database**: MongoDB (via `motor` async driver) + In-Memory Fallback Store
* **Document Extraction**: `pdfplumber`, `python-pptx`
* **Security & Auth**: OAuth2 Password Flow, JWT (`python-jose`), Password Hashing (`passlib[bcrypt]`)

### **Frontend (`/frontend`)**
* **Framework**: React 19 bootstrapped with [Vite](https://vitejs.dev/)
* **Styling**: TailwindCSS v4 & `@heroicons/react`
* **Routing**: React Router DOM v7
* **State Management**: Custom React Hooks & DTO Adapters

---

## 🚀 Quick Start Guide

### Prerequisites
- Python **3.10+**
- Node.js **18+** & `npm`
- MongoDB instance (Optional - runs in **In-Memory Demo Mode** automatically if MongoDB is omitted)

---

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/Clear20-22/Cognify-AI-Powered-Learning-Platform.git
cd Cognify-AI-Powered-Learning-Platform

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install backend dependencies
pip install -r requirements.txt

# Create your environment file from the template (it goes in backend/)
cp .env.example backend/.env
```

Edit `backend/.env` with your own values (all optional for a first run):
```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=cognify_db
SECRET_KEY=change-me-to-a-long-random-string
```

> ⚠️ The database key is **`MONGODB_URI`** (not `MONGODB_URL`). With a wrong name the app
> silently falls back to the in-memory store and loses all data on restart.
> For MongoDB Atlas, paste the connection string from Atlas → *Connect → Drivers*
> (`mongodb+srv://...`). `backend/.env` is gitignored — never commit keys or connection strings.

Run the backend server:
```bash
cd backend
python main.py
```
> The startup log shows `✅ MongoDB connected` when the database is in use, or
> `⚠️ Running without database connection` when it falls back to in-memory.
> Server runs at `http://localhost:8000`  
> OpenAPI Interactive Docs at `http://localhost:8000/docs`

---

### 2. Frontend Setup

In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
> Application runs at `http://localhost:5173`

---

### 3. 🐳 Docker Deployment (Containerized Stack)

Deploy the full stack (Backend + Frontend Nginx + MongoDB) in 1 command:

```bash
docker compose --env-file backend/.env up --build -d
```
> `--env-file` passes your API keys and `SECRET_KEY` to the containers at run time.
> `.env` files are excluded from the image by `.dockerignore`, so secrets are never baked
> into it. In Docker the backend always uses the bundled `mongodb` container.
> Frontend served via Nginx at `http://localhost`  
> Backend REST API at `http://localhost:8000`

---

## 🏛️ Enterprise Design Patterns

Cognify incorporates **12 software design patterns** for enterprise maintainability:

1. **Strategy Pattern** — Interchangeable AI model providers & document extractors.
2. **Factory Method Pattern** — Dynamic creation of provider strategy chains & document extractors.
3. **Chain of Responsibility** — Automated AI provider failover execution (`Groq` $\rightarrow$ `Gemini` $\rightarrow$ `Mock`).
4. **Decorator Pattern** — `@with_retry_and_backoff` exponential backoff retries.
5. **Repository & Interface** — `IDataStore` interface ensuring complete parity between `MongoDataStore` & `InMemoryDataStore`.
6. **Template Method Pattern** — Standardized 4-step pipeline skeleton for document text extraction.
7. **Builder Pattern** — `ExamBuilder` for step-by-step adaptive exam model construction.
8. **Dependency Injection** — FastAPI `Depends(...)` injecting dependencies into routes.
9. **Facade Pattern** — `AIService` and `apiService.js` simplifying complex subsystem interactions.
10. **Adapter Pattern** — `adaptExamData` & `adaptDocumentData` DTO adapters in frontend.
11. **Custom Hooks Pattern** — `useChatSession`, `useExamSession`, `useDocumentManager` in React.
12. **Singleton & Cached State** — `Database.connect_db()` and `@lru_cache()` for global singletons.

> 📖 **Full Architectural Reference**: Explore the dedicated design patterns documentation at [`design_patterns/README.md`](design_patterns/README.md).

---

## 🔒 Security & OWASP Hardening

Cognify incorporates enterprise-grade security features out of the box:

- **Password Hashing**: Bcrypt password hashing (`passlib[bcrypt]`).
- **JWT Authorization**: OAuth2 Password bearer token handling (`python-jose`).
- **Path Traversal Defense**: Strict filename sanitization (`Path(file.filename).name`) on file uploads.
- **OWASP Security Response Headers**: Automatically sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and `Strict-Transport-Security`.
- **Payload & Extension Limits**: Restricted upload file types (`.pdf`, `.pptx`) with max 50 MB limits.

---

## 🧪 Testing & Verification

Run the automated Pytest test suite (test tools are not in `requirements.txt`):
```bash
pip install pytest pytest-asyncio httpx
cd backend
python -m pytest tests
```

To verify backend import integrity:
```bash
./.venv/bin/python -c "import sys; sys.path.insert(0, 'backend'); import main; print('✅ Backend main.py imported cleanly!')"
```

To build frontend production assets:
```bash
cd frontend
npm run build
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
