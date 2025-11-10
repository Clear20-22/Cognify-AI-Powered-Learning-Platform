# EduAI API Documentation

Complete REST API reference for the EduAI backend service.

**Base URL:** `http://localhost:8000` (development)

**API Version:** 2.0.0

---

## 📚 Table of Contents

- [Authentication](#authentication)
- [Health Check](#health-check)
- [Users API](#users-api)
- [Chats API](#chats-api)
- [Exams API](#exams-api)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## 🔐 Authentication

Currently, the API uses Supabase authentication for user management. The frontend handles authentication and passes user IDs to the backend.

### Future Enhancement
```
Authorization: Bearer <token>
```

---

## 💓 Health Check

### GET /health

Check the health status of the API and its dependencies.

**Response:**
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

**Status Codes:**
- `200` - Service is healthy
- `500` - Service is unhealthy

---

## 👤 Users API

Base path: `/api/users`

### Create User

**POST** `/api/users/`

Create a new user profile.

**Request Body:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "display_name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notifications": true,
    "difficulty_level": "intermediate"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "display_name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notifications": true,
    "difficulty_level": "intermediate"
  },
  "created_at": "2025-11-10T10:30:00Z",
  "updated_at": "2025-11-10T10:30:00Z"
}
```

**Error Responses:**
- `400` - User already exists
- `500` - Failed to create user

---

### Get User

**GET** `/api/users/{user_id}`

Retrieve a user profile by ID.

**Path Parameters:**
- `user_id` (UUID, required) - User identifier

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "display_name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "preferences": {
    "theme": "dark",
    "language": "en"
  },
  "created_at": "2025-11-10T10:30:00Z",
  "updated_at": "2025-11-10T10:30:00Z"
}
```

**Error Responses:**
- `404` - User not found
- `500` - Failed to get user

---

### Update User

**PUT** `/api/users/{user_id}`

Update a user profile.

**Path Parameters:**
- `user_id` (UUID, required) - User identifier

**Request Body:**
```json
{
  "display_name": "Jane Doe",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "preferences": {
    "theme": "light"
  }
}
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "display_name": "Jane Doe",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "preferences": {
    "theme": "light",
    "language": "en"
  },
  "created_at": "2025-11-10T10:30:00Z",
  "updated_at": "2025-11-10T12:45:00Z"
}
```

---

### Delete User

**DELETE** `/api/users/{user_id}`

Delete a user profile.

**Response:** `200 OK`
```json
{
  "message": "User deleted successfully"
}
```

---

### List Users

**GET** `/api/users/`

List all users with pagination.

**Query Parameters:**
- `limit` (integer, optional, default: 50) - Maximum number of results
- `offset` (integer, optional, default: 0) - Number of results to skip

**Response:** `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_name": "John Doe",
    "created_at": "2025-11-10T10:30:00Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "display_name": "Jane Smith",
    "created_at": "2025-11-10T11:00:00Z"
  }
]
```

---

## 💬 Chats API

Base path: `/api/chats`

### Generate Chat with AI Content

**POST** `/api/chats/generate`

Generate a new chat with AI-generated educational conversation.

**Query Parameters:**
- `user_id` (UUID, required) - User identifier
- `subject` (string, required) - Subject of conversation (e.g., "Mathematics", "Physics")
- `difficulty` (string, optional, default: "intermediate") - Difficulty level ("beginner", "intermediate", "advanced")

**Example:**
```
POST /api/chats/generate?user_id=550e8400-e29b-41d4-a716-446655440000&subject=Mathematics&difficulty=intermediate
```

**Response:** `200 OK`
```json
{
  "chat_id": "770e8400-e29b-41d4-a716-446655440002",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Mathematics Discussion - Intermediate Level",
  "subject": "Mathematics",
  "chat_data": {
    "messages": [
      {
        "id": "msg_1",
        "from_user": "user",
        "text": "Hi! Can you help me understand algebra?",
        "timestamp": "2025-11-10T10:00:00Z"
      },
      {
        "id": "msg_2",
        "from_user": "ai",
        "text": "Of course! Algebra is the study of mathematical symbols...",
        "timestamp": "2025-11-10T10:01:00Z"
      }
    ],
    "metadata": {
      "subject": "Mathematics",
      "difficulty": "intermediate",
      "tags": ["mathematics", "algebra", "learning"],
      "language": "en"
    }
  },
  "created_at": "2025-11-10T10:00:00Z",
  "updated_at": "2025-11-10T10:00:00Z"
}
```

---

### Create Chat

**POST** `/api/chats/`

Create a new chat manually (without AI generation).

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Custom Chat",
  "subject": "Physics",
  "chat_data": {
    "messages": [],
    "metadata": {
      "subject": "Physics",
      "difficulty": "beginner"
    }
  }
}
```

**Response:** `200 OK`

---

### Get Chat

**GET** `/api/chats/{chat_id}`

Retrieve a specific chat.

**Path Parameters:**
- `chat_id` (UUID, required) - Chat identifier

**Response:** `200 OK`
```json
{
  "chat_id": "770e8400-e29b-41d4-a716-446655440002",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Mathematics Discussion",
  "subject": "Mathematics",
  "chat_data": {
    "messages": [...],
    "metadata": {...}
  },
  "created_at": "2025-11-10T10:00:00Z",
  "updated_at": "2025-11-10T10:00:00Z"
}
```

---

### Get User Chats

**GET** `/api/chats/user/{user_id}`

Get all chats for a specific user.

**Path Parameters:**
- `user_id` (UUID, required) - User identifier

**Query Parameters:**
- `limit` (integer, optional, default: 50)
- `offset` (integer, optional, default: 0)

**Response:** `200 OK`
```json
[
  {
    "chat_id": "770e8400-e29b-41d4-a716-446655440002",
    "title": "Mathematics Discussion",
    "subject": "Mathematics",
    "created_at": "2025-11-10T10:00:00Z"
  },
  {
    "chat_id": "880e8400-e29b-41d4-a716-446655440003",
    "title": "Physics Q&A",
    "subject": "Physics",
    "created_at": "2025-11-09T14:30:00Z"
  }
]
```

---

### Update Chat

**PUT** `/api/chats/{chat_id}`

Update a chat.

**Request Body:**
```json
{
  "title": "Updated Title",
  "subject": "Advanced Mathematics",
  "chat_data": {
    "messages": [...],
    "metadata": {...}
  }
}
```

**Response:** `200 OK`

---

### Delete Chat

**DELETE** `/api/chats/{chat_id}`

Delete a chat.

**Response:** `200 OK`
```json
{
  "message": "Chat deleted successfully"
}
```

---

### Add Message to Chat

**POST** `/api/chats/{chat_id}/messages`

Add a message to an existing chat and get AI response.

**Path Parameters:**
- `chat_id` (UUID, required) - Chat identifier

**Request Body:**
```json
{
  "message": "Can you explain quadratic equations?"
}
```

**Response:** `200 OK`
```json
{
  "response": "A quadratic equation is an equation of the form ax² + bx + c = 0...",
  "chat_id": "770e8400-e29b-41d4-a716-446655440002",
  "message_id": "msg_7",
  "success": true
}
```

---

### Get Chat Messages

**GET** `/api/chats/{chat_id}/messages`

Get all messages from a chat.

**Response:** `200 OK`
```json
{
  "messages": [
    {
      "id": "msg_1",
      "from_user": "user",
      "text": "Hello!",
      "timestamp": "2025-11-10T10:00:00Z"
    },
    {
      "id": "msg_2",
      "from_user": "ai",
      "text": "Hi! How can I help?",
      "timestamp": "2025-11-10T10:01:00Z"
    }
  ]
}
```

---

### Quick Chat (No Save)

**POST** `/api/chats/quick-chat`

Send a message without creating a persistent chat (for anonymous users).

**Request Body:**
```json
{
  "message": "What is calculus?"
}
```

**Response:** `200 OK`
```json
{
  "response": "Calculus is a branch of mathematics that studies continuous change...",
  "chat_id": "temp_990e8400-e29b-41d4-a716-446655440004",
  "message_id": "temp_msg_1",
  "success": true
}
```

---

## 📝 Exams API

Base path: `/api/exams`

### Generate Exam from Chat

**POST** `/api/exams/generate-from-chat/{chat_id}`

Generate an exam based on a chat conversation.

**Path Parameters:**
- `chat_id` (UUID, required) - Chat identifier

**Query Parameters:**
- `user_id` (UUID, required) - User identifier
- `num_questions` (integer, optional, default: 5) - Number of questions to generate

**Example:**
```
POST /api/exams/generate-from-chat/770e8400-e29b-41d4-a716-446655440002?user_id=550e8400-e29b-41d4-a716-446655440000&num_questions=5
```

**Response:** `200 OK`
```json
{
  "exam_id": "aa0e8400-e29b-41d4-a716-446655440005",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "chat_id": "770e8400-e29b-41d4-a716-446655440002",
  "title": "Mathematics Assessment",
  "subject": "Mathematics",
  "status": "in_progress",
  "exam_data": {
    "questions": [
      {
        "id": "q1",
        "type": "mcq",
        "question": "What is the standard form of a quadratic equation?",
        "options": [
          "ax² + bx + c = 0",
          "ax + b = 0",
          "ax³ + bx² + c = 0",
          "y = mx + b"
        ],
        "correct_answer": "ax² + bx + c = 0",
        "explanation": "The standard form of a quadratic equation is ax² + bx + c = 0, where a ≠ 0."
      }
    ],
    "user_answers": [],
    "results": {}
  },
  "created_at": "2025-11-10T10:30:00Z",
  "updated_at": "2025-11-10T10:30:00Z"
}
```

---

### Generate Exam by Topic

**POST** `/api/exams/generate-by-topic`

Generate an exam for a specific subject/topic.

**Query Parameters:**
- `user_id` (UUID, required) - User identifier
- `subject` (string, required) - Subject (e.g., "Physics", "Chemistry")
- `topic` (string, optional) - Specific topic (e.g., "Newton's Laws")
- `difficulty` (string, optional, default: "intermediate") - Difficulty level
- `num_questions` (integer, optional, default: 5) - Number of questions
- `chat_id` (UUID, optional) - Link to a chat

**Example:**
```
POST /api/exams/generate-by-topic?user_id=550e8400-e29b-41d4-a716-446655440000&subject=Physics&topic=Newton's Laws&difficulty=advanced&num_questions=10
```

**Response:** `200 OK` (same structure as above)

---

### Create Exam

**POST** `/api/exams/`

Create an exam manually.

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "chat_id": "770e8400-e29b-41d4-a716-446655440002",
  "title": "Custom Exam",
  "subject": "Mathematics",
  "exam_data": {
    "questions": [
      {
        "id": "q1",
        "type": "mcq",
        "question": "What is 2+2?",
        "options": ["3", "4", "5"],
        "correct_answer": "4"
      }
    ],
    "user_answers": [],
    "results": {}
  },
  "status": "in_progress"
}
```

---

### Get Exam

**GET** `/api/exams/{exam_id}`

Retrieve a specific exam.

**Response:** `200 OK`

---

### Get User Exams

**GET** `/api/exams/user/{user_id}`

Get all exams for a user.

**Query Parameters:**
- `status` (string, optional) - Filter by status ("in_progress", "completed", "abandoned")
- `limit` (integer, optional, default: 50)
- `offset` (integer, optional, default: 0)

**Response:** `200 OK`
```json
[
  {
    "exam_id": "aa0e8400-e29b-41d4-a716-446655440005",
    "title": "Mathematics Assessment",
    "subject": "Mathematics",
    "status": "completed",
    "created_at": "2025-11-10T10:30:00Z"
  }
]
```

---

### Get Chat Exams

**GET** `/api/exams/chat/{chat_id}`

Get all exams associated with a chat.

**Response:** `200 OK`

---

### Update Exam

**PUT** `/api/exams/{exam_id}`

Update an exam.

**Request Body:**
```json
{
  "title": "Updated Title",
  "status": "completed",
  "exam_data": {...}
}
```

---

### Delete Exam

**DELETE** `/api/exams/{exam_id}`

Delete an exam.

**Response:** `200 OK`

---

### Submit Answer

**POST** `/api/exams/{exam_id}/submit-answer`

Submit an answer for a specific question.

**Request Body:**
```json
{
  "exam_id": "aa0e8400-e29b-41d4-a716-446655440005",
  "question_id": "q1",
  "answer": "ax² + bx + c = 0"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "is_correct": true,
  "explanation": "The standard form of a quadratic equation is ax² + bx + c = 0, where a ≠ 0."
}
```

---

### Complete Exam

**POST** `/api/exams/{exam_id}/complete`

Complete an exam and calculate results.

**Response:** `200 OK`
```json
{
  "success": true,
  "results": {
    "score": 80.0,
    "total_questions": 5,
    "correct_answers": 4,
    "time_taken": null,
    "completion_rate": 100.0
  }
}
```

---

### Get Exam Results

**GET** `/api/exams/{exam_id}/results`

Get detailed exam results.

**Response:** `200 OK`
```json
{
  "exam_id": "aa0e8400-e29b-41d4-a716-446655440005",
  "status": "completed",
  "results": {
    "score": 80.0,
    "total_questions": 5,
    "correct_answers": 4,
    "completion_rate": 100.0
  },
  "questions": [
    {
      "id": "q1",
      "question": "What is the standard form of a quadratic equation?",
      "correct_answer": "ax² + bx + c = 0"
    }
  ],
  "user_answers": [
    {
      "question_id": "q1",
      "answer": "ax² + bx + c = 0",
      "is_correct": true
    }
  ]
}
```

---

## ⚠️ Error Handling

All API endpoints follow standard HTTP error codes:

### Common Error Responses

**400 Bad Request**
```json
{
  "detail": "Missing required parameter: user_id"
}
```

**404 Not Found**
```json
{
  "detail": "Chat not found"
}
```

**500 Internal Server Error**
```json
{
  "detail": "Failed to generate chat: API error"
}
```

### Error Status Codes

- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (future: missing/invalid token)
- `403` - Forbidden (future: insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `422` - Unprocessable Entity (validation error)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (server-side issue)
- `503` - Service Unavailable (AI/database down)

---

## 🔄 Rate Limiting

*Currently not implemented. Future enhancement:*

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1636550400
```

---

## 📊 Response Headers

Common response headers:

```
Content-Type: application/json
X-Request-ID: uuid-here
X-Response-Time: 234ms
```

---

## 🧪 Testing with cURL

### Create User
```bash
curl -X POST http://localhost:8000/api/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_name": "Test User"
  }'
```

### Generate Chat
```bash
curl -X POST "http://localhost:8000/api/chats/generate?user_id=550e8400-e29b-41d4-a716-446655440000&subject=Mathematics&difficulty=intermediate"
```

### Generate Exam
```bash
curl -X POST "http://localhost:8000/api/exams/generate-by-topic?user_id=550e8400-e29b-41d4-a716-446655440000&subject=Physics&num_questions=5"
```

### Submit Answer
```bash
curl -X POST http://localhost:8000/api/exams/{exam_id}/submit-answer \
  -H "Content-Type: application/json" \
  -d '{
    "exam_id": "aa0e8400-e29b-41d4-a716-446655440005",
    "question_id": "q1",
    "answer": "ax² + bx + c = 0"
  }'
```

---

## 📖 Interactive Documentation

FastAPI provides automatic interactive API documentation:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

These interfaces allow you to:
- See all available endpoints
- Test endpoints directly in the browser
- View request/response schemas
- Download OpenAPI specification

---

## 🔐 Security Best Practices

1. **Never expose service role key in frontend**
2. **Use HTTPS in production**
3. **Implement rate limiting**
4. **Validate all user inputs**
5. **Use environment variables for secrets**
6. **Enable CORS only for trusted origins**
7. **Implement authentication tokens**
8. **Log security events**

---

## 📝 Changelog

### Version 2.0.0 (Current)
- Complete API rewrite with FastAPI
- AI-powered content generation
- Supabase integration
- Structured data models
- Interactive exam system

### Version 1.0.0
- Basic chat functionality
- Simple AI responses
- No persistence

---

## 🆘 Support

- **API Issues:** Check server logs
- **Documentation:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

---

**EduAI API Documentation**  
*Last Updated: November 10, 2025*
