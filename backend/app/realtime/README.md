# Masum — live quizzes and notifications (FR-RT-01..07)

Cognify combines a FastAPI service layer and repository-backed authentication
with React 19, Vite and Tailwind. This contribution adds an isolated real-time
subsystem and connects it to the current shared role contract. Existing tutoring,
practice exams, documents, account management and notes keep their own modules.

## Use the feature

Start the backend and frontend using the root README. Sign in with a registered
teacher or student account; anonymous demo sessions cannot use live rooms.
The authenticated application now includes a **Host live quiz** or **Join live
quiz** link and a private **Class updates** panel on every page.

1. A teacher opens `/live/host`, writes 1–50 questions with 2–6 distinct options
   and one correct answer, and creates a room.
2. Students open `/live` and enter the six-character code.
3. The owning teacher starts and advances questions. The server accepts one
   answer per student/question before its deadline and broadcasts the standings.
4. Correct answers earn 1000 points. Reconnecting with the same account/code
   restores the participant's submitted answer and score.
5. Ending a room blocks new participants. Existing participants can reconnect
   to view the final standings while the room is retained.

The registered routes are part of this PR; no integration patch is needed.
Only Masum's files, additive route registration in shared files, and his TODO
entries are changed. A teammate must review before merging to `main`.

## Requirement coverage

| Requirement | Implementation |
| --- | --- |
| FR-RT-01 | Teacher creates a session with a unique random six-character code. |
| FR-RT-02 | Authenticated students join by code; invalid/unknown/expired/closed rooms produce clear errors. |
| FR-RT-03 | Only the owning teacher advances; question state is pushed immediately. |
| FR-RT-04 | Validated server-side answers, one per student/question, with deadline enforcement. |
| FR-RT-05 | Server-scored ranked leaderboard broadcasts after accepted answers. |
| FR-RT-06 | Reconnect restores membership, submitted answers and score. |
| FR-RT-07 | Private authenticated notification stream, bounded replay and global panel support quiz, assignment and marks events. Upstream event producers remain an integration dependency. |

Subsecond question and score delivery is checked locally. Internet delivery
latency depends on the deployed server and network.

## HTTP and WebSocket contracts

HTTP uses `Authorization: Bearer <access_token>` and Akram's shared
`require_role(...)` dependency. Socket identity is reloaded from the datastore
and normalized through the same active-user contract. Inactive accounts and
unauthorized roles are denied; only the original teacher controls their room.

```text
POST /api/live/sessions                 teacher; creates and returns room state
GET  /api/live/sessions/{code}          owner or already joined student
POST /api/live/sessions/{code}/advance  owning teacher
POST /api/live/sessions/{code}/end      owning teacher
WS   /ws/live/{code}                   owner or student joining by code
WS   /ws/notifications                 private account updates
```

Creation body (the correct answer is a zero-based option index):

```json
{"title":"Math revision","questions":[{"question":"2 + 2?","options":["3","4"],"correct_answer":1,"time_limit_seconds":30}]}
```

Answer keys are excluded from public state. Questions support 5–300 second
limits. The teacher controls progression; expiry blocks further answers.

Send authentication as the first socket frame within ten seconds, keeping the
credential out of URLs and request logs:

```json
{"type":"authenticate","token":"<access_token>"}
```

Commands are `{"type":"advance"}`, `{"type":"end"}` and
`{"type":"answer","question_id":"<server id>","answer":1}`.
Replies include `state`, `answer_accepted`, `error` and heartbeat messages.
Do not send client-calculated scores, user IDs or answer keys.

`VITE_API_URL` configures the backend URL as in the rest of the frontend.
WebSockets automatically select `ws:` or `wss:` from that URL.

## Notification contract for quiz and assignment owners

The notification stream is read-only to clients. Trusted upstream services call
this API after a successful quiz publish, assignment creation or marks release:

```python
from app.api.v1.live import get_live_service

# Derive recipients from the module's course/ownership authorization rules.
await get_live_service(request).notifications.publish(
    recipient_ids=authorized_student_ids,
    event="assignment_created",  # or "quiz_published" / "marks_released"
    title="New assignment",
    message="A new assignment is available in your course.",
)
```

For `marks_released`, target the individual student's authorized account, never
the entire class. Do not include tokens, passwords or private marks in a class
broadcast. The broker retains and replays the latest 50 messages per account.

Current `main` does not contain the course, assignment or teacher-quiz modules.
Their owners must call this contract when those features are implemented.
FR-RT-07 remains unchecked in the master TODO until the source events are wired;
transport, privacy, replay and rendering are implemented and tested here.

## Deployment limits

Room state and notification replay are process local. Run **one backend worker**.
Reconnect survives network interruptions, but a backend restart clears rooms and
scores. Shared storage/pub-sub is needed for multiworker or durable operation.

Rooms expire after six hours; finished rooms are retained for at most one hour.
Default limits: 100 rooms, 500 participants per room, four room sockets per user,
four notification sockets per user and 5000 retained notification accounts.
The fifth connection replaces the oldest; slow socket sends time out separately.

For a same-origin HTTPS reverse proxy, its owner must forward `/ws/` to FastAPI
with WebSocket Upgrade support. The existing `frontend/nginx.conf` is outside
Masum's ownership and currently has no WebSocket location. Example configuration:

```nginx
location /ws/ {
    proxy_pass http://backend:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 75s;
}
```

Direct local frontend/backend use works with the configured backend URL.

## Verification

Install the normal requirements plus the test tools, then run from the root:

```powershell
python -m pip install -r requirements.txt pytest pytest-asyncio httpx email-validator
python -m pytest backend/tests backend/app/realtime/tests -q
python backend/app/realtime/tests/smoke_transport.py  # set PYTHONPATH=backend
node backend/app/realtime/tests/test_frontend_hook.mjs
cd frontend
npm ci
npx eslint src/components/LiveQuiz.jsx src/components/LiveQuizHost.jsx src/components/Leaderboard.jsx src/hooks/useLiveQuiz.js
npm run build
```

The realtime test fixture adds `backend` to the import path. For the standalone
smoke script in PowerShell, first run
`$env:PYTHONPATH = (Join-Path (Get-Location) 'backend')`.
The existing CI workflow only discovers `backend/tests`; its owner should add
`backend/app/realtime/tests` to the pytest command. Actual local results and
remaining operational limits are recorded in `VALIDATION.md`.
