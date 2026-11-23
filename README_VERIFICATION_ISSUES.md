# 📋 README vs Codebase — Verification Issues

> **Purpose:** README-তে claim করা features গুলো actual code-এর সাথে মিলিয়ে দেখা হয়েছে।
> এই issue গুলো team-এর সাথে আলোচনা করে ঠিক করতে হবে।
>
> **Verified on:** 2026-11-23
> **Verified by:** Md-Akram-Khan

---

## ❌ Issue 1 — Language support overclaim (HIGH priority)

**README claim** ([README.md line 23](README.md#L23)):
> "...in multiple languages (**English, Bengali, Hindi, Spanish, German**)."

**Actual code** ([frontend/src/components/PracticeTest.jsx:75-78](frontend/src/components/PracticeTest.jsx#L75-L78)):
```js
const languages = [
  "English",
  "Bangla",
  // More languages will be added soon...
];
```

**Problem:**
- Frontend UI-তে user শুধু **English** আর **Bangla** select করতে পারে।
- **Hindi, Spanish, German** কোথাও নেই।
- Backend (`exam_service.py`) language-কে free-text string হিসেবে নেয় (default `"English"`), তাই technically যেকোনো language পাঠানো সম্ভব — কিন্তু UI-তে option নেই।

**Decision needed:**
- [ ] README ঠিক করে actual (English, Bangla) লিখব? **অথবা**
- [ ] বাকি ৩টা language (Hindi, Spanish, German) actually implement করব?

---

## ⚠️ Issue 2 — Model names outdated in README (MEDIUM priority)

**README claim** ([README.md line 59 & 196](README.md#L59)):
> "Groq **Llama-3.3-70b-versatile** LLM provider strategy"

**Actual code** (updated 2026-10-29, [backend/app/core/config.py:50-51](backend/app/core/config.py#L50-L51)):
```python
AI_MODEL_GROQ: str = "openai/gpt-oss-120b"
AI_MODEL_GEMINI: str = "gemini-3.8-flash"
```

**Problem:**
- পুরনো model গুলো (`llama-3.3-70b-versatile`, `gemini-2.0-flash-exp`) retired হয়ে গেছে — API থেকে `model_not_found` / `no longer available` return করছিল।
- কাজ করা model-এ update করা হয়েছে, কিন্তু README + কিছু docstring এখনও পুরনো নাম দেখাচ্ছে।

**Files with stale model names:**
- [README.md:59](README.md#L59), [README.md:196](README.md#L196)
- [backend/app/services/ai_providers/groq_provider.py:15](backend/app/services/ai_providers/groq_provider.py#L15) (docstring only)
- [backend/app/services/ai_providers/gemini_provider.py:16](backend/app/services/ai_providers/gemini_provider.py#L16) (docstring only)

**Decision needed:**
- [ ] README + docstring গুলো নতুন model নামে update করব?

---

## ⚠️ Issue 3 — Project structure doc incomplete (LOW priority)

**README-র project structure section** ([README.md](README.md#L74))-এ এই ৫টা frontend component list করা হয়নি, যদিও এগুলো আসলে আছে:

| Missing from README | Actual file |
|---|---|
| Avatar | `frontend/src/components/Avatar.jsx` |
| History | `frontend/src/components/History.jsx` |
| Layout | `frontend/src/components/Layout.jsx` |
| Sidebar | `frontend/src/components/Sidebar.jsx` |
| StudyPatterns | `frontend/src/components/StudyPatterns.jsx` |

**Decision needed:**
- [ ] README-র structure tree update করব?

---

## ✅ যা যা ঠিক আছে (reference — no action needed)

এই features গুলো README-র সাথে হুবহু মিলছে, verified:

- AI Tutoring — Groq → Gemini → Mock failover chain (`provider_factory.py:19`)
- In-memory DB fallback (`InMemoryDataStore`)
- Exam generation + `ExamBuilder` pattern
- PDF/PPTX extraction (`pdfplumber` + `python-pptx`)
- Performance analytics (`Performance.jsx`)
- OWASP security headers — ৪টাই আছে (`main.py:143-147`)
- Path traversal defense — `Path(file.filename).name` (`document_service.py:56`)
- Upload limits — `.pdf`/`.pptx`, max 50MB, enforced (`document_service.py:23-24`)
- bcrypt + JWT auth (`security.py`)

---

## 📌 Summary for team discussion

| # | Issue | Priority | Type |
|---|---|---|---|
| 1 | Language: README বলে ৫টা, আছে ২টা (English, Bangla) | 🔴 HIGH | Feature gap / overclaim |
| 2 | Model names README-তে outdated (Llama-3.3 → gpt-oss-120b) | 🟡 MEDIUM | Doc stale |
| 3 | ৫টা component README structure-এ missing | 🟢 LOW | Doc incomplete |

> **Note:** কোনোটাই runtime bug না — সব documentation accuracy / feature-scope-এর ব্যাপার।
> Team আলোচনার পর ঠিক করবে: README কমানো হবে, নাকি missing features build করা হবে।
