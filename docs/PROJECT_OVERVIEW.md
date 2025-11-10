# 🎓 EduAI - Complete Project Overview

> AI-Powered Learning Platform with Intelligent Conversations and Adaptive Assessments

This document provides a complete overview of the EduAI project, including architecture, features, and setup instructions.

---

## 📖 Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [Getting Started](#getting-started)
5. [Documentation](#documentation)
6. [Project Structure](#project-structure)
7. [API Overview](#api-overview)
8. [Contributing](#contributing)

---

## 🌟 Project Overview

**EduAI** is a modern educational platform that combines artificial intelligence with interactive learning. Students can:

- Have realistic conversations with an AI tutor on any subject
- Take automatically generated exams based on their learning
- Receive instant feedback and explanations
- Track their progress over time

The platform uses **Google Gemini AI** for content generation, **Supabase** for data persistence, **FastAPI** for the backend, and **React** for the frontend.

---

## ✨ Key Features

### 🤖 AI-Powered Learning
- Generate complete educational conversations on any subject
- Adjustable difficulty levels (Beginner, Intermediate, Advanced)
- Natural, engaging dialogue between student and AI tutor

### 📝 Adaptive Exams
- Automatically generate exams from chat conversations
- Create topic-based exams without prior conversation
- Multiple choice questions with explanations
- Instant feedback on answers

### 💡 Interactive Learning
- Continue conversations with follow-up questions
- Deep dive into topics with AI guidance
- Persistent chat history
- Real-time message exchange

### 📊 Progress Tracking
- Exam scores and completion rates
- Learning history and analytics
- Subject-specific progress
- Time spent on topics

### 🔒 Secure & Scalable
- Supabase authentication
- PostgreSQL database with JSONB support
- RESTful API architecture
- Responsive design for all devices

---

## 🏗️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Python 3.9+** - Programming language
- **Supabase** - PostgreSQL database and auth
- **Google Gemini AI** - Content generation
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Supabase Client** - Database/auth client
- **Fetch API** - HTTP requests

### Infrastructure
- **Supabase** - Database hosting
- **Railway/Render** - Backend hosting (recommended)
- **Vercel/Netlify** - Frontend hosting (recommended)

---

## 🚀 Getting Started

### Quick Start (5 minutes)

#### 1. Prerequisites
- Python 3.9+
- Node.js 16+
- Supabase account (free tier)
- Gemini API key (free tier)

#### 2. Clone Repository
```bash
git clone https://github.com/yourusername/Cognify-AI-Powered-Learning-Platform.git
cd Cognify-AI-Powered-Learning-Platform/EduAI
```

#### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo "SUPABASE_URL=your_url" > .env
echo "SUPABASE_SERVICE_ROLE_KEY=your_key" >> .env
echo "GEMINI_API_KEY=your_key" >> .env

python main.py
```

#### 4. Frontend Setup
```bash
cd EduAI
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:8000" > .env
echo "VITE_SUPABASE_URL=your_url" >> .env
echo "VITE_SUPABASE_ANON_KEY=your_key" >> .env

npm run dev
```

#### 5. Open Browser
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/docs

---

## 📚 Documentation

We've created comprehensive documentation to help you understand and work with EduAI:

### 📘 Essential Guides

1. **[SETUP_GUIDE.md](SETUP_GUIDE.md)**
   - Detailed installation instructions
   - Environment variable configuration
   - Database setup
   - Troubleshooting common issues

2. **[COMPREHENSIVE_CODE_DOCUMENTATION.md](COMPREHENSIVE_CODE_DOCUMENTATION.md)**
   - Complete code walkthrough
   - Backend architecture explanation
   - Frontend component structure
   - Data models and schemas
   - Business logic and algorithms
   - User flow scenarios

3. **[ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)**
   - System architecture diagrams
   - Data flow visualizations
   - Component interaction maps
   - Database schema relationships
   - Deployment architecture

4. **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)**
   - Complete REST API reference
   - All endpoints with examples
   - Request/response formats
   - Error handling
   - Authentication

### 🔗 Quick Reference

- **Interactive API Docs:** http://localhost:8000/docs (when running)
- **Health Check Endpoint:** http://localhost:8000/health
- **Alternative API Docs:** http://localhost:8000/redoc

---

## 📁 Project Structure

```
EduAI/
│
├── backend/                      # FastAPI Backend
│   ├── main.py                   # Application entry point
│   ├── requirements.txt          # Python dependencies
│   ├── .env                      # Environment variables
│   │
│   └── app/
│       ├── __init__.py
│       ├── database.py           # Supabase client (singleton)
│       │
│       ├── api/                  # API route modules
│       │   ├── users.py          # User management
│       │   ├── chats.py          # Chat operations
│       │   └── exams.py          # Exam operations
│       │
│       ├── schemas/              # Data models
│       │   └── models.py         # Pydantic models
│       │
│       └── services/             # Business logic
│           └── content_generator.py  # AI service
│
├── src/                          # React Frontend
│   ├── main.jsx                  # React entry point
│   ├── App.jsx                   # Main app component
│   ├── index.css                 # Global styles
│   ├── supabase.jsx              # Supabase config
│   │
│   ├── components/               # React components
│   │   ├── LandingPage.jsx       # Landing page
│   │   ├── ChatPage.jsx          # Main chat interface
│   │   ├── AuthModal.jsx         # Authentication modal
│   │   ├── Dashboard.jsx         # User dashboard
│   │   └── ...                   # Other components
│   │
│   ├── hooks/                    # Custom React hooks
│   │   └── useAuth.jsx           # Authentication hook
│   │
│   └── services/                 # API clients
│       └── apiService.js         # Backend API client
│
├── Documentation/                # Project documentation
│   ├── SETUP_GUIDE.md
│   ├── COMPREHENSIVE_CODE_DOCUMENTATION.md
│   ├── ARCHITECTURE_DIAGRAM.md
│   └── API_DOCUMENTATION.md
│
├── package.json                  # Frontend dependencies
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind CSS config
└── README.md                    # This file
```

---

## 🔌 API Overview

### Base URL
- Development: `http://localhost:8000`
- Production: `https://your-api-domain.com`

### Main Endpoints

#### Health Check
```http
GET /health
```
Check API status and dependencies

#### Users
```http
POST   /api/users/          # Create user
GET    /api/users/{id}      # Get user
PUT    /api/users/{id}      # Update user
DELETE /api/users/{id}      # Delete user
```

#### Chats
```http
POST /api/chats/generate                # Generate AI chat
GET  /api/chats/{id}                    # Get chat
GET  /api/chats/user/{user_id}          # Get user's chats
POST /api/chats/{id}/messages           # Add message
```

#### Exams
```http
POST /api/exams/generate-from-chat/{chat_id}  # Generate from chat
POST /api/exams/generate-by-topic              # Generate by topic
GET  /api/exams/{id}                           # Get exam
POST /api/exams/{id}/submit-answer             # Submit answer
POST /api/exams/{id}/complete                  # Complete exam
GET  /api/exams/{id}/results                   # Get results
```

For complete API documentation, see **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)**

---

## 🎯 Usage Examples

### Example 1: Generate Learning Conversation

```javascript
// Frontend code
const chat = await apiService.generateChat(
  userId, 
  'Mathematics', 
  'intermediate'
);

// Display messages
chat.chat_data.messages.forEach(msg => {
  console.log(`${msg.from_user}: ${msg.text}`);
});
```

### Example 2: Take an Exam

```javascript
// Generate exam from chat
const exam = await apiService.generateExamFromChat(chatId, userId, 5);

// Answer questions
for (const question of exam.exam_data.questions) {
  const answer = await getUserAnswer(question);
  await apiService.submitAnswer(exam.exam_id, question.id, answer);
}

// Complete and view results
const results = await apiService.completeExam(exam.exam_id);
console.log(`Score: ${results.results.score}%`);
```

### Example 3: Interactive Chat

```javascript
// Add message to existing chat
const response = await apiService.addMessageToChat(
  chatId,
  "Can you explain more about calculus?"
);

console.log(response.response);
```

---

## 🗺️ Roadmap

### Version 2.1 (Q1 2026)
- [ ] Real-time chat with WebSockets
- [ ] Voice input for questions
- [ ] Enhanced progress dashboard
- [ ] Spaced repetition system

### Version 2.2 (Q2 2026)
- [ ] Mobile app (React Native)
- [ ] Collaborative learning features
- [ ] PDF upload for exam generation
- [ ] Support for multiple AI models

### Version 3.0 (Q3 2026)
- [ ] Gamification (badges, leaderboards)
- [ ] Video lessons integration
- [ ] Teacher dashboard
- [ ] Multi-language support

---

## 🤝 Contributing

We welcome contributions from the community!

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint rules for JavaScript
- Write tests for new features
- Update documentation
- Keep commits atomic and descriptive

---

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
- Check virtual environment is activated
- Verify all dependencies installed: `pip install -r requirements.txt`
- Check environment variables in `.env`

**Frontend won't connect:**
- Ensure backend is running on port 8000
- Verify `VITE_API_URL` in frontend `.env`
- Check browser console for errors

**Database errors:**
- Verify Supabase credentials
- Ensure database tables are created
- Check Supabase project status

For detailed troubleshooting, see **[SETUP_GUIDE.md](SETUP_GUIDE.md)**

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Team

### Core Team
- **Istiak Ahammed Rhyme** - Lead Developer
- **Jubayerahmed Sojib** - Backend Developer & Documentation

### Contributors
We thank all contributors who have helped make EduAI better!

---

## 🙏 Acknowledgments

- **Google Gemini AI** - For powerful content generation
- **Supabase** - For excellent database and auth services
- **FastAPI Team** - For the amazing web framework
- **React Team** - For the incredible UI library
- **TailwindCSS** - For beautiful, utility-first styling
- **All Contributors** - For your valuable contributions

---

## 📞 Contact & Support

- **Documentation:** Check the guides in this repository
- **Issues:** Use GitHub Issues for bug reports
- **Questions:** Open a GitHub Discussion
- **Email:** eduai.support@example.com

---

## ⭐ Star Us!

If you find this project helpful, please give it a star! It helps us grow and motivates us to continue improving EduAI.

[![GitHub stars](https://img.shields.io/github/stars/yourusername/Cognify-AI-Powered-Learning-Platform?style=social)](https://github.com/yourusername/Cognify-AI-Powered-Learning-Platform)

---

## 📊 Project Status

![Status](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-2.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Python](https://img.shields.io/badge/Python-3.9+-blue)
![React](https://img.shields.io/badge/React-19.1+-61DAFB)

---

**Built with ❤️ by the EduAI Team**

*Empowering education through artificial intelligence*

---

*Last Updated: November 10, 2025*
