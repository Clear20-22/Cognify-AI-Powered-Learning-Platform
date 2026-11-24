import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeftIcon, ArrowRightIcon, BellIcon, BoltIcon, CheckCircleIcon, ClockIcon, SignalIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLiveNotifications, useLiveQuiz } from "../hooks/useLiveQuiz.js";
import Leaderboard from "./Leaderboard.jsx";

/** FR-RT-02..07: student lobby, live questions, results and room recovery. */
export default function LiveQuiz() {
  const { user } = useAuth();
  const live = useLiveQuiz();
  const [code, setCode] = useState("");
  const { session, connection, secondsLeft } = live;
  const question = session?.question;
  const submitted = session?.submitted_answer != null;
  const selected = submitted ? session.submitted_answer : live.pendingAnswer;
  const connected = connection === "connected";

  if (live.authenticated && !["student", "teacher"].includes(user?.role)) {
    return <main className="min-h-screen bg-gray-50 px-4 py-12 text-gray-900"><section className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"><h1 className="text-2xl font-bold">Classroom access required</h1><p role="alert" className="mt-4 text-sm leading-6 text-gray-600">Live quizzes are available to student and teacher accounts.</p><Link to="/dashboard" className="mt-6 inline-block font-semibold text-red-700 underline">Back to dashboard</Link></section></main>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/40 px-4 py-6 text-gray-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-9 flex flex-wrap items-center justify-between gap-4" aria-label="Live quiz navigation">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600"><ArrowLeftIcon className="h-4 w-4" />Dashboard</Link>
          {user?.role === "teacher" && <Link to="/live/host" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:border-red-300">Host a quiz <ArrowRightIcon className="ml-1 inline h-4 w-4" /></Link>}
        </nav>
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div><span className="mb-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"><BoltIcon className="h-4 w-4" />COGNIFY LIVE</span><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{session?.title || "Learn together. Play live."}</h1><p className="mt-3 text-gray-500">Join your class, answer in real time, and see how you grow.</p></div>
          {live.roomCode && <div className="rounded-xl border border-gray-200 bg-white px-5 py-3"><p className="text-xs text-gray-500">Room code</p><p className="font-mono text-xl font-bold tracking-[0.2em]">{live.roomCode}</p></div>}
        </header>
        {!live.authenticated && <p role="alert" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Sign in with your student or teacher account to use live quizzes. Demo accounts cannot join a live session.</p>}
        {live.error && <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{live.error}</p>{live.roomCode && <button onClick={live.reconnect} className="font-semibold underline underline-offset-2">Reconnect</button>}</div>}
        {!live.roomCode ? (
          <section className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-7 shadow-sm sm:p-10">
            <span className="mb-6 inline-flex rounded-2xl bg-red-50 p-4 text-red-600"><SignalIcon className="h-8 w-8" /></span>
            <h2 className="text-2xl font-bold">Your classroom is one code away</h2><p className="mt-3 text-sm leading-6 text-gray-500">Ask your teacher for the 6-character room code. Your score stays with you if you reconnect.</p>
            <form onSubmit={(event) => { event.preventDefault(); live.joinRoom(code); }} className="mt-7">
              <label htmlFor="live-room-code" className="mb-2 block text-sm font-semibold">Room code</label>
              <input id="live-room-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} minLength={6} pattern="[A-Za-z0-9]{6}" autoCapitalize="characters" autoComplete="off" spellCheck={false} required className="w-full rounded-xl border border-gray-300 px-4 py-4 text-center font-mono text-2xl tracking-[0.3em] uppercase outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" />
              <button disabled={live.busy || !live.authenticated} className="mt-4 w-full rounded-xl bg-red-600 px-5 py-3.5 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{live.busy ? "Finding your room…" : "Join live quiz"}</button>
            </form>
          </section>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="mb-4 flex items-center justify-between gap-3"><span role="status" className="flex items-center gap-2 text-xs font-medium text-gray-600"><span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "animate-pulse bg-amber-500"}`} />{connected ? "Connected to your class" : connection === "connecting" ? "Joining room…" : connection === "reconnecting" ? "Reconnecting — your score is kept" : "Disconnected"}</span><button onClick={live.leaveRoom} className="text-xs text-gray-500 underline underline-offset-2">Leave room</button></div>
              <section className="min-h-80 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                {!session ? <div role="status" className="py-16 text-center text-gray-500">Connecting to your live session…</div> : session.is_host ? <div className="py-12 text-center"><h2 className="text-2xl font-bold">You are hosting this room</h2><p className="mt-3 text-gray-500">Open the host controls to begin or advance the quiz.</p><Link to="/live/host" className="mt-6 inline-block rounded-xl bg-red-600 px-5 py-3 font-semibold text-white">Open host controls</Link></div> : session.status === "finished" ? <div className="py-10 text-center"><Trophy /><h2 className="mt-5 text-3xl font-bold">Quiz complete!</h2><p className="mt-3 text-gray-500">Your final score is in the leaderboard. Great effort today.</p><button onClick={live.leaveRoom} className="mt-7 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold">Join another room</button></div> : !question ? <div className="py-12 text-center"><SignalIcon className="mx-auto h-12 w-12 text-red-400" /><h2 className="mt-5 text-2xl font-bold">You’re in. Get ready!</h2><p className="mx-auto mt-3 max-w-sm leading-7 text-gray-500">Your teacher will start the first question. Keep this screen open.</p><p className="mt-6 text-sm font-semibold text-red-600">{session.participant_count || 0} students in the room</p></div> : (
                  <>
                    <div className="mb-6 flex items-center justify-between gap-4"><span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Question {session.question_index + 1} of {session.question_count}</span>{secondsLeft != null && <span role="timer" aria-label={`${secondsLeft} seconds remaining`} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${secondsLeft <= 5 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}><ClockIcon className="h-4 w-4" />{secondsLeft}s</span>}</div>
                    <h2 className="whitespace-pre-wrap text-xl font-bold leading-8 sm:text-2xl">{question.question}</h2>
                    <div role="group" aria-label="Answer options" className="mt-7 space-y-3">{question.options.map((option, index) => <button key={index} onClick={() => live.submitAnswer(index)} disabled={submitted || live.pendingAnswer != null || !connected || secondsLeft === 0} aria-pressed={selected === index} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm transition-colors disabled:cursor-default ${selected === index ? "border-red-500 bg-red-50 text-red-800 ring-1 ring-red-500" : "border-gray-200 bg-white text-gray-700 enabled:hover:border-red-300 enabled:hover:bg-red-50/40"}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 font-bold text-gray-600">{String.fromCharCode(65 + index)}</span><span className="flex-1 whitespace-pre-wrap">{option}</span>{selected === index && submitted && <CheckCircleIcon className="h-5 w-5 shrink-0" />}</button>)}</div>
                    <p role="status" className="mt-6 text-sm text-gray-500">{submitted ? "Answer saved. Watch the leaderboard while your teacher moves to the next question." : live.pendingAnswer != null ? "Saving your answer…" : secondsLeft === 0 ? "Time is up. Waiting for the next question." : "Choose carefully — each question accepts one answer."}</p>
                  </>
                )}
              </section>
            </div>
            <Leaderboard entries={session?.leaderboard || []} currentUserId={user?.id} participantCount={session?.participant_count || 0} finished={session?.status === "finished"} />
          </div>
        )}
      </div>
    </main>
  );
}

/** FR-RT-07: keep class updates available throughout the authenticated app. */
export function LiveQuizNavigation() {
  const { user, isDemo } = useAuth();
  const { pathname } = useLocation();
  const { notifications, clearNotifications } = useLiveNotifications();
  if (!user || isDemo || !["student", "teacher"].includes(user.role)) return null;

  return (
    <div className={`relative z-[45] flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 text-sm sm:px-8 ${pathname.startsWith("/live") ? "" : "lg:pl-72"}`}>
      <nav aria-label="Classroom live quiz" className="flex items-center gap-4">
        <Link to="/live" className="inline-flex items-center gap-1.5 font-semibold text-red-700 hover:underline"><BoltIcon className="h-4 w-4" />Live quizzes</Link>
        {user.role === "teacher" && <Link to="/live/host" className="font-semibold text-gray-700 hover:underline">Host a quiz</Link>}
      </nav>
      <details className="relative">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50"><BellIcon className="h-4 w-4" />Class updates{notifications.length > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">{notifications.length}</span>}</summary>
        <section aria-label="Class notifications" className="absolute right-0 z-50 mt-2 max-h-96 w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-bold text-gray-900">Class updates</h2>{notifications.length > 0 && <button onClick={clearNotifications} className="text-xs font-medium text-gray-600 underline">Clear</button>}</div>
          {notifications.length ? <ul className="space-y-4" aria-live="polite">{notifications.map((notification) => <li key={notification.id} className="border-l-2 border-red-200 pl-3"><p className="font-semibold text-gray-900">{notification.title}</p><p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{notification.message}</p></li>)}</ul> : <p className="text-sm text-gray-500">New quizzes, assignments, and released marks will appear here.</p>}
        </section>
      </details>
    </div>
  );
}

function Trophy() {
  return <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><CheckCircleIcon className="h-9 w-9" /></span>;
}
