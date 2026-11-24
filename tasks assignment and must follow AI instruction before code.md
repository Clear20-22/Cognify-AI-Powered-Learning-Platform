# 🧭 Cognify-AI — Task Assignment & Mandatory AI Instructions

> **READ THIS FULLY BEFORE WRITING ANY CODE.**
> This file assigns each team member a section of the new work and sets strict
> boundaries. Work is divided by **continuity** (you extend the area you already
> built) except for two brand-new isolated modules given to the members starting fresh.
>
> Feature IDs (FR-/NFR-) refer to the *Functional & Non-Functional Requirement Report*.
> See also [TODO_FEATURES.md](TODO_FEATURES.md) and
> [MISSING_FEATURES_FROM_PROPOSAL.md](MISSING_FEATURES_FROM_PROPOSAL.md) for full spec.

---

## ⛔ MANDATORY RULES FOR EVERY AI AGENT / DEVELOPER

Whoever (or whichever AI agent) works on a task **MUST** obey all of the following.
These are not suggestions.

1. **Stay inside your own section.** Edit ONLY the files/folders listed under *your*
   name in the "Ownership Boundaries" table. **Never** modify, refactor, rename, or
   delete files owned by another member — even to "fix" something. If another section
   has a bug, report it to that owner; do not touch it.
2. **No cross-section edits.** If your feature needs data from another module, consume
   it through the agreed **interface contract** (a REST endpoint, a dependency, or an
   ID reference) — do NOT import internals or reach into their files.
3. **Shared/integration files are append-only and need coordination.** The files in
   the "Shared – coordinate first" list (routing, `router.py`, `apiService.js`,
   `main.py`) may only be *added to* (register your own route/function). Do not change
   or remove another member's lines there. Announce the change in the team chat first.
4. **Read the spec before coding.** Open [TODO_FEATURES.md](TODO_FEATURES.md) and the
   requirement report; implement exactly the FR/NFR listed for your task, nothing from
   another member's list.
5. **Follow the existing architecture & patterns** already in the repo (Strategy,
   Factory, Repository/`IDataStore`, Builder, service-layer separation). Match the code
   style, naming, and comment density of the surrounding code.
6. **Secrets stay in `.env`.** Never hardcode API keys or secrets. Never commit `.env`.
7. **Do not change already-fixed config** — the AI model names in
   [config.py](backend/app/core/config.py) (`openai/gpt-oss-120b`, `gemini-3.8-flash`)
   are correct; leave them alone.
8. **Each new endpoint must enforce auth/role** via the RBAC dependency once it exists
   (see AKRAM's contract). Validate all inputs; return proper 400/401/403.
9. **One branch per feature, always from the latest `main`.** Name it
   `feature/<name>-<feature>` (e.g. `feature/arik-course-crud`), open a PR, and never push
   directly to `main`. Follow the **🔀 Git Workflow** section below step by step.
10. **Reference the FR/NFR ID** in your commit messages and PR description.

> **One line:** *No one's AI agent works in anyone else's section. Integrate through
> contracts, not by editing each other's files.*

---

## 🔗 Build order & dependency note

Some modules depend on others. Build in this order; downstream owners code against the
**contract** (not the files) while upstream is in progress:

1. ✅ **AKRAM** ships the **Role/RBAC contract first** (a `require_role(...)` dependency and
   `current_user.role`). Everyone else needs it to protect endpoints.
   **Done** — branch `feature/akram-auth-rbac`. See *Integration Notes* below.
2. **ARIK** ships the **Course contract** (`course_id` + `GET /courses/{id}`). Assignments
   and teacher-quizzes reference `course_id` only.
3. Everyone else builds in parallel against those two contracts.

---

## 📢 Integration Notes — Auth & RBAC is available (READ BEFORE CODING)

The Role/RBAC contract from AKRAM's branch `feature/akram-auth-rbac` is the base for
every other module. Once it is merged to `main`, **pull `main` into your branch** before
you continue, then follow these notes.

### 1. After pulling
- Re-run `pip install -r requirements.txt` — `email-validator` is new and the backend
  will not import without it.
- To run tests, also install the dev tools (not in `requirements.txt`):
  `pip install pytest pytest-asyncio httpx`, then from `backend/`: `python -m pytest tests`.

### 2. Your `backend/.env`
- The MongoDB key is **`MONGODB_URI`** (not `MONGODB_URL`). The code ignores
  `MONGODB_URL`, so with the wrong name the app silently runs in-memory and loses all
  data on restart. ⚠️ `.env.example` and `docker-compose.yml` still use the wrong name —
  use `MONGODB_URI` in your own `.env`.
- To get an admin account: add `ADMIN_EMAILS=you@example.com` (comma-separated), then
  sign up or sign in with that email. Nobody can self-register as admin.
- Never paste the MongoDB connection string anywhere except your own `.env`.

### 3. Protecting your endpoints (backend contract)
Roles are `student`, `teacher`, `admin`. Use `require_role` on every new endpoint:

```python
from fastapi import Depends
from app.api.deps import require_role, get_current_active_user
from app.models.user import UserRole

# Only teachers (and admins) can create
@router.post("")
async def create_course(user: dict = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))):
    owner_id = user["id"]          # role is in user["role"]
    ...

# Any logged-in, active user
@router.get("")
async def list_courses(user: dict = Depends(get_current_active_user)):
    ...
```

- No/invalid token → **401**. Wrong role → **403**. Deactivated user → **403**.
- The role is read from the database on every request, so role changes and
  deactivation apply immediately — do not trust a role sent by the client.
- For free-form `dict` fields in your schemas, call `reject_mongo_operators()` from
  `app.core.security` in a validator (blocks `$`-operator injection, NFR-SEC-04).

### 4. Hiding UI by role (frontend contract)
```jsx
import { useAuth } from "../hooks/useAuth.jsx";

const { user, role, hasRole } = useAuth();   // role: "student" | "teacher" | "admin"
{hasRole("teacher", "admin") && <CreateCourseButton />}
```
`hasRole` only hides UI — the backend must still enforce access with `require_role`.
`user.createdAt` holds the account creation date.

### 5. Behaviour changes you may notice
- **New sign-ups** need a password of 8+ chars with an uppercase letter, a lowercase
  letter and a digit. Existing accounts keep signing in with their old password.
- Existing users without a role are treated as **student**.
- Sign-in: wrong email/password → 401 (same message for both); 5 failures in 10 min →
  **429** for 10 minutes; deactivated account → 403.
- `GET /api/users/{id}` now requires login (own profile or admin); `POST /api/users`
  is admin-only. The frontend does not use either.
- New endpoints: `GET/PATCH /api/auth/me`, `POST /api/auth/change-password`, and admin
  `GET /api/users`, `PATCH /api/users/{id}/status`, `PATCH /api/users/{id}/role`.

### 6. Shared files that changed — pull before editing them
`backend/app/core/config.py` (new settings; unknown `.env` keys no longer crash startup) ·
`backend/app/db/base.py` and `init_db.py` (new `update_user`, `list_users`) ·
`backend/tests/conftest.py` (forces in-memory store).

### 7. Tests must never touch a real database
`tests/conftest.py` sets `MONGODB_URI=""` so tests always use the in-memory store, even
if your `.env` points to Atlas. Do not remove this — tests create and delete users and
would pollute the shared database.

---

# 👥 Task Assignments

## 🟡 AKRAM — Identity, Access, Assignments & Account (largest share, you drive it)
**Why you:** you already own Auth and Notes. You extend that into the full
access-control + account + assignment backbone, which everything else depends on.

**Your tasks**
- [x] Add `role` (Student / Teacher / Admin) to signup & user model — `FR-AUTH-01`
- [x] Password policy: min 8, upper + lower + digit — `FR-AUTH-03`
- [x] **RBAC dependency** `require_role(...)` + `current_user.role`; 403 on forbidden — `FR-AUTH-07`
- [x] Admin: list users, deactivate/reactivate — `FR-AUTH-09` *(Admin page `/admin`)*
- [x] Profile update + change password — `FR-AUTH-10`; full logout — `FR-AUTH-08` *(Profile page `/profile`)*
- [x] Login lockout after 5 fails / 10 min — `NFR-SEC-07`; reject `$`-operator injection — `NFR-SEC-04` *(helper ready; apply it in your own schemas)*
- [ ] **Assignment module (NEW):** create / submit / deadline / grade / feedback — `FR-ASG-01..08`
- [ ] Notes: course/topic tag + keyword search — `FR-NOTE-02/03`
- [ ] **Teacher Dashboard (NEW, read-only aggregator):** consumes others' APIs — `FR-TDSH-01/03`
- [ ] README fixes (model names, component tree) + resolve 20MB vs 50MB decision

**You expose (contract for others):** `require_role()` dependency, `current_user.role`.
Publish this first — Arik, Mim, Masum all need it.

---

## 🔵 SOJIB — AI & Document polish (your existing turf, focused)
**Why you:** you own the AI subsystem and Documents. These are small hardening tasks
inside code you already wrote.

**Your tasks**
- [ ] Visible "AI may be inaccurate — verify" disclaimer in chat — `FR-AI-07`
- [ ] 30s AI timeout → clear error, keep input, allow retry — `FR-AI-09`
- [ ] AI request rate-limit (default 30/hour/user) — `FR-AI-10`
- [ ] Document "important topics" list (separate from summary) — `FR-DOC-05`
- [ ] Ask-questions-about-a-document (doc-grounded Q&A) — `FR-DOC-07`
- [ ] Mark upload **Failed** when no extractable text (scanned PDF) — `FR-DOC-03`

**You expose:** document text/Q&A endpoints (already yours). No one else edits AI/Docs.

---

## 🟢 MIM — Quizzes & Analytics (your existing turf)
**Why you:** you lead Exams/Practice and Analytics. You extend them into
teacher-authored quizzes and deeper analytics.

**Your tasks**
- [ ] Teacher-authored quiz for a course (MCQ, 2–6 options, 1 correct) — `FR-QZ-01`
- [ ] Topic tag + difficulty (Easy/Med/Hard) per question — `FR-QZ-02`
- [ ] Publish with start/end time window — `FR-QZ-03`
- [ ] **Countdown timer + auto-submit on expiry** — `FR-QZ-04`
- [ ] Randomize question/option order — `FR-QZ-05`; max attempts (default 1) — `FR-QZ-07`
- [ ] Topic-wise performance per attempt — `FR-QZ-09`
- [ ] Topic-wise accuracy (% per topic) — `FR-ANL-03`
- [ ] Weak areas = topics < 60% accuracy with ≥ 5 answers — `FR-ANL-04`

**You consume:** `course_id` (from Arik) and `require_role()` (from Akram) — by contract only.

---

## 🟠 ARIK — Course Management (BRAND-NEW, fully isolated module)
**Why you:** this is a self-contained module no one has started. You build it end-to-end
in your own new files, so you never touch anyone else's code.

**Your tasks**
- [ ] Course model + CRUD: title, code, description — `FR-CRS-01`
- [ ] Teacher edits/deletes own courses only (403 otherwise) — `FR-CRS-02`
- [ ] Upload lecture materials (PDF/PPTX) to a course — `FR-CRS-03`
- [ ] Student browses + enrolls — `FR-CRS-04`; access limited to enrolled — `FR-CRS-05`
- [ ] Teacher views/removes enrolled students — `FR-CRS-06`
- [ ] Search courses by title/code — `FR-CRS-07`; un-enroll (keep results) — `FR-CRS-08`

**You expose (contract):** `course_id` (string) and `GET /courses/{id}`,
`GET /courses/{id}/students`. Publish early — Assignments & teacher-quizzes need `course_id`.
**You consume:** `require_role()` (from Akram).

---

## 🟣 MASUM — Real-Time Live Quiz / WebSockets (BRAND-NEW, fully isolated subsystem)
**Why you:** the whole app is REST today; this is a separate WebSocket subsystem in its
own new folder. Completely isolated — the ideal independent new addition.

**Your tasks**
- [ ] Teacher creates a live session + unique **6-char room code** — `FR-RT-01`
- [ ] Students join by room code (invalid/closed → error) — `FR-RT-02`
- [ ] Teacher advances questions, pushed < 1s to all joined clients — `FR-RT-03`
- [ ] One answer per student per question — `FR-RT-04`
- [ ] **Live leaderboard** updates < 1s — `FR-RT-05`
- [ ] Reconnect with same room code, keep score — `FR-RT-06`
- [ ] Real-time notifications (new quiz/assignment/marks) — `FR-RT-07`

**You expose:** the `/ws/...` live endpoints (your own). Build the whole thing in a new
`backend/app/realtime/` folder + new frontend Live components.
**You consume:** `require_role()` (Akram); quiz question format (read-only reference).

---

# 🗂️ Ownership Boundaries (no one edits outside their own list)

| Owner | Files / folders you OWN (edit only these) |
|---|---|
| **AKRAM** | `backend/app/api/v1/auth.py`, `users.py`, `notes.py` · `schemas/auth.py`, `user.py`, `note.py` · `core/security.py` · `api/deps.py` · `services/user_service.py`, `note_service.py` · **NEW** `api/v1/assignments.py`, `services/assignment_service.py`, `models/assignment.py`, `schemas/assignment.py` · `frontend/.../AuthModal.jsx`, `hooks/useAuth.jsx`, `Notes.jsx` · **NEW** `Assignments.jsx`, `TeacherDashboard.jsx` · `README.md` |
| **SOJIB** | `backend/app/services/ai_providers/*`, `ai_service.py` · `api/v1/chat.py`, `documents.py` · `services/chat_service.py`, `document_service.py`, `document_extractors.py`, `pdf_service.py`, `pdfReader/*` · `frontend/.../ChatPage.jsx`, `Documents.jsx`, `hooks/useChatSession.js`, `useDocumentManager.js` |
| **MIM** | `backend/app/api/v1/exams.py` · `services/exam_service.py` · `schemas/exam.py` · **NEW** `api/v1/quizzes.py` (teacher quizzes) · `frontend/.../PracticeTest.jsx`, `Performance.jsx`, `StudyPatterns.jsx`, `hooks/useExamSession.js` |
| **ARIK** | **NEW only:** `backend/app/api/v1/courses.py`, `services/course_service.py`, `models/course.py`, `schemas/course.py` · `frontend/.../Courses.jsx`, `CourseDetail.jsx`, `hooks/useCourses.js` |
| **MASUM** | **NEW only:** `backend/app/realtime/*` (new folder), `api/v1/live.py` · `frontend/.../LiveQuiz.jsx`, `LiveQuizHost.jsx`, `Leaderboard.jsx`, `hooks/useLiveQuiz.js` |

### 🔓 Shared – coordinate first (append-only, never edit others' lines)
`backend/app/api/v1/router.py` (register your own router) · `backend/main.py` ·
`frontend/src/App.jsx` (add your own routes) · `frontend/src/services/apiService.js`
(add your own API functions) · `backend/app/db/base.py` / `init_db.py` (add your own
collection methods) · `backend/app/core/config.py` (add new settings only; don't change AI models).

> Rule for shared files: **add a new block for your module; do not touch existing blocks.**
> If two people must change the same shared file, agree in chat and merge carefully.

---

## 🔀 Git Workflow (step by step) — every task follows this

> **For AI agents:** run these steps in order. Do not skip a step. If any step fails
> (tests fail, conflict you cannot resolve safely, a file outside your section shows up),
> **stop and report to your owner** instead of working around it.

### 0. One-time setup
```bash
git clone https://github.com/Clear20-22/Cognify-AI-Powered-Learning-Platform.git
git config user.name  "Your Real Name"
git config user.email "your-github-email@example.com"
```
Commits must be made with **your own** name and email — this is how each member's
contribution is counted. Never commit with another member's identity.

### 1. Start a task — new branch from the latest `main`
```bash
git switch main
git pull origin main
git switch -c feature/<name>-<feature>     # e.g. feature/mim-quiz-timer
```
- One branch = one feature/task. Small branches are easy to review; a huge branch is not.
- Other prefixes: `fix/<name>-<topic>` for bug fixes, `docs/<name>-<topic>` for docs only.
- Never start a new task on top of an old, unmerged branch.

### 2. While working — small, clear commits
```bash
git status                          # check exactly what changed
git add <file1> <file2>             # stage your files by name
git commit -m "feat(courses): add course CRUD endpoints (FR-CRS-01, FR-CRS-02)"
```
- Commit message: `type(scope): what changed (FR/NFR ID)`. Types: `feat`, `fix`, `docs`,
  `test`, `refactor`.
- **Do not use `git add .` blindly** — check `git status` first and stage only your files.
- Never commit: `.env`, API keys, MongoDB connection strings, `node_modules/`, `dist/`,
  `__pycache__/`, `.venv/`.

### 3. Keep your branch up to date with `main`
Whenever someone else's PR is merged (or at least before you open yours):
```bash
git fetch origin
git merge origin/main               # brings the latest main into your branch
```
Then re-run the tests. If there is a conflict, see step 9.

### 4. Before opening a PR — self-check
```bash
cd backend && python -m pytest tests        # all tests must pass
cd ../frontend && npm run build             # build must succeed (if you touched frontend)
git diff --stat origin/main...HEAD          # list every file your branch changes
```
- The file list must contain **only files from your section** (plus append-only additions
  to shared files). Anything else → undo it before the PR.
- No secrets in the diff: `git diff origin/main...HEAD | grep -iE "api_key=|mongodb\+srv|secret_key="`
  must print nothing.
- Add tests for new backend behaviour, and tick your boxes in [TODO_FEATURES.md](TODO_FEATURES.md).

### 5. Push and open the PR
```bash
git push -u origin feature/<name>-<feature>
gh pr create --base main --fill            # or open the link Git prints, on GitHub
```
Use this PR description template:
```markdown
## Summary
What this PR does and which requirement IDs it implements (FR-xxx / NFR-xxx).

## What changed
Short bullet list, grouped by backend / frontend.

## How it was tested
Tests added/passed, manual checks done.

## Notes for teammates
New endpoints/contracts, .env changes, anything others must do after merge.

## Not in this PR
Related work that is still pending.
```

### 6. Review — at least one teammate
The author asks a teammate in the group chat to review. **The reviewer checks:**
- [ ] Only the author's own files changed (Ownership Boundaries), shared files append-only
- [ ] No secrets, `.env`, `node_modules`, or build output committed
- [ ] New endpoints use `require_role()` / `get_current_active_user` and validate input
- [ ] Tests pass and new behaviour has tests
- [ ] The PR description matches what the code actually does

The reviewer approves on GitHub, or leaves comments. The author fixes the comments by
pushing more commits to the **same branch** — the PR updates automatically.

### 7. Merge
- **Only after at least one approval.** Never merge your own PR without a review.
- On GitHub use **"Create a merge commit"** so every commit and its author stays in the
  history (this keeps each member's contribution visible).
- After merging, click **"Delete branch"**.

### 8. After the merge
- The author posts in the group: what was merged and anything others must do
  (e.g. reinstall requirements, new `.env` key).
- Everyone updates:
```bash
git switch main
git pull origin main
git switch <your-open-branch>
git merge main                      # keep your in-progress work up to date
```

### 9. Conflicts
- Open the conflicted file, keep **both** sides when they are separate blocks (typical in
  shared files like `router.py`, `App.jsx`, `apiService.js`).
- **Never resolve a conflict by deleting another member's code.** If you are not sure what
  their code needs, ask its owner before finishing the merge.
- After resolving: `git add <file>`, `git commit`, re-run the tests.

### 10. Never
- Push or force-push to `main`.
- Force-push (`--force`) to someone else's branch.
- Merge your own PR without review.
- Rewrite history that is already pushed and shared.
- Commit a secret. **If a secret is ever committed:** tell the team immediately and
  **revoke/regenerate the key** in its provider's console — deleting it in a later commit
  is not enough, because it stays in the git history.

---

## ✅ Definition of Done (per task)
- Endpoint enforces auth + correct role, validates input, returns proper status codes.
- Matches existing architecture & style; no secrets hardcoded.
- Only your owned files changed (plus append-only additions to shared files).
- FR/NFR ID referenced in the PR; the corresponding box in
  [TODO_FEATURES.md](TODO_FEATURES.md) is checked.
- PR reviewed by at least one teammate before merge to `main`.
- The 🔀 Git Workflow steps above were followed (branch from latest `main`, self-check,
  PR template, merge commit, branch deleted).
