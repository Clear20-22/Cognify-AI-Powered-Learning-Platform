# 🏛️ Cognify AI — Design Patterns & Architecture Reference

This directory contains the complete architectural documentation for the design patterns implemented in the Cognify AI Learning Platform.

---

## 📌 Design Pattern Quick Reference

```
                   ┌─────────────────────────────────────────┐
                   │               AIService                 │ (Facade)
                   └────────────────────┬────────────────────┘
                                        │
                                        ▼
                           ┌────────────────────────┐
                           │   AIProviderFactory    │ (Factory Method)
                           └────────────┬───────────┘
                                        │
                                        ▼
                           ┌────────────────────────┐
                           │    AIProviderChain     │ (Chain of Responsibility)
                           └────────────┬───────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
   ┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
   │   GroqProvider    │      │  GeminiProvider   │      │   MockProvider    │ (Strategy Pattern)
   └─────────┬─────────┘      └─────────┬─────────┘      └───────────────────┘
             │                          │
             └─────────────┬────────────┘
                           ▼
             ┌──────────────────────────┐
             │ @with_retry_and_backoff  │ (Decorator Pattern)
             └──────────────────────────┘
```

---

## 1. 🎯 Strategy Pattern

- **Category**: Behavioral Pattern
- **Definition**: Defines a family of algorithms, encapsulates each one, and makes them interchangeable at runtime.
- **Where It Is Implemented**:
  - **AI Models**: Interface [`BaseAIProvider`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_providers/base_provider.py) implemented by:
    - [`GroqProvider`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_providers/groq_provider.py) (`llama-3.3-70b-versatile`)
    - [`GeminiProvider`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_providers/gemini_provider.py) (`gemini-2.0-flash-exp`)
    - [`MockProvider`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_providers/mock_provider.py) (Offline Demo Engine)
  - **Document Extractors**: Interface [`DocumentExtractorTemplate`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/document_extractors.py#L15) implemented by:
    - [`PDFExtractorStrategy`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/document_extractors.py#L65)
    - [`PPTXExtractorStrategy`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/document_extractors.py#L82)
- **Code Reference**:
  ```python
  class BaseAIProvider(ABC):
      @abstractmethod
      def generate_response(self, prompt: str, context: Optional[str] = None) -> str: ...
  ```
- **Why It Is Used**: Decouples high-level learning services from specific LLM vendors or file format parsers. Adding support for new models (e.g. OpenAI GPT-4o, Anthropic Claude, or local Ollama) or new document types (e.g. `.docx`, `.epub`) requires adding a single strategy class without touching existing caller code.

---

## 2. 🏭 Factory Method Pattern

- **Category**: Creational Pattern
- **Definition**: Provides an interface for creating objects, delegating instantiation logic to factory classes.
- **Where It Is Implemented**:
  - [`AIProviderFactory.create_chain()`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_providers/provider_factory.py#L42-L60)
  - [`DocumentExtractorFactory.get_extractor(file_path)`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/document_extractors.py#L99-L113)
- **Code Reference**:
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
- **Why It Is Used**: Eliminates scattered `if/elif` instantiation code across service layers. It inspects environment variables and file extensions to return fully configured strategy objects.

---

## 3. ⛓️ Chain of Responsibility Pattern

- **Category**: Behavioral Pattern
- **Definition**: Avoids coupling the sender of a request to its receiver by giving more than one object a chance to handle the request in sequential order.
- **Where It Is Implemented**:
  - [`AIProviderChain`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_providers/provider_factory.py#L13-L40)
- **Code Reference**:
  ```python
  class AIProviderChain:
      def execute(self, method_name: str, *args: Any, **kwargs: Any) -> Any:
          for provider in self.providers:
              try:
                  method = getattr(provider, method_name)
                  return method(*args, **kwargs)
              except Exception as e:
                  logger.warning(f"Provider {provider.name} failed: {e}. Trying next provider...")
          return getattr(MockProvider(), method_name)(*args, **kwargs)
  ```
- **Why It Is Used**: Solves external LLM vulnerability (quota limits, 429 rate limits, service degradation). The request flows down `Groq` $\rightarrow$ `Gemini` $\rightarrow$ `Mock`. If Groq fails, Gemini takes over automatically with zero user impact.

---

## 4. 🛡️ Decorator Pattern

- **Category**: Structural Pattern
- **Definition**: Dynamically attaches additional responsibilities or behaviors to functions or objects without modifying their implementation.
- **Where It Is Implemented**:
  - [`@with_retry_and_backoff`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_providers/resilience.py#L11-L36) attached to `GroqProvider` and `GeminiProvider` methods.
- **Code Reference**:
  ```python
  @with_retry_and_backoff(max_retries=2, initial_delay=0.5)
  def generate_response(self, prompt: str, context: Optional[str] = None) -> str:
      ...
  ```
- **Why It Is Used**: Separates network resilience (exponential backoff, retries) from AI prompt logic. Any network method can be decorated to gain retry capabilities without duplicating retry loops.

---

## 5. 🗄️ Repository & Parity Interface Pattern

- **Category**: Architectural Pattern
- **Definition**: Abstracts data persistence operations behind a single domain interface.
- **Where It Is Implemented**:
  - Interface Contract: [`IDataStore`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/db/base.py#L14-L62)
  - Production Store: [`MongoDataStore`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/db/base.py#L96-L157)
  - In-Memory Store: [`InMemoryDataStore`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/db/init_db.py#L10-L135)
- **Why It Is Used**: Completely isolates business services from database drivers. If MongoDB is absent, the backend boots up into `InMemoryDataStore` with 100% method signature and feature parity.

---

## 6. 📐 Template Method Pattern

- **Category**: Behavioral Pattern
- **Definition**: Defines the skeleton of an algorithm in a base class, allowing subclasses to override specific steps without modifying the overarching flow.
- **Where It Is Implemented**:
  - [`DocumentExtractorTemplate`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/document_extractors.py#L15-L63)
- **Code Reference**:
  ```python
  class DocumentExtractorTemplate(ABC):
      def process(self, file_path: str) -> Dict[str, Any]:
          self.validate(file_path)
          raw_text, count = self.extract_raw_content(file_path)
          cleaned_text = self.clean_text(raw_text)
          metadata = self.build_metadata(file_path, count, cleaned_text)
          return {"success": True, "text": cleaned_text, **metadata}
  ```
- **Why It Is Used**: Guarantees that every document type follows the exact same 4-step pipeline execution:
  $$\text{validate()} \longrightarrow \text{extract\_raw\_content()} \longrightarrow \text{clean\_text()} \longrightarrow \text{build\_metadata()}$$

---

## 7. 🔨 Builder Pattern

- **Category**: Creational Pattern
- **Definition**: Separates the step-by-step construction of a complex object from its representation.
- **Where It Is Implemented**:
  - [`ExamBuilder`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/exam_service.py#L15-L52)
- **Code Reference**:
  ```python
  exam_data = (
      ExamBuilder(user_id=user_id, topic=topic)
      .set_difficulty(difficulty)
      .set_language(language)
      .set_questions(questions)
      .build()
  )
  ```
- **Why It Is Used**: Replaces telescoping constructors or giant dictionaries with clear method chaining for adaptive exam models.

---

## 8. 💉 Dependency Injection (DI) Pattern

- **Category**: Architectural Pattern
- **Definition**: Supplies dependencies to a class or route handler rather than letting the handler instantiate them directly.
- **Where It Is Implemented**:
  - [`app/api/deps.py`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/api/deps.py) using FastAPI `Depends(...)`.
- **Why It Is Used**: Injects singletons (`data_store`, `ai_service`) into route controllers, allowing easy mocking during unit testing.

---

## 9. 🏛️ Facade Pattern

- **Category**: Structural Pattern
- **Definition**: Provides a simplified interface to a complex system of classes, library, or framework.
- **Where It Is Implemented**:
  - Backend: [`AIService`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/services/ai_service.py) hides provider factory, chain execution, and parsing logic.
  - Frontend: [`apiService.js`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/frontend/src/services/apiService.js) hides HTTP fetch calls, REST endpoints, and JWT bearer headers.
- **Why It Is Used**: Gives client code a clean, single point of interaction without needing knowledge of underlying HTTP or LLM provider mechanics.

---

## 10. 🔌 Adapter Pattern (Frontend DTO)

- **Category**: Structural Pattern
- **Definition**: Converts the interface of a service into another interface that clients expect.
- **Where It Is Implemented**:
  - [`adaptExamData`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/frontend/src/services/apiService.js#L2) and [`adaptDocumentData`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/frontend/src/services/apiService.js#L22).
- **Why It Is Used**: Adapts backend JSON representations (handling MongoDB `_id` vs `id`, missing keys) into predictable object shapes for React UI views.

---

## 11. ⚛️ Custom Hooks Pattern (Frontend)

- **Category**: Frontend Behavioral Pattern
- **Definition**: Extracts state management, API calls, and lifecycle side-effects into reusable hook functions.
- **Where It Is Implemented**:
  - [`useChatSession.js`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/frontend/src/hooks/useChatSession.js)
  - [`useExamSession.js`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/frontend/src/hooks/useExamSession.js)
  - [`useDocumentManager.js`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/frontend/src/hooks/useDocumentManager.js)
- **Why It Is Used**: Keeps React page components (e.g. `ChatPage.jsx`, `PracticeTest.jsx`) lightweight and focused purely on rendering JSX.

---

## 12. 🔒 Singleton & Cached State Pattern

- **Category**: Creational Pattern
- **Definition**: Restricts instantiation of a class to one single instance across the entire runtime.
- **Where It Is Implemented**:
  - Async MongoDB Client: [`Database.connect_db()`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/database.py)
  - Config Caching: `@lru_cache()` on [`get_settings()`](file:///Users/jubayerahmedsojib/Documents/GitHub/Cognify-AI-Powered-Learning-Platform/backend/app/core/config.py)
- **Why It Is Used**: Reuses database socket connections and avoids re-reading environment files on every API request.
