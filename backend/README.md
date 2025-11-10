# EduAI Backend

A FastAPI-based backend for the EduAI educational platform with Supabase integration, AI-powered chat, and exam management features.

## Features

- 🤖 **AI-Powered Chat**: Integration with Google Gemini for educational conversations
- 👥 **User Management**: Complete user profile management with Supabase auth
- 💬 **Chat System**: Persistent chat sessions with message history
- 📝 **Exam System**: Create, manage, and take AI-generated exams
- 🔐 **Database Integration**: Full Supabase PostgreSQL integration
- 📊 **RESTful API**: Comprehensive REST API with automatic documentation

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 3. Database Setup

Ensure your Supabase database has the following tables:

```sql
-- Users table
CREATE TABLE public.users (
  id uuid NOT NULL,
  display_name text,
  avatar_url text,
  preferences jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Chats table
CREATE TABLE public.chats (
  chat_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New Chat'::text,
  subject text,
  chat_data jsonb NOT NULL DEFAULT '{"messages": [], "metadata": {}}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chats_pkey PRIMARY KEY (chat_id),
  CONSTRAINT chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Exams table
CREATE TABLE public.exams (
  exam_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chat_id uuid,
  title text NOT NULL,
  subject text NOT NULL,
  exam_data jsonb NOT NULL DEFAULT '{"results": {}, "questions": [], "user_answers": []}'::jsonb,
  status text NOT NULL DEFAULT 'in_progress'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exams_pkey PRIMARY KEY (exam_id),
  CONSTRAINT exams_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT exams_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(chat_id)
);
```

### 4. Start the Server

```bash
python start.py
```

Or run directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Once the server is running, visit:

- **Interactive API docs**: http://localhost:8000/docs
- **ReDoc documentation**: http://localhost:8000/redoc
- **Health check**: http://localhost:8000/health

## API Endpoints

### Users (`/api/users`)
- `POST /api/users/` - Create new user
- `GET /api/users/{user_id}` - Get user by ID
- `PUT /api/users/{user_id}` - Update user
- `DELETE /api/users/{user_id}` - Delete user
- `GET /api/users/` - List users (paginated)

### Chats (`/api/chats`)
- `POST /api/chats/` - Create new chat
- `GET /api/chats/{chat_id}` - Get chat by ID
- `GET /api/chats/user/{user_id}` - Get user's chats
- `PUT /api/chats/{chat_id}` - Update chat
- `DELETE /api/chats/{chat_id}` - Delete chat
- `POST /api/chats/{chat_id}/messages` - Add message to chat
- `POST /api/chats/quick-chat` - Quick chat (no persistence)

### Exams (`/api/exams`)
- `POST /api/exams/` - Create new exam
- `GET /api/exams/{exam_id}` - Get exam by ID
- `GET /api/exams/user/{user_id}` - Get user's exams
- `PUT /api/exams/{exam_id}` - Update exam
- `DELETE /api/exams/{exam_id}` - Delete exam
- `POST /api/exams/{exam_id}/submit-answer` - Submit answer
- `POST /api/exams/{exam_id}/complete` - Complete exam
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
├── main.py                    # Main FastAPI application
├── requirements_simple.txt    # Minimal dependencies
├── .env                      # Environment variables
└── backup_complex/           # Backup of complex files
```

The `backup_complex/` directory contains the more complex authentication, database, and service files that were removed to simplify the backend.