## Summary

Adds Masum's authenticated live classroom quiz subsystem for FR-RT-01 through
FR-RT-06, plus the private notification transport/UI contract for FR-RT-07.
Teachers author a room and share a six-character code. Students answer once per
question, see live standings and reconnect with their original score.

## What changed

- Backend: validated session commands, server-side scoring/deadlines, teacher
  ownership, shared RBAC, bounded WebSocket fan-out, private notification replay.
- Frontend: teacher authoring/host controls, student lobby/questions, leaderboard,
  reconnect recovery, account isolation and global live links/class updates.
- Integration: additive REST/socket registration and React routes; Masum's
  completed TODO entries. Other teammates' module implementations are untouched.

## How it was tested

- Full backend suite: **120 passed** (56 existing, 64 realtime).
- Realtime suite against freshly installed dependencies: **64 passed**.
- Actual mounted app verifies JWT auth, roles/ownership, question and leaderboard
  delivery under one second locally, duplicate rejection and reconnect recovery.
- Private quiz/assignment/marks notification delivery, replay and publish denial.
- Standalone JWT/WebSocket smoke and expanded frontend hook regressions passed.
- Targeted ESLint passed; production Vite build passed (387 modules).

Details and reproducible commands: `backend/app/realtime/VALIDATION.md` and
`backend/app/realtime/README.md`.

## Notes for teammates

- No new secrets or environment variables. Uses existing `VITE_API_URL` and RBAC.
- Registered routes: `/api/live/sessions...`, `/ws/live/{code}`,
  `/ws/notifications`, `/live`, `/live/host`.
- Publish server-authorized `quiz_published`, `assignment_created` and
  `marks_released` events through `get_live_service(request).notifications.publish`.
  For marks, target only the individual student's account.
- One backend worker: scores survive network reconnect, but not server restart.
- Deployment owner must proxy `/ws/` with Upgrade support for same-origin Nginx.
- CI owner should add `backend/app/realtime/tests` to the existing pytest command.
- Please obtain at least one teammate approval before merging.

## Not in this PR

Course, assignment and teacher-quiz implementations belong to other owners and
are absent from current `main`. Their event publishing calls remain pending, so
FR-RT-07 stays unchecked in the master TODO despite completed notification
transport/UI. Durable/multiworker storage and reverse-proxy edits are outside
this contribution. Vite's non-blocking bundle-size warning and existing dependency
deprecation warnings remain.
