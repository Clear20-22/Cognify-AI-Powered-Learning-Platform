import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth.jsx";

const API_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
const ROOM_PATTERN = /^[A-Z0-9]{6}$/;

function socketUrl(path) {
  const url = new URL(`${API_URL}${path}`, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function restoreRoom(key) {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function deadlineTime(value) {
  if (typeof value === "number") return value < 1e12 ? value * 1000 : value;
  return value ? new Date(value).getTime() : null;
}

/** FR-RT-07: one private notification stream mounted by the app navigation. */
export function useLiveNotifications() {
  const { user } = useAuth();
  const token = localStorage.getItem("access_token");
  const userId = user?.id;
  const eligible = ["student", "teacher"].includes(user?.role) && Boolean(token && token !== "demo-token");
  const [updates, setUpdates] = useState({ userId, notifications: [] });

  useEffect(() => {
    setUpdates({ userId, notifications: [] });
    if (!userId || !eligible) return undefined;
    let stopped = false;
    let retries = 0;
    let retryTimer;
    let authenticationTimer;
    let socket;
    const connect = () => {
      const currentSocket = new WebSocket(socketUrl("/ws/notifications"));
      socket = currentSocket;
      currentSocket.onopen = () => {
        if (stopped || socket !== currentSocket) return;
        currentSocket.send(JSON.stringify({ type: "authenticate", token }));
        authenticationTimer = setTimeout(() => currentSocket.close(), 10000);
      };
      currentSocket.onmessage = (event) => {
        if (stopped || socket !== currentSocket) return;
        try {
          const message = JSON.parse(event.data);
          clearTimeout(authenticationTimer);
          retries = 0;
          const incoming = message.type === "notification" ? [message.notification] : message.type === "notifications" ? message.notifications || [] : [];
          if (incoming.length) setUpdates((previous) => {
            const byId = new Map((previous.userId === userId ? previous.notifications : []).map((item) => [item.id, item]));
            incoming.filter((item) => item?.id).forEach((item) => byId.set(item.id, item));
            return { userId, notifications: [...byId.values()].sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0)).slice(0, 20) };
          });
          if (message.type === "ping") currentSocket.send(JSON.stringify({ type: "pong" }));
        } catch {
          // Ignore malformed messages without interrupting a classroom session.
        }
      };
      currentSocket.onclose = (event) => {
        clearTimeout(authenticationTimer);
        if (!stopped && socket === currentSocket && ![1008, 4001, 4003, 4401, 4403].includes(event.code)) retryTimer = setTimeout(connect, Math.min(1000 * 2 ** retries++, 10000));
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      clearTimeout(authenticationTimer);
      socket?.close();
    };
  }, [userId, token, eligible]);

  return {
    notifications: eligible && userId && updates.userId === userId ? updates.notifications : [],
    clearNotifications: () => setUpdates({ userId, notifications: [] }),
  };
}

/** FR-RT-01..07: authenticated room state, acknowledgements and reconnects. */
export function useLiveQuiz({ initialRoomCode = "" } = {}) {
  const { user } = useAuth();
  const token = localStorage.getItem("access_token");
  const authenticated = Boolean(user && token && token !== "demo-token");
  const storageKey = `cognify-live-room:${user?.id || "guest"}`;
  const [room, setRoom] = useState(() => ({ owner: storageKey, code: initialRoomCode || restoreRoom(storageKey) }));
  const roomCode = room.owner === storageKey ? room.code : restoreRoom(storageKey);
  const setRoomCode = useCallback((code) => setRoom({ owner: storageKey, code }), [storageKey]);
  const [session, setSession] = useState(null);
  const [connection, setConnection] = useState("disconnected");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState(null);
  const [actionPending, setActionPending] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [reconnectKey, setReconnectKey] = useState(0);
  const socketRef = useRef(null);
  const sessionOwnerRef = useRef(storageKey);
  const answerTimerRef = useRef(null);
  const pendingRef = useRef(null);
  const actionTimerRef = useRef(null);
  const actionPendingRef = useRef(null);

  const clearAction = useCallback(() => {
    clearTimeout(actionTimerRef.current);
    actionPendingRef.current = null;
    setActionPending(false);
  }, []);

  const clearPending = useCallback(() => {
    clearTimeout(answerTimerRef.current);
    pendingRef.current = null;
    setPendingAnswer(null);
  }, []);

  useEffect(() => {
    setSession(null);
    setConnection("disconnected");
    setError("");
    clearPending();
    clearAction();
  }, [storageKey, authenticated, clearPending, clearAction]);

  useEffect(() => {
    if (room.owner !== storageKey) return;
    try {
      if (roomCode) sessionStorage.setItem(storageKey, roomCode);
      else sessionStorage.removeItem(storageKey);
    } catch {
      // The active connection still works when browser storage is unavailable.
    }
  }, [roomCode, room.owner, storageKey]);

  useEffect(() => {
    if (!authenticated || !ROOM_PATTERN.test(roomCode)) return undefined;
    let stopped = false;
    let retries = 0;
    let retryTimer;
    let authenticationTimer;
    let socket;
    const connect = () => {
      clearPending();
      clearAction();
      setConnection(retries ? "reconnecting" : "connecting");
      const currentSocket = new WebSocket(socketUrl(`/ws/live/${roomCode}`));
      socket = currentSocket;
      socketRef.current = currentSocket;
      currentSocket.onopen = () => {
        if (stopped || socketRef.current !== currentSocket) return;
        currentSocket.send(JSON.stringify({ type: "authenticate", token }));
        authenticationTimer = setTimeout(() => currentSocket.close(), 10000);
      };
      currentSocket.onmessage = (event) => {
        if (stopped || socketRef.current !== currentSocket) return;
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type === "state") {
          clearTimeout(authenticationTimer);
          retries = 0;
          sessionOwnerRef.current = storageKey;
          setSession(message.session);
          setNow(Date.now());
          setConnection("connected");
          setError("");
          const pendingAction = actionPendingRef.current;
          if (pendingAction && (message.session.status === "finished" || (pendingAction.type === "advance" && message.session.question_index > pendingAction.question_index))) clearAction();
          if (!pendingRef.current || message.session.question?.id !== pendingRef.current.questionId || message.session.submitted_answer != null) clearPending();
        } else if (message.type === "answer_accepted") {
          if (pendingRef.current?.questionId === message.question_id) clearPending();
          setSession((previous) => previous?.question?.id === message.question_id ? { ...previous, submitted_answer: message.answer } : previous);
        } else if (message.type === "ping") {
          currentSocket.send(JSON.stringify({ type: "pong" }));
        } else if (message.type === "error") {
          setError(message.message || "The live quiz request could not be completed.");
          clearPending();
          clearAction();
        }
      };
      currentSocket.onerror = () => {
        if (stopped || socketRef.current !== currentSocket) return;
        setError("Connection interrupted. Your score is saved in this room; reconnecting…");
      };
      currentSocket.onclose = (event) => {
        clearTimeout(authenticationTimer);
        if (stopped || socketRef.current !== currentSocket) return;
        clearPending();
        clearAction();
        if ([1008, 4001, 4003, 4004, 4401, 4403, 4404].includes(event.code)) {
          setConnection("disconnected");
          setError((previous) => previous || "This room is unavailable or your sign-in has expired.");
          return;
        }
        setConnection("reconnecting");
        retryTimer = setTimeout(connect, Math.min(1000 * 2 ** retries++, 10000));
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      clearTimeout(authenticationTimer);
      clearTimeout(answerTimerRef.current);
      clearTimeout(actionTimerRef.current);
      socket?.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [authenticated, roomCode, token, reconnectKey, storageKey, clearPending, clearAction]);

  useEffect(() => {
    if (!session?.question?.deadline || session.status !== "active") return undefined;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [session?.question?.deadline, session?.status]);

  const request = useCallback(async (path, body) => {
    if (!authenticated) throw new Error("Sign in with your account to use live quizzes. Demo accounts cannot join.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${API_URL}${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : data.detail?.message || data.message || `Request failed (${response.status}).`);
      return data;
    } catch (requestError) {
      if (requestError.name === "AbortError") throw new Error("The request timed out. Please try again.");
      throw requestError;
    } finally {
      clearTimeout(timer);
    }
  }, [authenticated, token]);

  const joinRoom = useCallback((code) => {
    const normalized = code.trim().toUpperCase();
    if (!ROOM_PATTERN.test(normalized)) {
      setError("Enter a 6-character room code using letters and numbers.");
      return false;
    }
    if (!authenticated) {
      setError("Sign in with your account to use live quizzes. Demo accounts cannot join.");
      return false;
    }
    setError("");
    clearPending();
    clearAction();
    setSession(null);
    setRoomCode(normalized);
    setReconnectKey((value) => value + 1);
    return true;
  }, [authenticated, clearPending, clearAction, setRoomCode]);

  const createSession = useCallback(async (data) => {
    setBusy(true);
    setError("");
    try {
      const result = await request("/api/live/sessions", data);
      const created = result.session || result;
      clearPending();
      setSession(null);
      setRoomCode(created.room_code);
      setReconnectKey((value) => value + 1);
      return created;
    } catch (createError) {
      setError(createError.message);
      return null;
    } finally {
      setBusy(false);
    }
  }, [request, clearPending, setRoomCode]);

  const sendAction = useCallback((message) => {
    if (connection !== "connected" || socketRef.current?.readyState !== WebSocket.OPEN) {
      setError("Wait for the room to reconnect, then try again.");
      return false;
    }
    setError("");
    try {
      socketRef.current.send(JSON.stringify(message));
      return true;
    } catch {
      setError("The connection closed. Reconnect and try again.");
      return false;
    }
  }, [connection]);

  const submitAnswer = useCallback((answer) => {
    if (!session?.question || session.submitted_answer != null || pendingRef.current) return;
    if (sendAction({ type: "answer", question_id: session.question.id, answer })) {
      pendingRef.current = { questionId: session.question.id, answer };
      setPendingAnswer(answer);
      answerTimerRef.current = setTimeout(() => {
        clearPending();
        setError("Answer confirmation was interrupted. Reconnect to check your saved answer.");
        socketRef.current?.close();
      }, 8000);
    }
  }, [session, sendAction, clearPending]);

  const leaveRoom = useCallback(() => {
    clearPending();
    clearAction();
    setRoomCode("");
    setSession(null);
    setConnection("disconnected");
    setError("");
  }, [clearPending, clearAction, setRoomCode]);

  const sendControl = useCallback((type) => {
    if (actionPendingRef.current) return;
    if (sendAction({ type })) {
      actionPendingRef.current = { type, question_index: session?.question_index, status: session?.status };
      setActionPending(true);
      actionTimerRef.current = setTimeout(() => {
        clearAction();
        setError("Room confirmation was interrupted. Reconnect to check the current question.");
        socketRef.current?.close();
      }, 8000);
    }
  }, [sendAction, clearAction, session?.question_index, session?.status]);

  const deadline = deadlineTime(session?.question?.deadline);
  const secondsLeft = deadline == null || Number.isNaN(deadline) ? null : Math.max(0, Math.ceil((deadline - now) / 1000));

  return {
    authenticated, roomCode, session: authenticated && sessionOwnerRef.current === storageKey ? session : null, connection, error, busy, pendingAnswer, actionPending, secondsLeft,
    joinRoom, createSession, submitAnswer, leaveRoom,
    advanceQuestion: () => sendControl("advance"),
    endSession: () => sendControl("end"),
    reconnect: () => setReconnectKey((value) => value + 1),
  };
}
