# 📋 Cognify-AI — Features Proposed but NOT Yet Built

> **What this is:** A gap analysis comparing the two approved lab documents
> — *Feasibility Test Report* (1 Oct 2026) and *Functional & Non-Functional
> Requirement Report* (13 Oct 2026) — against the **current codebase + README**.
>
> It lists every proposed feature that is **missing** or **only partially built**,
> using the requirement IDs (FR-/NFR-) from the requirements report so the team
> can map directly back to the spec.
>
> **Prepared for:** SimpleBrains team discussion · **Date:** 2026-11-24

**Legend:** ❌ = not built at all · ⚠️ = partially built, sub-features missing

---

## ✅ First, what we HAVE already built (for context)

So the gaps below are clear, the current project already implements:
- Email/password signup + signin, JWT auth, bcrypt hashing
- AI tutoring chat + **persistent chat sessions & history** (Groq → Gemini → Mock failover)
- **Self-practice exams** (create, submit, auto-score, history, delete) in English & Bangla
- **Document upload** (PDF/PPTX) → text extraction → summary / notes / quiz generation
- Document-based quiz submit + scoring
- Study notes CRUD
- Performance analytics (basic accuracy/score charts) + Study Patterns / streaks
- OWASP security headers, path-traversal defense, upload limits, OpenAPI `/docs`

Everything below is what the **proposal promised but the code does not have yet.**

---

# PART A — Entire modules that are completely missing (❌)

These are the biggest new features. None of them exist in the codebase at all.

## A1. User Roles & Role-Based Access Control — `FR-AUTH` ❌

**Proposal says:** Three user classes — **Student, Teacher, Administrator** — with
role-based access control (RBAC).

**Current reality:** Signup only takes `email`, `password`, `fullName`
([auth.py](backend/app/schemas/auth.py#L8)). **There is no role field and no concept
of Teacher or Admin.** Everyone is effectively one type of user.

| ID | Proposed feature | Status |
|---|---|---|
| FR-AUTH-01 | Register **with a role** (Student / Teacher) | ❌ no role field |
| FR-AUTH-03 | Password policy: min 8 chars, upper + lower + digit | ❌ only `min_length=6`, no complexity |
| FR-AUTH-07 | **RBAC** — restrict endpoints/pages per role, 403 on forbidden | ❌ none |
| FR-AUTH-09 | **Admin** can view all users, deactivate/reactivate accounts | ❌ no admin |
| FR-AUTH-10 | User can update profile name + change password (with current password) | ❌ |

> This is foundational — Course/Assignment/Teacher-Dashboard features all depend on roles existing first.

## A2. Course Management — `FR-CRS` ❌

**Proposal says:** Teachers create courses (title, code, description), upload lecture
materials to a course, manage enrolled students. Students browse, search, enroll,
and unenroll from courses.

**Current reality:** **No course concept anywhere** — no `course` model, endpoint, or UI.

| ID | Proposed feature | Status |
|---|---|---|
| FR-CRS-01 | Teacher creates a course (title, code, description) | ❌ |
| FR-CRS-02 | Teacher edits/deletes **only own** courses (403 otherwise) | ❌ |
| FR-CRS-03 | Upload lecture materials (PDF/PPTX) **to a course** | ❌ |
| FR-CRS-04 | Student browses & **enrolls** in a course | ❌ |
| FR-CRS-05 | Students access materials/quizzes **only of enrolled courses** | ❌ |
| FR-CRS-06 | Teacher views/removes enrolled students | ❌ |
| FR-CRS-07 | Search courses by title / code | ❌ |
| FR-CRS-08 | Student un-enrolls (results retained) | ❌ |

## A3. Assignment Management — `FR-ASG` ❌

**Proposal says:** Full assignment workflow — teacher creates, student submits
(text/file), deadlines, late submission, resubmission, grading + feedback.

**Current reality:** **No assignment feature at all.**

| ID | Proposed feature | Status |
|---|---|---|
| FR-ASG-01 | Teacher creates assignment (title, desc, deadline, max marks, files) | ❌ |
| FR-ASG-02 | Student sees assignments w/ status (Pending/Submitted/Graded) | ❌ |
| FR-ASG-03 | Student submits text/file (≤ 20 MB) | ❌ |
| FR-ASG-04 | Reject late submissions (unless teacher allows late) | ❌ |
| FR-ASG-05 | Resubmit before deadline (latest replaces) | ❌ |
| FR-ASG-06 | Teacher views submissions, assigns marks + feedback | ❌ |
| FR-ASG-07 | Reject marks < 0 or > max | ❌ |
| FR-ASG-08 | Show marks + feedback to student | ❌ |

## A4. Teacher Dashboard — `FR-TDSH` ❌

**Proposal says:** A separate teacher interface for course/assignment/quiz
management, submission review, result management, class analytics, and a
"submissions awaiting review" counter.

**Current reality:** Only a single (student-style) Dashboard exists. **No teacher view.**

| ID | Proposed feature | Status |
|---|---|---|
| FR-TDSH-01 | Teacher dashboard (course/assignment/quiz/student mgmt, analytics) | ❌ |
| FR-TDSH-02 | "Submissions awaiting review" count per assignment | ❌ |
| FR-TDSH-03 | Teacher sees **only own courses' data** | ❌ |

## A5. Real-Time / Live Quiz Features — `FR-RT` ❌ (WebSockets)

**Proposal says:** WebSocket-based **live classroom quiz** — teacher creates a
session with a 6-char room code, students join, questions pushed in real time,
live leaderboard, reconnect support, and real-time notifications.

**Current reality:** **No WebSocket code at all** — it's listed only as a "future idea"
in `backend/START_HERE.md`. The whole app is REST-only.

| ID | Proposed feature | Status |
|---|---|---|
| FR-RT-01 | Teacher creates live session + 6-char room code | ❌ |
| FR-RT-02 | Students join by room code | ❌ |
| FR-RT-03 | Teacher advances questions, pushed < 1s to all | ❌ |
| FR-RT-04 | One answer per student per question | ❌ |
| FR-RT-05 | Live leaderboard updates < 1s | ❌ |
| FR-RT-06 | Reconnect with same room code, keep score | ❌ |
| FR-RT-07 | Real-time notifications (new quiz/assignment/marks) | ❌ |

---

# PART B — Partially built modules (⚠️ sub-features missing)

The module exists, but these specific proposed capabilities are not there.

## B1. Online Quiz / Examination System — `FR-QZ` ⚠️

**Have:** self-practice exams, auto-scoring, show answers, quiz history.
**Missing** the "teacher-authored, timed, published quiz" half:

| ID | Proposed feature | Status |
|---|---|---|
| FR-QZ-01 | **Teacher** creates a quiz for a course (MCQ, 2–6 options, 1 correct) | ❌ |
| FR-QZ-02 | Each question has a **topic tag + difficulty** (Easy/Med/Hard) | ❌ |
| FR-QZ-03 | Publish quiz with **start/end time window** | ❌ |
| FR-QZ-04 | **Countdown timer + auto-submit** on expiry | ❌ (no quiz timer in PracticeTest) |
| FR-QZ-05 | Randomize question/option order | ❌ |
| FR-QZ-07 | Max attempts per student (default 1) | ❌ |
| FR-QZ-09 | **Topic-wise performance** per attempt | ❌ |
| FR-QZ-11 | Reuse questions from a course **question bank** | ❌ |
| FR-QZ-12 | Self-practice quiz by topic/difficulty | ✅ (have) |

## B2. Performance Analytics — `FR-ANL` ⚠️

**Have:** basic accuracy/score charts.
**Missing** the deeper, topic- and course-level analytics:

| ID | Proposed feature | Status |
|---|---|---|
| FR-ANL-01 | Scores **grouped by course** | ❌ (no courses) |
| FR-ANL-03 | **Topic-wise accuracy** (% correct per topic) | ❌ |
| FR-ANL-04 | **Weak areas** = topics < 60% accuracy with ≥ 5 answers | ❌ |
| FR-ANL-06 | Teacher: class avg / high / low / #submissions per quiz | ❌ |
| FR-ANL-07 | Teacher: topics with class accuracy < 50% | ❌ |
| FR-ANL-08 | Export course results as **CSV** | ❌ |

## B3. AI Academic Assistant — `FR-AI` ⚠️

**Have:** chat, session history, AI quiz generation, provider abstraction/failover.
**Missing** the quality/safety guards and a couple of conveniences:

| ID | Proposed feature | Status |
|---|---|---|
| FR-AI-05 | Teacher reviews/edits AI-generated questions before publishing | ❌ |
| FR-AI-06 | Save an AI response **as a note** | ❌ (chat & notes not linked) |
| FR-AI-07 | Visible **"AI may be inaccurate" disclaimer** | ❌ not found |
| FR-AI-09 | 30s timeout → clear error, keep input, allow retry | ❌ no explicit handling |
| FR-AI-10 | **Rate limit** AI requests (default 30/hour) | ❌ |

## B4. PDF / PowerPoint Document Assistant — `FR-DOC` ⚠️

**Have:** upload, extract, summarize, generate notes, generate quiz, list/delete.
**Missing:**

| ID | Proposed feature | Status |
|---|---|---|
| FR-DOC-03 | Mark upload **Failed** when no extractable text (scanned PDF) | ⚠️ verify |
| FR-DOC-05 | Generate **important-topics list** (separate from summary) | ❌ |
| FR-DOC-07 | **Ask questions about a document** (doc-grounded Q&A) | ❌ |
| FR-DOC-08 | Generate **revision notes → save into Notes** | ⚠️ generate yes, save-link unclear |

> ⚠️ **Spec mismatch to decide:** Proposal (FR-DOC-01) says max upload **20 MB**;
> the code enforces **50 MB** ([document_service.py](backend/app/services/document_service.py#L24)).
> Align one or the other.

## B5. Study Notes — `FR-NOTE` ⚠️

**Have:** create/view/edit/delete, owner-only.
**Missing:**

| ID | Proposed feature | Status |
|---|---|---|
| FR-NOTE-02 | Associate a note with a **course/topic** + filter by it | ❌ |
| FR-NOTE-03 | **Keyword search** of notes | ❌ |

## B6. Student Dashboard — `FR-SDSH` ⚠️

**Have:** a dashboard with quick actions.
**Missing** the course-centric widgets the proposal lists:

| ID | Proposed feature | Status |
|---|---|---|
| FR-SDSH-01 | Show **enrolled courses, pending assignments, upcoming quizzes** | ❌ (depend on CRS/ASG) |
| FR-SDSH-02 | Pending assignments ordered by nearest deadline | ❌ |

---

# PART C — Non-Functional requirements worth flagging (NFR)

Not "features" exactly, but promised in the spec and not yet in place:

| ID | Requirement | Status |
|---|---|---|
| NFR-SEC-04 | Reject **NoSQL/Mongo operator injection** (keys starting with `$`) | ❌ verify |
| NFR-SEC-07 | **Login lockout** after 5 failed attempts / 10 min | ❌ |
| NFR-SEC-09 | Escape user content (notes/chat) to prevent **XSS** | ⚠️ verify |
| NFR-PRIV-02 | Send **only needed text** to AI (never passwords/tokens/email) | ⚠️ verify |
| NFR-MAIN-04 | Automated tests cover ≥ 60% of auth/grading/analytics | ⚠️ partial |
| NFR-AIQ-01..04 | AI output quality thresholds (parse rate, summary/answer accuracy, long-doc handling) | ⚠️ not measured |

**Already satisfied** (good): OpenAPI docs (NFR-MAIN-02 ✅), CORS restricted to frontend
origin (NFR-SEC-08 ✅), secrets in `.env` not in repo (NFR-SEC-06 ✅ — after our key cleanup),
layered backend architecture (NFR-MAIN-01 ✅).

---

# 📌 Summary — priority order for the team

Using the proposal's own **MoSCoW** priorities:

| Priority | Missing module / feature | Proposal IDs |
|---|---|---|
| 🔴 **Must** | **User roles + RBAC** (Student/Teacher/Admin) | FR-AUTH-01/03/07 |
| 🔴 **Must** | **Course Management** | FR-CRS-01..05 |
| 🔴 **Must** | **Assignment Management** | FR-ASG-01..08 |
| 🔴 **Must** | **Teacher-authored timed quizzes** (timer, publish window) | FR-QZ-01..04 |
| 🔴 **Must** | **Teacher Dashboard** | FR-TDSH-01/03 |
| 🔴 **Must** | Topic-wise accuracy + **weak-area** analytics | FR-ANL-03/04 |
| 🟡 **Should** | Admin user mgmt, profile/password update | FR-AUTH-09/10 |
| 🟡 **Should** | AI guards: disclaimer, timeout, rate-limit | FR-AI-07/09/10 |
| 🟡 **Should** | Document Q&A + topic list | FR-DOC-05/07 |
| 🟡 **Should** | Notes: course-tag + search | FR-NOTE-02/03 |
| 🟢 **Could** | **Real-time live quiz** (WebSockets, leaderboard) | FR-RT-01..07 |
| 🟢 **Could** | CSV export, login lockout, accessibility targets | FR-ANL-08, NFR-SEC-07, NFR-ACC |

### One-line takeaway
The current project is a strong **solo-student AI study tool**, but the proposal
describes a **two-sided (student + teacher) course platform**. The biggest missing
pillars are **roles/RBAC → courses → assignments → teacher side → real-time quizzes**.
Everything else is incremental polish on modules that already exist.
