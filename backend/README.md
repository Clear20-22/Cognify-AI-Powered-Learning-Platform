# Cognify Backend - Clean & Modern# EduAI Backend

A completely rewritten, production-ready FastAPI backend for the Cognify AI Learning Platform.A FastAPI-based backend for the EduAI educational platform with Supabase integration, AI-powered chat, and exam management features.

## ✨ What's New## Features

### Clean Architecture- 🤖 **AI-Powered Chat**: Integration with Google Gemini for educational conversations

- ✅ Single, well-organized `main.py` file- 👥 **User Management**: Complete user profile management with Supabase auth

- ✅ No unnecessary dependencies or complexity- 💬 **Chat System**: Persistent chat sessions with message history

- ✅ No database required - uses in-memory storage- 📝 **Exam System**: Create, manage, and take AI-generated exams

- ✅ Perfect for development and demos- 🔐 **Database Integration**: Full Supabase PostgreSQL integration

- 📊 **RESTful API**: Comprehensive REST API with automatic documentation

### Modern Features

- 🤖 **AI-Powered Learning** - Google Gemini integration## Quick Start

- 💬 **Intelligent Chat** - Context-aware responses

- 📝 **Adaptive Exams** - Auto-generated questions### 1. Install Dependencies

- 📊 **Real-time Grading** - Instant feedback

- 🎯 **Difficulty Levels** - Adaptive learning paths```bash

pip install -r requirements.txt

## 🚀 Quick Start```

### 1. Install Dependencies### 2. Environment Setup

````bashCopy the example environment file and configure it:

# Create virtual environment

python3 -m venv venv```bash

source venv/bin/activate  # On Windows: venv\Scripts\activatecp .env.example .env

````

# Install packages

pip install -r requirements.txtEdit `.env` with your configuration:

````

```env

### 2. Configure Environment# Gemini AI Configuration

GEMINI_API_KEY=your_gemini_api_key_here

```bash

# Copy example env file# Supabase Configuration

cp .env.example .envSUPABASE_URL=your_supabase_project_url_here

SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Edit .env and add your Gemini API key (optional for demo)SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Get it from: https://makersuite.google.com/app/apikey```

````

### 3. Database Setup

### 3. Run Server

Ensure your Supabase database has the following tables:

````bash

python main.py```sql

```-- Users table

CREATE TABLE public.users (

Server will start at: **http://localhost:8000**    id uuid NOT NULL,

API Docs at: **http://localhost:8000/docs**  display_name text,

  avatar_url text,

## 📚 API Endpoints  preferences jsonb,

  created_at timestamp with time zone DEFAULT now(),

### Core  updated_at timestamp with time zone DEFAULT now(),

- `GET /` - API information  CONSTRAINT users_pkey PRIMARY KEY (id),

- `GET /health` - Health check  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)

);

### Chat

- `POST /api/chat` - Send message, get AI response-- Chats table

- `POST /api/chats` - Create educational conversationCREATE TABLE public.chats (

- `GET /api/chats/{chat_id}` - Get chat details  chat_id uuid NOT NULL DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL,

### Exams  title text NOT NULL DEFAULT 'New Chat'::text,

- `POST /api/exams` - Create adaptive exam  subject text,

- `POST /api/exams/submit` - Submit for grading  chat_data jsonb NOT NULL DEFAULT '{"messages": [], "metadata": {}}'::jsonb,

- `GET /api/exams/{exam_id}` - Get results  created_at timestamp with time zone DEFAULT now(),

  updated_at timestamp with time zone DEFAULT now(),

### Users  CONSTRAINT chats_pkey PRIMARY KEY (chat_id),

- `POST /api/users` - Create user  CONSTRAINT chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)

- `GET /api/users/{user_id}` - Get user);



## 🏗️ Architecture-- Exams table

CREATE TABLE public.exams (

```  exam_id uuid NOT NULL DEFAULT gen_random_uuid(),

backend/  user_id uuid NOT NULL,

├── main.py           # Everything in one clean file (600+ lines)  chat_id uuid,

├── requirements.txt  # Minimal dependencies  title text NOT NULL,

├── .env.example     # Configuration template  subject text NOT NULL,

└── README.md        # This file  exam_data jsonb NOT NULL DEFAULT '{"results": {}, "questions": [], "user_answers": []}'::jsonb,

```  status text NOT NULL DEFAULT 'in_progress'::text,

  created_at timestamp with time zone DEFAULT now(),

## 🎯 Key Features  updated_at timestamp with time zone DEFAULT now(),

  CONSTRAINT exams_pkey PRIMARY KEY (exam_id),

- **Zero Database Setup** - Works immediately with in-memory storage  CONSTRAINT exams_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),

- **AI Integration** - Google Gemini for intelligent responses  CONSTRAINT exams_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(chat_id)

- **Demo Mode** - Works without API key for testing);

- **Auto Documentation** - FastAPI generates interactive docs```

- **Production Ready** - Clean code, error handling, logging

### 4. Start the Server

## 🔧 Configuration

```bash

Only one environment variable needed (and it's optional!):python start.py

````

```bash

GEMINI_API_KEY=your_key_here  # Optional - works in demo mode without itOr run directly:

```

```bash

## 📊 Example Usageuvicorn main:app --reload --host 0.0.0.0 --port 8000

```

**Send a chat message:**

````bash## API Documentation

curl -X POST http://localhost:8000/api/chat \

  -H "Content-Type: application/json" \Once the server is running, visit:

  -d '{"message": "Explain quantum physics"}'

```- **Interactive API docs**: http://localhost:8000/docs

- **ReDoc documentation**: http://localhost:8000/redoc

**Create an exam:**- **Health check**: http://localhost:8000/health

```bash

curl -X POST http://localhost:8000/api/exams \## API Endpoints

  -H "Content-Type: application/json" \

  -d '{### Users (`/api/users`)

    "user_id": "user_1",- `POST /api/users/` - Create new user

    "topic": "Python",- `GET /api/users/{user_id}` - Get user by ID

    "difficulty": "intermediate",- `PUT /api/users/{user_id}` - Update user

    "num_questions": 5- `DELETE /api/users/{user_id}` - Delete user

  }'- `GET /api/users/` - List users (paginated)

````

### Chats (`/api/chats`)

## 🚀 Deployment- `POST /api/chats/` - Create new chat

- `GET /api/chats/{chat_id}` - Get chat by ID

Works on any platform that supports Python:- `GET /api/chats/user/{user_id}` - Get user's chats

- Heroku- `PUT /api/chats/{chat_id}` - Update chat

- Railway - `DELETE /api/chats/{chat_id}` - Delete chat

- Google Cloud Run- `POST /api/chats/{chat_id}/messages` - Add message to chat

- AWS Lambda- `POST /api/chats/quick-chat` - Quick chat (no persistence)

- Azure App Service

### Exams (`/api/exams`)

## 📝 License- `POST /api/exams/` - Create new exam

- `GET /api/exams/{exam_id}` - Get exam by ID

MIT License- `GET /api/exams/user/{user_id}` - Get user's exams

- `PUT /api/exams/{exam_id}` - Update exam

---- `DELETE /api/exams/{exam_id}` - Delete exam

- `POST /api/exams/{exam_id}/submit-answer` - Submit answer

**Built with FastAPI + Google Gemini AI** 🚀- `POST /api/exams/{exam_id}/complete` - Complete exam

- `POST /api/exams/generate` - Generate AI-powered exam

### Legacy

- `POST /chat` - Legacy chat endpoint (backward compatibility)
  curl -X POST http://localhost:8000/chat \
   -H "Content-Type: application/json" \
   -d '{"message": "What is machine learning?"}'

```

## File Structure

```

backend/
├── main.py # Main FastAPI application
├── requirements_simple.txt # Minimal dependencies
├── .env # Environment variables
└── backup_complex/ # Backup of complex files

```

The `backup_complex/` directory contains the more complex authentication, database, and service files that were removed to simplify the backend.
```
