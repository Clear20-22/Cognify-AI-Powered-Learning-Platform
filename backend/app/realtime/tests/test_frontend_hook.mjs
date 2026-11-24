/**
 * Deterministic transport checks for Masum's live hook. No DOM or test packages.
 * Run from the repository root after `npm ci --prefix frontend`:
 *   node backend/app/realtime/tests/test_frontend_hook.mjs
 *
 * The hook itself is bundled unchanged; only React's hook scheduler, auth,
 * browser storage, timers and WebSocket transport are replaced below.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(new URL("../../../../frontend/package.json", import.meta.url));
const { build } = require("esbuild");
const built = await build({
  entryPoints: [fileURLToPath(new URL("../../../../frontend/src/hooks/useLiveQuiz.js", import.meta.url))],
  bundle: true,
  write: false,
  format: "iife",
  globalName: "LiveModule",
  define: { "import.meta.env": "{}" },
  plugins: [{
    name: "hook-mocks",
    setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: "react", namespace: "mock" }));
      builder.onResolve({ filter: /useAuth\.jsx$/ }, () => ({ path: "auth", namespace: "mock" }));
      builder.onLoad({ filter: /.*/, namespace: "mock" }, ({ path }) => ({
        contents: path === "react"
          ? "export const {useState,useEffect,useRef,useCallback}=globalThis.react;"
          : "export function useAuth(){return globalThis.auth;}",
      }));
    },
  }],
});

const slots = [];
let cursor = 0;
let dirty = false;
let effects = [];
let result;
let timerId = 0;
let fetchCalls = 0;
const timers = new Map();
const sockets = [];
const sameDependencies = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]));

const react = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { value: typeof initial === "function" ? initial() : initial };
    return [slots[index].value, (value) => {
      const next = typeof value === "function" ? value(slots[index].value) : value;
      if (!Object.is(next, slots[index].value)) {
        slots[index].value = next;
        dirty = true;
      }
    }];
  },
  useRef(value) {
    const index = cursor++;
    return slots[index] ?? (slots[index] = { current: value });
  },
  useCallback(fn, dependencies) {
    const index = cursor++;
    if (!slots[index] || !sameDependencies(slots[index].dependencies, dependencies)) slots[index] = { dependencies, fn };
    return slots[index].fn;
  },
  useEffect(fn, dependencies) {
    const index = cursor++;
    if (!slots[index] || !sameDependencies(slots[index].dependencies, dependencies)) {
      const old = slots[index];
      slots[index] = { dependencies, cleanup: old?.cleanup };
      effects.push(() => {
        old?.cleanup?.();
        slots[index].cleanup = fn();
      });
    }
  },
};

class Socket {
  static OPEN = 1;
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    sockets.push(this);
  }
  open() {
    this.readyState = Socket.OPEN;
    this.onopen?.();
  }
  send(data) {
    this.sent.push(JSON.parse(data));
  }
  emit(message) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  close(code = 1000) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

const storage = new Map();
const context = vm.createContext({
  react,
  auth: { user: { id: "student-1", role: "student" } },
  window: { location: { origin: "http://localhost:5173" } },
  URL,
  WebSocket: Socket,
  AbortController,
  localStorage: { getItem: (key) => key === "access_token" ? "real-token" : null },
  sessionStorage: {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
  setTimeout: (fn, delay) => {
    timers.set(++timerId, { fn, delay });
    return timerId;
  },
  clearTimeout: (id) => timers.delete(id),
  setInterval: (fn, delay) => {
    timers.set(++timerId, { fn, delay, interval: true });
    return timerId;
  },
  clearInterval: (id) => timers.delete(id),
  fetch: async () => {
    fetchCalls++;
    return { ok: false, status: 403, json: async () => ({ detail: { code: "role_required", message: "A teacher role is required" } }) };
  },
});
vm.runInContext(built.outputFiles[0].text, context);

function render() {
  let loops = 0;
  do {
    dirty = false;
    cursor = 0;
    effects = [];
    result = { ...context.LiveModule.useLiveQuiz(), ...context.LiveModule.useLiveNotifications() };
    effects.forEach((effect) => effect());
    assert(++loops < 20, "The hook should settle without a render loop");
  } while (dirty);
  return result;
}

render();
assert.equal(sockets.length, 1, "Only the notification stream opens before joining");
assert.equal(result.joinRoom("!bad"), false);
render();
assert.match(result.error, /6-character/);
assert.equal(result.joinRoom(" abc123 "), true);
render();
assert.equal(fetchCalls, 0, "New members join through WebSocket without a forbidden REST preflight");
const room = sockets.at(-1);
assert(room.url.endsWith("/ws/live/ABC123"));
assert(!room.url.includes("real-token"), "Credentials must never appear in the URL");
room.open();
assert.deepEqual(room.sent[0], { type: "authenticate", token: "real-token" });

const state = {
  room_code: "ABC123", title: "Test", status: "active", question_index: 0, question_count: 2,
  question: { id: "q1", question: "Question?", options: ["A", "B"], deadline: new Date(Date.now() + 30000).toISOString() },
  leaderboard: [], participant_count: 1, answered_count: 0, is_host: false, submitted_answer: null,
};
room.emit({ type: "state", session: state });
render();
assert.equal(result.connection, "connected");
result.submitAnswer(1);
result.submitAnswer(0);
render();
assert.equal(room.sent.filter((message) => message.type === "answer").length, 1, "Duplicate answer clicks are suppressed");
assert.equal(result.pendingAnswer, 1);
const savedState = { ...state, submitted_answer: 1, leaderboard: [{ user_id: "student-1", score: 1000 }] };
room.emit({ type: "state", session: savedState });
render();
assert.equal(result.pendingAnswer, null);
assert.equal(result.session.submitted_answer, 1);
result.submitAnswer(0);
assert.equal(room.sent.filter((message) => message.type === "answer").length, 1, "A confirmed answer stays locked");

room.close(1006);
render();
assert.equal(result.connection, "reconnecting");
const retry = [...timers.entries()].find(([, timer]) => timer.delay === 1000 && !timer.interval);
assert(retry, "A reconnect should be scheduled");
timers.delete(retry[0]);
retry[1].fn();
render();
let rejoined = sockets.at(-1);
rejoined.open();
rejoined.emit({ type: "state", session: savedState });
render();
assert.equal(result.session.leaderboard[0].score, 1000, "Reconnect restores the authoritative score");
room.emit({ type: "state", session: state });
render();
assert.equal(result.session.leaderboard[0].score, 1000, "A replaced socket cannot overwrite recovered room state");
rejoined.emit({ type: "ping" });
assert.equal(rejoined.sent.at(-1).type, "pong");

const secondQuestion = { ...state, question_index: 1, question: { ...state.question, id: "q2" } };
rejoined.emit({ type: "state", session: secondQuestion });
render();
result.submitAnswer(0);
render();
rejoined.emit({ type: "answer_accepted", question_id: "q1", answer: 1 });
render();
assert.equal(result.pendingAnswer, 0, "An earlier question's acknowledgement cannot unlock the current answer");

const hostState = { ...state, is_host: true };
rejoined.emit({ type: "state", session: hostState });
render();
result.advanceQuestion();
render();
assert.equal(result.actionPending, true);
result.reconnect();
render();
rejoined = sockets.at(-1);
rejoined.open();
rejoined.emit({ type: "state", session: hostState });
render();
assert.equal(result.actionPending, false, "Manual reconnect recovers a command whose acknowledgement never arrived");
result.advanceQuestion();
result.advanceQuestion();
render();
assert.equal(rejoined.sent.filter((message) => message.type === "advance").length, 1, "A host double-click cannot skip a question");
assert.equal(result.actionPending, true);
rejoined.emit({ type: "state", session: { ...hostState, participant_count: 2, answered_count: 1 } });
render();
assert.equal(result.actionPending, true, "Unrelated join/answer broadcasts cannot acknowledge an advance");
result.advanceQuestion();
assert.equal(rejoined.sent.filter((message) => message.type === "advance").length, 1, "Advance remains locked until the question actually changes");
const nextState = { ...hostState, question_index: 1, question: { ...state.question, id: "q2" } };
rejoined.emit({ type: "state", session: nextState });
render();
assert.equal(result.actionPending, false, "A new question acknowledges the host's advance");
result.endSession();
render();
assert.equal(result.actionPending, true);
rejoined.emit({ type: "state", session: { ...nextState, answered_count: 1 } });
render();
assert.equal(result.actionPending, true, "Only a finished session acknowledges the end command");
rejoined.emit({ type: "state", session: { ...nextState, status: "finished", question: null } });
render();
assert.equal(result.actionPending, false);

result.leaveRoom();
render();
room.emit({ type: "state", session: state });
render();
assert.equal(result.session, null, "Late messages from a disposed socket cannot restore an old session");
await result.createSession({ title: "Test", questions: [] });
render();
assert.equal(result.error, "A teacher role is required", "Structured API errors reach the host");

const privateStream = sockets.find((socket) => socket.url.endsWith("/ws/notifications"));
privateStream.open();
privateStream.emit({ type: "notifications", notifications: [
  { id: "old", title: "Older update", created_at: "2026-11-24T10:00:00Z" },
  { id: "new", title: "Newer update", created_at: "2026-11-24T11:00:00Z" },
] });
render();
assert.equal(result.notifications[0].id, "new", "Notification replay is newest first");
privateStream.emit({ type: "notification", notification: { id: "new", title: "Newer update", created_at: "2026-11-24T11:00:00Z" } });
render();
assert.equal(result.notifications.length, 2, "Live delivery and replay are deduplicated");
result.joinRoom("ABC123");
render();
storage.set("cognify-live-room:student-2", "ZZ9999");
context.auth.user = { id: "student-2", role: "student" };
render();
assert.equal(result.roomCode, "ZZ9999", "Changing account restores only that account's room");
assert.equal(storage.get("cognify-live-room:student-2"), "ZZ9999", "The previous account's room never overwrites another account's saved room");
assert.equal(result.notifications.length, 0, "Private updates are removed when the account changes");
privateStream.emit({ type: "notification", notification: { id: "secret", title: "Old account's grade" } });
render();
assert.equal(result.notifications.length, 0, "A disposed account's stream cannot leak private updates");
context.auth.user = null;
render();
assert.equal(result.authenticated, false);
assert.equal(result.session, null, "Signing out hides all classroom state");
assert.equal(result.notifications.length, 0);
console.log("PASS: join, auth-first socket, answer locking, score recovery, heartbeat, command recovery, stale connection isolation, private notification replay, account isolation and API errors.");
