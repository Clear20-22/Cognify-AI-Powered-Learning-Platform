# 🏛️ Cognify AI — Design Patterns & Software Architecture Masterclass

Welcome to the **Design Patterns & Architecture Reference** for the Cognify AI Learning Platform. This guide explains the **12 software design patterns** implemented across the codebase, complete with architectural diagrams, SOLID principles alignment, before/after code comparisons, and engineering decision trees.

---

## 🧭 Interactive Pattern Decision Tree

```
                                  What problem are you trying to solve?
                                                   │
         ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
         ▼                                         ▼                                         ▼
Need to encapsulate an algorithm         Need to construct or create               Need to structure & connect
or runtime behavior?                     objects cleanly?                          components cleanly?
         │                                         │                                         │
 ┌───────┴───────┐                         ┌───────┴───────┐                         ┌───────┴───────┐
 ▼               ▼                         ▼               ▼                         ▼               ▼
Interchangeable  Sequential                Dynamic object  Step-by-step              Simplify        Adapt incompatible
algorithms?      failover chain?           instantiation?  complex construction?     subsystem?      JSON interfaces?
 │               │                         │               │                         │               │
 ▼               ▼                         ▼               ▼                         ▼               ▼
Strategy         Chain of                  Factory         Builder                   Facade          Adapter
Pattern          Responsibility            Method          Pattern                   Pattern         Pattern
```

---

## 📊 SOLID Principles & Design Pattern Mapping

Design patterns are concrete solutions to classic software design problems that enforce **SOLID principles**:

| SOLID Principle | Meaning | Implemented Pattern(s) | How It Satisfies The Principle |
| :--- | :--- | :--- | :--- |
| **S** — Single Responsibility | A class should have only 1 reason to change. | **Strategy Pattern** & **Custom Hooks** | Separates AI provider execution (`GroqProvider`) and UI React rendering from state logic (`useChatSession`). |
| **O** — Open/Closed | Open for extension, closed for modification. | **Factory Method** & **Template Method** | You can add a new AI model or document parser by adding a single class without touching existing caller code. |
| **L** — Liskov Substitution | Subtypes must be substitutable for base types. | **Repository Pattern** & `IDataStore` | `InMemoryDataStore` and `MongoDataStore` implement `IDataStore` with 100% behavioral parity. |
| **I** — Interface Segregation | Prefer small, specific interfaces over monolithic ones. | `BaseAIProvider` | `BaseAIProvider` specifies only essential AI capabilities without forcing unused methods. |
| **D** — Dependency Inversion | Depend on abstractions, not concretions. | **Dependency Injection** (`Depends`) | Route handlers receive `IDataStore` and `AIService` abstractions via FastAPI's DI container. |

---

## 🔄 Real-World AI Failover Scenario

Here is how **Strategy**, **Chain of Responsibility**, and **Decorator** work in harmony during a live system event:

```
  [HTTP Request: "Generate Quiz"]
                 │
                 ▼
          ┌──────────────┐
          │  AIService   │ (Facade)
          └──────┬───────┘
                 │
                 ▼
     ┌────────────────────────┐
     │    AIProviderChain     │ (Chain of Responsibility)
     └───────────┬────────────┘
                 │
                 ├──────────────────────────────┐
                 ▼ (Attempt 1)                  ▼ (Attempt 2)
       ┌───────────────────┐          ┌───────────────────┐
       │   GroqProvider    │          │  GeminiProvider   │ (Strategy Pattern)
       └─────────┬─────────┘          └─────────┬─────────┘
                 │                              │
                 ▼                              ▼
      @with_retry_and_backoff        @with_retry_and_backoff (Decorator Pattern)
                 │                              │
        ❌ (Rate Limit 429)            ✅ (200 OK Success)
                 │                              │
                 └───────────► Failover ────────┘
```

---

## 📘 Detailed Pattern Masterclass

---

### 1. 🎯 Strategy Pattern (Behavioral)

#### Intent
Define a family of algorithms, encapsulate each one, and make them interchangeable at runtime.

#### Before vs. After Design Pattern

🔴 **Before (Tight Coupling & Messy `if/else`)**:
```python
# Monolithic, fragile code
class AIService:
    def generate(self, prompt, provider):
        if provider == "groq":
            return groq_client.chat.completions.create(...)
        elif provider == "gemini":
            return gemini_model.generate_content(...)
        elif provider == "openai":
            return openai_client.completions.create(...)
```

🟢 **After (Strategy Pattern)**:
```python
# Abstract Strategy Interface
class BaseAIProvider(ABC):
    @abstractmethod
    def generate_response(self, prompt: str, context: Optional[str] = None) -> str: ...

# Concrete Strategies
class GroqProvider(BaseAIProvider): ...
class GeminiProvider(BaseAIProvider): ...
class MockProvider(BaseAIProvider): ...
```

#### Code Locations
- Interface: [`BaseAIProvider`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_providers/base_provider.py)
- Strategies: [`GroqProvider`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_providers/groq_provider.py), [`GeminiProvider`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_providers/gemini_provider.py), [`MockProvider`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_providers/mock_provider.py)

---

### 2. 🏭 Factory Method Pattern (Creational)

#### Intent
Provide an interface for creating objects in a superclass, delegating instantiation choices to factories.

#### Code Reference
```python
class DocumentExtractorFactory:
    _strategies = {
        "pdf": PDFExtractorStrategy(),
        "pptx": PPTXExtractorStrategy()
    }

    @classmethod
    def get_extractor(cls, file_path: str) -> DocumentExtractorTemplate:
        for ext, strategy in cls._strategies.items():
            if file_path.lower().endswith(f".{ext}"):
                return strategy
        raise ValueError(f"Unsupported file format: {file_path}")
```

#### Code Locations
- [`AIProviderFactory`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_providers/provider_factory.py#L42)
- [`DocumentExtractorFactory`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/document_extractors.py#L99)

---

### 3. ⛓️ Chain of Responsibility Pattern (Behavioral)

#### Intent
Chain receiving objects together and pass the request until an object handles it.

#### Code Reference
```python
class AIProviderChain:
    def execute(self, method_name: str, *args: Any, **kwargs: Any) -> Any:
        for provider in self.providers:
            try:
                return getattr(provider, method_name)(*args, **kwargs)
            except Exception as e:
                logger.warning(f"Provider {provider.name} failed: {e}. Trying next provider...")
        return getattr(MockProvider(), method_name)(*args, **kwargs)
```

#### Code Location
- [`AIProviderChain`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_providers/provider_factory.py#L13)

---

### 4. 🛡️ Decorator Pattern (Structural)

#### Intent
Attach additional responsibilities (such as retries and backoff logic) to a function dynamically.

#### Code Reference
```python
def with_retry_and_backoff(max_retries: int = 3, initial_delay: float = 1.0, backoff_factor: float = 2.0):
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            delay = initial_delay
            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt < max_retries:
                        time.sleep(delay)
                        delay *= backoff_factor
            raise last_exception
        return wrapper
    return decorator
```

#### Code Location
- [`resilience.py`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_providers/resilience.py)

---

### 5. 🗄️ Repository & Interface Parity Pattern (Architectural)

#### Intent
Separate logic from storage drivers and guarantee 100% behavioral parity between test and production stores.

#### Code Locations
- Interface: [`IDataStore`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/db/base.py#L14)
- Mongo Store: [`MongoDataStore`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/db/base.py#L96)
- In-Memory Store: [`InMemoryDataStore`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/db/init_db.py#L10)

---

### 6. 📐 Template Method Pattern (Behavioral)

#### Intent
Define the skeleton step pipeline of an algorithm in a base class, letting subclasses override specific steps.

#### Code Reference
$$\text{validate()} \longrightarrow \text{extract\_raw\_content()} \longrightarrow \text{clean\_text()} \longrightarrow \text{build\_metadata()}$$

#### Code Location
- [`DocumentExtractorTemplate`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/document_extractors.py#L15)

---

### 7. 🔨 Builder Pattern (Creational)

#### Intent
Construct complex objects step-by-step with clean method chaining.

#### Code Reference
```python
exam_data = (
    ExamBuilder(user_id=user_id, topic=topic)
    .set_difficulty(difficulty)
    .set_language(language)
    .set_questions(questions)
    .build()
)
```

#### Code Location
- [`ExamBuilder`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/exam_service.py#L15)

---

### 8. 💉 Dependency Injection (DI) Pattern (Architectural)

#### Intent
Injects dependencies into route handlers via FastAPI `Depends(...)` for loose coupling.

#### Code Location
- [`app/api/deps.py`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/api/deps.py)

---

### 9. 🏛️ Facade Pattern (Structural)

#### Intent
Simplifies complex multi-subsystem operations behind single-entry point services.

#### Code Locations
- Backend: [`AIService`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_service.py)
- Frontend: [`apiService.js`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/frontend/src/services/apiService.js)

---

### 10. 🔌 Adapter Pattern (Structural)

#### Intent
Converts raw backend JSON data into uniform UI models expected by React views.

#### Code Location
- [`apiService.js`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/frontend/src/services/apiService.js#L2-L30) (`adaptExamData`, `adaptDocumentData`)

---

### 11. ⚛️ Custom Hooks Pattern (Frontend)

#### Intent
Encapsulates React state, side-effects, and API calls away from UI rendering.

#### Code Locations
- [`useChatSession.js`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/frontend/src/hooks/useChatSession.js)
- [`useExamSession.js`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/frontend/src/hooks/useExamSession.js)
- [`useDocumentManager.js`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/frontend/src/hooks/useDocumentManager.js)

---

### 12. 🔒 Singleton & Cached State Pattern (Creational)

#### Intent
Ensures a class has only one instance and provides global access.

#### Code Locations
- Database Connection: [`Database.connect_db()`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/database.py)
- Settings Caching: `@lru_cache()` on [`get_settings()`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/core/config.py)
