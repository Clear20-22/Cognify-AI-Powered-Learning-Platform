# EduAI Quick Setup Guide

## 🚀 Quick Start

This guide will help you set up and run the EduAI platform in under 5 minutes.

---

## 📋 Prerequisites

Before you begin, ensure you have:
- **Python 3.9+** installed
- **Node.js 16+** and npm installed
- A **Supabase** account (free tier works)
- A **Google Gemini API key** (free tier available)

---

## 🔧 Backend Setup

### 1. Navigate to Backend Directory

```bash
cd EduAI/backend
```

### 2. Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate it
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# backend/.env

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key-here

# Server Configuration (optional)
PORT=8000
HOST=0.0.0.0
```

#### How to get these credentials:

**Supabase:**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project (or use existing)
3. Go to Settings → API
4. Copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
   - `anon` key → `SUPABASE_ANON_KEY`

**Gemini API:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Get API Key"
3. Copy the key → `GEMINI_API_KEY`

### 5. Set Up Database Tables

Run this SQL in your Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chats table
CREATE TABLE chats (
  chat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  chat_data JSONB NOT NULL DEFAULT '{"messages": [], "metadata": {}}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exams table
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

-- Indexes for performance
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX idx_exams_user_id ON exams(user_id);
CREATE INDEX idx_exams_chat_id ON exams(chat_id);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_created_at ON exams(created_at DESC);
```

### 6. Run Backend Server

```bash
python main.py
```

Or with auto-reload:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will start at: **http://localhost:8000**

Check API docs at: **http://localhost:8000/docs**

---

## ⚛️ Frontend Setup

### 1. Navigate to Frontend Directory

Open a new terminal window:

```bash
cd EduAI
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `EduAI` directory:

```bash
# EduAI/.env

# Backend API URL
VITE_API_URL=http://localhost:8000

# Supabase Configuration (for auth)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Use the same Supabase credentials from the backend setup.

### 4. Run Frontend Development Server

```bash
npm run dev
```

The frontend will start at: **http://localhost:5173**

---

## ✅ Verify Installation

### 1. Check Backend Health

Open: http://localhost:8000/health

You should see:
```json
{
  "status": "healthy",
  "service": "EduAI API",
  "version": "2.0.0",
  "ai_available": true,
  "database_connected": true,
  "features": {
    "chat": true,
    "exams": true,
    "user_management": true
  }
}
```

### 2. Check Frontend

Open: http://localhost:5173

You should see the EduAI landing page.

### 3. Test the Flow

1. Click **"Start Learning Now"**
2. You'll be signed in as a demo user
3. Click **"New Chat"**
4. Select a subject (e.g., "Mathematics")
5. Select difficulty (e.g., "Intermediate")
6. Click **"Create Chat"**
7. Wait for AI to generate conversation (10-20 seconds)
8. An exam will automatically generate
9. Take the exam!

---

## 🐛 Troubleshooting

### Backend Issues

**Problem: "No module named 'fastapi'"**
```bash
# Make sure virtual environment is activated
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

**Problem: "Supabase connection failed"**
- Verify your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Check that database tables are created
- Ensure your Supabase project is active

**Problem: "GEMINI_API_KEY not found"**
- Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Add to backend `.env` file
- Restart backend server
- If no key available, app will work in demo mode

### Frontend Issues

**Problem: "Cannot connect to backend"**
- Ensure backend is running on http://localhost:8000
- Check `VITE_API_URL` in frontend `.env`
- Verify CORS is enabled in backend (already configured)

**Problem: "Module not found"**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Problem: "Supabase auth error"**
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- For demo mode, this won't affect functionality

---

## 📊 Testing API Endpoints

### Using cURL

**Create User:**
```bash
curl -X POST http://localhost:8000/api/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_name": "Test User",
    "preferences": {"theme": "dark"}
  }'
```

**Generate Chat:**
```bash
curl -X POST "http://localhost:8000/api/chats/generate?user_id=550e8400-e29b-41d4-a716-446655440000&subject=Mathematics&difficulty=intermediate" \
  -H "Content-Type: application/json"
```

**Generate Exam:**
```bash
curl -X POST "http://localhost:8000/api/exams/generate-from-chat/{chat_id}?user_id=550e8400-e29b-41d4-a716-446655440000&num_questions=5" \
  -H "Content-Type: application/json"
```

### Using API Docs (Recommended)

Visit: http://localhost:8000/docs

This provides an interactive UI to test all endpoints.

---

## 🔒 Production Deployment

### Backend Deployment (Railway/Render/Fly.io)

1. **Push code to GitHub**
2. **Connect to deployment platform**
3. **Set environment variables:**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
4. **Deploy!**

### Frontend Deployment (Vercel/Netlify)

1. **Push code to GitHub**
2. **Connect to Vercel/Netlify**
3. **Set environment variables:**
   - `VITE_API_URL` (your backend URL)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Build command:** `npm run build`
5. **Output directory:** `dist`
6. **Deploy!**

---

## 📚 Next Steps

Now that you have EduAI running:

1. **Read the full documentation:**
   - `COMPREHENSIVE_CODE_DOCUMENTATION.md` - Complete code walkthrough
   - `ARCHITECTURE_DIAGRAM.md` - System architecture

2. **Customize the platform:**
   - Add more subjects
   - Customize UI theme
   - Add new exam question types
   - Implement progress tracking

3. **Enhance features:**
   - Add real-time chat with WebSockets
   - Implement user analytics dashboard
   - Add PDF upload for exam generation
   - Create mobile app version

---

## 🆘 Need Help?

- **Documentation Issues:** Check `COMPREHENSIVE_CODE_DOCUMENTATION.md`
- **Architecture Questions:** See `ARCHITECTURE_DIAGRAM.md`
- **API Reference:** http://localhost:8000/docs (when server running)
- **Supabase Help:** https://supabase.com/docs
- **Gemini AI Help:** https://ai.google.dev/docs

---

## 📝 Quick Reference

### Backend Commands
```bash
# Start backend
python main.py

# With auto-reload
uvicorn main:app --reload

# Run tests (if available)
pytest

# Check dependencies
pip list
```

### Frontend Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## ✨ You're All Set!

You now have a fully functional AI-powered educational platform running locally. 

**Happy coding! 🚀**
