# 🚀 Quick Reference Guide - Refactored Backend

## 📂 File Locations Quick Reference

### Need to...

**Configure environment settings?**
→ `app/core/config.py`

**Add security functions (hashing, JWT)?**
→ `app/core/security.py`

**Add utility functions?**
→ `app/core/utils.py`

**Modify database connection?**
→ `app/db/session.py`

**Add new database methods?**
→ `app/db/base.py` (MongoDataStore class)

**Modify MongoDB operations?**
→ `app/db/base.py`

**Add in-memory storage fallback logic?**
→ `app/db/init_db.py`

**Define new domain models?**
→ `app/models/` (user.py, chat.py, exam.py, note.py)

**Add request/response schemas?**
→ `app/schemas/` (user.py, auth.py, chat.py, exam.py, note.py)

**Add business logic?**
→ `app/services/` (ai_service.py, user_service.py, chat_service.py, exam_service.py, note_service.py)

**Modify AI/ML operations?**
→ `app/services/ai_service.py`

**Add PDF extraction logic?**
→ `app/services/pdf_service.py` or `app/pdfReader/extract_pdf.py`

**Add dependency injection?**
→ `app/api/deps.py`

**Add new API endpoints?**
→ `app/api/v1/` (auth.py, users.py, chat.py, exams.py, notes.py)

**Modify authentication endpoints?**
→ `app/api/v1/auth.py`

**Modify user endpoints?**
→ `app/api/v1/users.py`

**Modify chat endpoints?**
→ `app/api/v1/chat.py`

**Modify exam endpoints?**
→ `app/api/v1/exams.py`

**Modify note endpoints?**
→ `app/api/v1/notes.py`

**Configure FastAPI app?**
→ `main.py`

**Add middleware?**
→ `main.py`

**Add error handlers?**
→ `main.py`

---

## 🔌 Import Paths Reference

```python
# Core
from app.core.config import get_settings
from app.core.security import hash_password, verify_password, create_access_token
from app.core.utils import generate_uuid, sanitize_dict

# Database
from app.db.base import MongoDataStore
from app.db.init_db import InMemoryDataStore
from app.db.session import DatabaseSession

# Models (Domain)
from app.models.user import User
from app.models.chat import Chat, Message
from app.models.exam import Exam, Question, ExamResult
from app.models.note import Note

# Schemas (Request/Response)
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import SignUpRequest, SignInRequest, TokenResponse
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.exam import ExamCreateRequest, ExamSubmitRequest
from app.schemas.note import NoteCreateRequest, NoteResponse

# Services
from app.services.ai_service import AIService
from app.services.user_service import UserService
from app.services.chat_service import ChatService
from app.services.exam_service import ExamService
from app.services.note_service import NoteService
from app.services.pdf_service import PDFService

# API Dependencies
from app.api.deps import (
    get_data_store,
    get_ai_service,
    get_user_service,
    get_chat_service,
    get_current_user
)
```

---

## 🛠️ Common Tasks

### **Add a New API Endpoint**

1. Choose the appropriate router file in `app/api/v1/`
2. Add the endpoint function with dependency injection:

```python
from fastapi import APIRouter, Depends
from app.services.your_service import YourService
from app.api.deps import get_your_service

router = APIRouter(prefix="/your-resource")

@router.post("/")
async def create_resource(
    data: YourSchema,
    service: YourService = Depends(get_your_service)
):
    result = await service.create(data)
    return result
```

### **Add a New Service**

1. Create file in `app/services/your_service.py`
2. Create service class:

```python
import logging
from app.db.base import MongoDataStore

logger = logging.getLogger(__name__)

class YourService:
    def __init__(self, data_store: MongoDataStore):
        self.data_store = data_store

    async def create(self, data: dict):
        # Your business logic here
        pass
```

3. Add to `app/services/__init__.py`
4. Add dependency in `app/api/deps.py`

### **Add a New Schema**

1. Create file in `app/schemas/your_schema.py`
2. Define Pydantic models:

```python
from pydantic import BaseModel, Field

class YourRequest(BaseModel):
    field: str = Field(..., description="Field description")

    class Config:
        json_schema_extra = {
            "example": {"field": "value"}
        }
```

3. Add to `app/schemas/__init__.py`

### **Add Database Methods**

Add to `MongoDataStore` in `app/db/base.py`:

```python
async def add_your_resource(self, resource_id: str, data: Dict[str, Any]) -> Dict:
    """Add your resource to database."""
    data["id"] = resource_id
    data["created_at"] = datetime.now().isoformat()
    await self.db.your_collection.insert_one(data)
    return data
```

### **Add Configuration Setting**

Add to `Settings` class in `app/core/config.py`:

```python
class Settings(BaseSettings):
    YOUR_SETTING: str = Field("default_value", description="Setting description")
```

---

## 🧪 Testing Examples

### **Test Service Directly**

```python
from app.services.user_service import UserService
from app.db.init_db import InMemoryDataStore

# Create service with in-memory storage for testing
data_store = InMemoryDataStore()
user_service = UserService(data_store)

# Test user creation
result = await user_service.create_user(
    email="test@example.com",
    password="test123",
    full_name="Test User"
)

assert result["success"] == True
```

### **Test API Endpoint**

```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_signup():
    response = client.post("/api/auth/signup", json={
        "email": "test@example.com",
        "password": "test123",
        "fullName": "Test User"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
```

---

## 📊 Architecture Layers

```
┌─────────────────────────────────────────┐
│           main.py (FastAPI App)         │  ← Entry point
├─────────────────────────────────────────┤
│         app/api/v1/ (Routes)            │  ← HTTP endpoints
├─────────────────────────────────────────┤
│      app/services/ (Business Logic)     │  ← Domain logic
├─────────────────────────────────────────┤
│     app/db/base.py (Data Access)        │  ← Database operations
├─────────────────────────────────────────┤
│    app/db/session.py (DB Connection)    │  ← MongoDB driver
└─────────────────────────────────────────┘

Supporting Layers:
├── app/core/        → Configuration, security, utilities
├── app/models/      → Domain models
└── app/schemas/     → Request/response validation
```

---

## 🔑 Key Principles

1. **Routes call Services** (not database directly)
2. **Services contain Business Logic**
3. **Services call Repository** (MongoDataStore)
4. **Repository handles Database Operations**
5. **Dependencies Injected** via FastAPI Depends()
6. **Schemas Validate** all input/output
7. **Models Define** domain entities

---

## 💡 Tips

- **Keep routes thin**: Just call services, handle errors
- **Keep services focused**: Single responsibility
- **Use dependency injection**: Makes testing easier
- **Use Pydantic models**: Auto validation + documentation
- **Log errors**: Use logger, not print()
- **Return dicts from services**: Let routes format responses
- **Use async/await**: For database operations
- **Type hints everywhere**: Better IDE support

---

## 📚 Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Pydantic Docs**: https://docs.pydantic.dev/
- **Motor (Async MongoDB)**: https://motor.readthedocs.io/
- **Dependency Injection**: https://fastapi.tiangolo.com/tutorial/dependencies/

---

**Last Updated**: $(date)
