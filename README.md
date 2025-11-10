# Cognify - AI-Powered Learning Platform 🎓

> An intelligent learning platform that leverages AI to generate personalized educational content, interactive chats, and adaptive exams.

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [API Endpoints](#api-endpoints)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 Overview

**Cognify** is an AI-powered learning platform that revolutionizes education by:

- 🤖 Generating personalized learning content using Google Gemini AI
- 💬 Providing interactive chat-based learning experiences
- 📝 Creating adaptive exams based on conversation history
- 📊 Tracking learning progress and performance
- 🎨 Offering an intuitive, modern user interface

---

## ✨ Features

### 🎯 Core Features

- **AI-Powered Content Generation**: Leverages Google Gemini AI to create educational content
- **Interactive Chat Interface**: Engage in conversational learning with AI tutors
- **Dynamic Exam Generation**: Automatically generates exams from chat conversations
- **User Authentication**: Secure login and signup with Supabase Auth
- **Progress Tracking**: Monitor learning history and exam performance
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

### 🔧 Technical Features

- RESTful API with FastAPI
- Real-time database with Supabase
- Modern React UI with TailwindCSS
- Type-safe data models with Pydantic
- CORS-enabled API for secure cross-origin requests
- Environment-based configuration

---

## 🛠️ Tech Stack

### Backend

| Technology           | Purpose                        |
| -------------------- | ------------------------------ |
| **Python 3.9+**      | Runtime environment            |
| **FastAPI**          | High-performance web framework |
| **Supabase**         | Database and authentication    |
| **Google Gemini AI** | Content generation             |
| **Pydantic**         | Data validation                |
| **Uvicorn**          | ASGI server                    |

### Frontend

| Technology       | Purpose                     |
| ---------------- | --------------------------- |
| **React 19**     | UI library                  |
| **Vite**         | Build tool and dev server   |
| **TailwindCSS**  | Utility-first CSS framework |
| **Supabase JS**  | Authentication client       |
| **React Router** | Client-side routing         |
| **Lucide React** | Icon library                |

---

## 📁 Project Structure

```
Cognify-AI-Powered Learning Platform/
│
├── backend/                      # 🔧 FastAPI Backend
│   ├── main.py                   # Application entry point
│   ├── requirements.txt          # Python dependencies
│   ├── app/
│   │   ├── api/                  # API routes
│   │   │   ├── users.py         # User management
│   │   │   ├── chats.py         # Chat operations
│   │   │   └── exams.py         # Exam operations
│   │   ├── schemas/             # Pydantic models
│   │   │   └── models.py        # Data models
│   │   ├── services/            # Business logic
│   │   │   └── content_generator.py
│   │   └── database.py          # Database client
│   └── README.md
│
├── frontend/                     # 🎨 React Frontend
│   ├── src/
│   │   ├── App.jsx              # Main component
│   │   ├── main.jsx             # Entry point
│   │   ├── components/          # React components
│   │   │   ├── LandingPage.jsx
│   │   │   ├── ChatPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AuthModal.jsx
│   │   │   └── ...
│   │   ├── hooks/               # Custom hooks
│   │   │   └── useAuth.jsx
│   │   └── services/            # API client
│   │       └── apiService.js
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── docs/                         # 📚 Documentation
│   ├── DOCUMENTATION_INDEX.md
│   ├── PROJECT_OVERVIEW.md
│   ├── SETUP_GUIDE.md
│   ├── COMPREHENSIVE_CODE_DOCUMENTATION.md
│   ├── ARCHITECTURE_DIAGRAM.md
│   └── API_DOCUMENTATION.md
│
├── MIGRATION_SUMMARY.md          # Migration details
└── README.md                     # This file
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9 or higher
- Node.js 16 or higher
- npm or yarn
- Supabase account
- Google Gemini API key

### Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python3 -m venv venv

# 3. Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate     # On Windows

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create .env file
cat > .env << EOL
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_key
GEMINI_API_KEY=your_google_gemini_api_key
PORT=8000
HOST=0.0.0.0
EOL

# 6. Run the backend
python main.py
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be available at:** http://localhost:8000  
**API docs:** http://localhost:8000/docs

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create .env file
cat > .env << EOL
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8000
EOL

# 4. Run the frontend
npm run dev
```

**Frontend will be available at:** http://localhost:5173

---

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

1. **[Documentation Index](docs/DOCUMENTATION_INDEX.md)** - Start here for navigation
2. **[Project Overview](docs/PROJECT_OVERVIEW.md)** - High-level project overview
3. **[Setup Guide](docs/SETUP_GUIDE.md)** - Detailed setup instructions
4. **[Code Documentation](docs/COMPREHENSIVE_CODE_DOCUMENTATION.md)** - Complete code reference (~150 pages)
5. **[Architecture Diagram](docs/ARCHITECTURE_DIAGRAM.md)** - System architecture
6. **[API Documentation](docs/API_DOCUMENTATION.md)** - REST API reference

For migration details, see **[MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)**

---

## 🔌 API Endpoints

### Health Check

```http
GET / - Health check endpoint
```

### User Management

```http
POST   /api/users/           - Create new user
GET    /api/users/{user_id}  - Get user by ID
PUT    /api/users/{user_id}  - Update user
DELETE /api/users/{user_id}  - Delete user
GET    /api/users/           - List all users
```

### Chat Operations

```http
POST /api/chats/                    - Create chat with AI-generated content
POST /api/chats/{chat_id}/messages  - Add message to chat
GET  /api/chats/{chat_id}           - Get chat details
GET  /api/chats/user/{user_id}      - Get user's chat history
```

### Exam Operations

```http
POST /api/exams/generate            - Generate exam from chat
POST /api/exams/{exam_id}/submit    - Submit exam answer
POST /api/exams/{exam_id}/complete  - Complete exam
GET  /api/exams/{exam_id}           - Get exam details
```

For detailed API documentation, see [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)

---

## 🖼️ Screenshots

### Landing Page

Beautiful, modern landing page with feature highlights and testimonials.

### Chat Interface

Interactive chat with AI tutor for personalized learning experiences.

### Exam Generation

Dynamic exam creation based on conversation history with instant feedback.

### Dashboard

Track your learning progress and view chat history.

---

## 🔧 Configuration

### Backend Environment Variables

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Server Configuration
PORT=8000
HOST=0.0.0.0
```

### Frontend Environment Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key

# API Configuration
VITE_API_URL=http://localhost:8000
```

---

## 🗄️ Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Chats Table

```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Exams Table

```sql
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id),
  user_id UUID REFERENCES users(id),
  questions JSONB NOT NULL,
  answers JSONB DEFAULT '[]',
  score INTEGER,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

---

## 🧪 Testing

### Backend Testing

```bash
cd backend
pytest
```

### Frontend Testing

```bash
cd frontend
npm run test
```

---

## 🚢 Deployment

### Backend Deployment Options

- **Railway** - Recommended for FastAPI
- **Heroku** - Easy deployment
- **Google Cloud Run** - Serverless containers
- **AWS EC2** - Full control
- **DigitalOcean** - Simple VPS

### Frontend Deployment Options

- **Vercel** - Recommended for React/Vite
- **Netlify** - Easy deployment
- **GitHub Pages** - Free hosting
- **AWS S3 + CloudFront** - Scalable static hosting

For detailed deployment instructions, see [SETUP_GUIDE.md](docs/SETUP_GUIDE.md)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Team

Built with ❤️ by the Cognify Team

---

## 🙏 Acknowledgments

- Google Gemini AI for powerful content generation
- Supabase for seamless database and authentication
- FastAPI for the amazing web framework
- React team for the robust UI library
- TailwindCSS for beautiful styling

---

## 📞 Support

For issues or questions:

1. Check the [Documentation](docs/DOCUMENTATION_INDEX.md)
2. Review the [Setup Guide](docs/SETUP_GUIDE.md)
3. Check [API Documentation](docs/API_DOCUMENTATION.md)
4. Open an issue on GitHub

---

## 🗺️ Roadmap

- [ ] Add support for multiple AI models
- [ ] Implement real-time collaboration
- [ ] Add voice-based interactions
- [ ] Create mobile applications
- [ ] Add analytics dashboard
- [ ] Implement gamification features
- [ ] Add support for multiple languages
- [ ] Create teacher/admin panel

---

**Built with FastAPI + React + Supabase + Google Gemini AI**

_Last updated: November 10, 2024_
