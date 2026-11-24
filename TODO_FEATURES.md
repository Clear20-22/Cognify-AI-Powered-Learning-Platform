# ✅ Cognify-AI — Master TODO (Everything to Add)

> One consolidated checklist of everything that needs to be **added / fixed**,
> pulled from: the Feasibility Report, the Functional/Non-Functional Requirement
> Report, and the README verification.
> IDs (FR-/NFR-) reference the requirements document.
>
> **For:** SimpleBrains team · **Date:** 2026-11-24
> Priority: 🔴 Must · 🟡 Should · 🟢 Could

---

## 🔴 MUST — core missing pillars (do these first)

### 1. User Roles + RBAC
- [x] Add `role` field (Student / Teacher / Admin) to signup `FR-AUTH-01`
- [x] Enforce password policy: min 8 chars, upper + lower + digit `FR-AUTH-03`
- [x] Role-based access control — restrict endpoints/pages per role, 403 on forbidden `FR-AUTH-07` *(backend `require_role()` + frontend `hasRole()`)*

### 2. Course Management (new module)
- [ ] Teacher creates course (title, code, description) `FR-CRS-01`
- [ ] Teacher edits/deletes own courses only (403 otherwise) `FR-CRS-02`
- [ ] Upload lecture materials (PDF/PPTX) to a course `FR-CRS-03`
- [ ] Student browses + enrolls in courses `FR-CRS-04`
- [ ] Access materials/quizzes only for enrolled courses `FR-CRS-05`
- [ ] Search courses by title/code `FR-CRS-07`

### 3. Assignment Management (new module)
- [ ] Teacher creates assignment (title, desc, deadline, max marks, files) `FR-ASG-01`
- [ ] Student sees assignments w/ status Pending/Submitted/Graded `FR-ASG-02`
- [ ] Student submits text/file (≤ 20 MB) `FR-ASG-03`
- [ ] Teacher reviews submissions, assigns marks + feedback `FR-ASG-06`
- [ ] Reject marks < 0 or > max `FR-ASG-07`
- [ ] Show marks + feedback to student `FR-ASG-08`

### 4. Teacher-authored Timed Quizzes
- [ ] Teacher creates quiz for a course (MCQ, 2–6 options, 1 correct) `FR-QZ-01`
- [ ] Topic tag + difficulty per question `FR-QZ-02`
- [ ] Publish with start/end time window `FR-QZ-03`
- [ ] **Countdown timer + auto-submit on expiry** `FR-QZ-04`
- [ ] Topic-wise performance per attempt `FR-QZ-09`

### 5. Teacher Dashboard
- [ ] Teacher dashboard: course/assignment/quiz/student mgmt + analytics `FR-TDSH-01`
- [ ] Show only logged-in teacher's own data `FR-TDSH-03`

### 6. Deeper Performance Analytics
- [ ] Topic-wise accuracy (% correct per topic) `FR-ANL-03`
- [ ] Weak areas = topics < 60% accuracy with ≥ 5 answers `FR-ANL-04`
- [ ] Teacher: class avg/high/low/#submissions per quiz `FR-ANL-06`

### 7. README fixes
- [x] Update model names: `Llama-3.3-70b` → `openai/gpt-oss-120b`, `gemini-2.0-flash-exp` → `gemini-3.8-flash` (README lines 59, 196) *(README now points to `AI_MODEL_*` in config.py)*
- [x] Add missing components to structure tree: Avatar, History, Layout, Sidebar, StudyPatterns
- [x] Fix setup docs: `.env.example` and `docker-compose.yml` used `MONGODB_URL` (code reads `MONGODB_URI`); template keys crashed startup; added `.dockerignore` so `.env` is never baked into images

---

## 🟡 SHOULD — important, after the core

### Auth / Admin
- [x] Admin: view all users, deactivate/reactivate accounts `FR-AUTH-09` *(Admin page `/admin`, admins only; also change roles)*
- [x] User: update profile name + change password (with current password) `FR-AUTH-10` *(Profile page `/profile`)*
- [x] Logout fully clears token + redirects `FR-AUTH-08` *(already worked: `signOut` clears token and user, protected routes redirect; checked in code, not click-tested)*

### Quiz
- [ ] Randomize question/option order `FR-QZ-05`
- [ ] Max attempts per student (default 1) `FR-QZ-07`
- [ ] Reuse questions from a course question bank `FR-QZ-11`

### AI Assistant guards
- [ ] Visible "AI may be inaccurate — verify" disclaimer `FR-AI-07`
- [ ] 30s timeout → clear error, keep input, allow retry `FR-AI-09`
- [ ] Rate-limit AI requests (default 30/hour) `FR-AI-10`
- [ ] Save an AI response as a note `FR-AI-06`
- [ ] Teacher reviews/edits AI-generated questions before publishing `FR-AI-05`

### Document Assistant
- [ ] Generate important-topics list (separate from summary) `FR-DOC-05`
- [ ] Ask questions about a document (doc-grounded Q&A) `FR-DOC-07`
- [ ] Mark upload Failed when no extractable text (scanned PDF) `FR-DOC-03`
- [ ] Revision notes → save into Notes `FR-DOC-08`

### Notes
- [x] Associate note with course/topic + filter `FR-NOTE-02` *(topic in UI; `course_id` in API, course picker once the course module exists)*
- [x] Keyword search of notes `FR-NOTE-03`
- [x] Notes visible only to their owner `FR-NOTE-04` *(was missing: notes endpoints had no authentication)*

### Student Dashboard
- [ ] Show enrolled courses, pending assignments, upcoming quizzes `FR-SDSH-01`
- [ ] Order pending assignments by nearest deadline `FR-SDSH-02`

### Course (extra)
- [ ] Teacher views/removes enrolled students `FR-CRS-06`

### Non-functional
- [x] Login lockout after 5 failed attempts / 10 min `NFR-SEC-07`
- [ ] Reject NoSQL/Mongo operator injection (keys starting with `$`) `NFR-SEC-04` *(helper `reject_mongo_operators()` done + applied to user schemas; other modules should apply it to their free-form dict fields)*
- [ ] Escape user content (notes/chat) against XSS `NFR-SEC-09`
- [ ] Send only needed text to AI (never passwords/tokens/email) `NFR-PRIV-02`
- [ ] Automated tests ≥ 60% of auth/grading/analytics `NFR-MAIN-04`

---

## 🟢 COULD — nice to have / advanced

### Real-Time Live Quiz (WebSockets)
- [x] Teacher creates live session + 6-char room code `FR-RT-01`
- [x] Students join by room code `FR-RT-02`
- [x] Teacher advances questions, pushed < 1s to all `FR-RT-03` (verified locally)
- [x] One answer per student per question `FR-RT-04`
- [x] Live leaderboard updates < 1s `FR-RT-05` (verified locally)
- [x] Reconnect with same room code, keep score `FR-RT-06`
- [ ] Real-time notifications (new quiz/assignment/marks) `FR-RT-07`

  Masum's authenticated private stream, replay and global notification panel are
  implemented. Quiz/assignment owners must publish authorized events through
  `get_live_service(request).notifications.publish(...)` when those modules ship;
  see `backend/app/realtime/README.md`. Subsecond delivery depends on the deployed network.

### Other
- [ ] Export course results as CSV `FR-ANL-08`
- [ ] Teacher: topics with class accuracy < 50% `FR-ANL-07`
- [ ] Student un-enroll (results retained) `FR-CRS-08`
- [ ] Accessibility: Lighthouse ≥ 80, keyboard nav, 4.5:1 contrast `NFR-ACC-01..03`

---

## ⚠️ Decisions the team must make (not just build)

- [ ] **Upload size:** proposal says 20 MB (`FR-DOC-01`), code enforces 50 MB → pick one
- [ ] **Languages:** README claimed 5 (English, Bengali, Hindi, Spanish, German); app has 2 (English, Bangla) → either build the other 3 or keep README honest *(already corrected in README)*
- [ ] **Scope realism:** proposal itself says implement incrementally (Must → Should → Could). Confirm which modules are in-scope for this semester vs future.

---

### Suggested build order
**Roles/RBAC → Courses → Assignments → Teacher-authored quizzes → Teacher dashboard → deeper analytics → AI/Doc/Notes polish → (optional) real-time live quiz.**

Each arrow depends on the previous one existing first.
