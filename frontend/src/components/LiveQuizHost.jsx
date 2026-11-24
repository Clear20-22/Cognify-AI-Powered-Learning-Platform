import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftIcon, BoltIcon, CheckIcon, ClipboardDocumentIcon, ClockIcon, PlusIcon, TrashIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLiveQuiz } from "../hooks/useLiveQuiz.js";
import Leaderboard from "./Leaderboard.jsx";

function blankQuestion() {
  return { key: crypto.randomUUID(), question: "", options: ["", "", "", ""], correct_answer: 0, time_limit_seconds: 30 };
}

const inputStyle = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100";

/** FR-RT-01/03/05: teacher-authored rooms and authoritative live controls. */
export default function LiveQuizHost() {
  const { user } = useAuth();
  const live = useLiveQuiz();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState(() => [blankQuestion()]);
  const [resumeCode, setResumeCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [validationError, setValidationError] = useState("");
  const { session } = live;
  const canControl = session?.is_host && live.connection === "connected" && !live.actionPending;

  const updateQuestion = (key, changes) => setQuestions((previous) => previous.map((item) => item.key === key ? { ...item, ...changes } : item));

  const createRoom = async (event) => {
    event.preventDefault();
    setValidationError("");
    const normalized = questions.map(({ question, options, correct_answer, time_limit_seconds }) => ({ question: question.trim(), options: options.map((option) => option.trim()), correct_answer, time_limit_seconds: Number(time_limit_seconds) }));
    if (!title.trim() || normalized.some((item) => !item.question || item.options.some((option) => !option) || new Set(item.options.map((option) => option.toLowerCase())).size !== item.options.length)) {
      setValidationError("Give your room a title and complete every question with distinct answer options.");
      return;
    }
    await live.createSession({ title: title.trim(), questions: normalized });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(live.roomCode);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError("Select the room code to copy it manually.");
    }
  };

  if (!live.authenticated || user?.role !== "teacher") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12 text-gray-900">
        <section className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Teacher access required</h1>
          <p role="alert" className="mt-4 text-sm leading-6 text-gray-600">{live.authenticated ? "Only teacher accounts can create and host live quizzes." : "Sign in with a teacher account to host a quiz. Demo accounts cannot create live sessions."}</p>
          <div className="mt-6 flex flex-wrap gap-4"><Link to="/dashboard" className="font-semibold text-gray-700 underline">Back to dashboard</Link>{user?.role === "student" && live.authenticated && <Link to="/live" className="font-semibold text-red-700 underline">Join your teacher’s quiz</Link>}</div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/40 px-4 py-6 text-gray-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-9 flex items-center justify-between gap-4" aria-label="Host navigation"><Link to="/dashboard" className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600"><ArrowLeftIcon className="h-4 w-4" />Dashboard</Link><Link to="/live" className="text-sm font-semibold text-red-600 hover:text-red-700">Join as a student</Link></nav>
        <header className="mb-8"><span className="mb-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"><BoltIcon className="h-4 w-4" />TEACHER STUDIO</span><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{session?.title || "Bring your classroom to life"}</h1><p className="mt-3 text-gray-500">Create your questions, share one code, and learn together in real time.</p></header>
        {(live.error || validationError) && <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{validationError || live.error}</p>{live.roomCode && <button onClick={live.reconnect} className="font-semibold underline underline-offset-2">Reconnect</button>}</div>}
        {live.roomCode ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Share this room code</p><p className="mt-2 select-all font-mono text-4xl font-bold tracking-[0.2em] text-red-600">{live.roomCode}</p></div><button onClick={copyCode} className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">{copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}{copied ? "Copied" : "Copy code"}</button></div>
                {copyError && <p role="status" className="mt-3 text-xs text-gray-500">{copyError}</p>}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4"><span role="status" className="flex items-center gap-2 text-xs text-gray-600"><span className={`h-2 w-2 rounded-full ${live.connection === "connected" ? "bg-emerald-500" : "animate-pulse bg-amber-500"}`} />{live.connection === "connected" ? "Live connection active" : live.connection === "disconnected" ? "Disconnected" : "Connecting — scores are kept"}</span><span className="flex items-center gap-1.5 text-xs text-gray-500"><UserGroupIcon className="h-4 w-4" />{session?.participant_count || 0} students</span></div>
              </section>
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                {!session ? <p role="status" className="py-12 text-center text-gray-500">Connecting to host controls…</p> : !session.is_host ? <div className="py-10 text-center"><h2 className="text-2xl font-bold">You joined as a participant</h2><p className="mt-3 text-gray-500">Only the teacher who created this room can control it.</p><Link to="/live" className="mt-6 inline-block rounded-xl bg-red-600 px-5 py-3 font-semibold text-white">Open student view</Link></div> : session.status === "finished" ? <div className="py-10 text-center"><CheckIcon className="mx-auto h-12 w-12 rounded-full bg-emerald-50 p-3 text-emerald-600" /><h2 className="mt-4 text-2xl font-bold">That’s a wrap!</h2><p className="mt-3 text-gray-500">The room is closed. Review your class’s final standings.</p><button onClick={() => { live.leaveRoom(); setConfirmEnd(false); setCopied(false); }} className="mt-6 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white">Prepare another room</button></div> : (
                  <>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{session.status === "waiting" ? "Your room is ready" : `Question ${session.question_index + 1} of ${session.question_count}`}</h2>{live.secondsLeft != null && session.status === "active" && <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-600"><ClockIcon className="h-4 w-4" />{live.secondsLeft}s</span>}</div>
                    {session.question ? <><p className="whitespace-pre-wrap text-xl font-semibold leading-8">{session.question.question}</p><ol className="mt-5 space-y-2">{session.question.options.map((option, index) => <li key={index} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700"><span className="font-bold text-gray-400">{String.fromCharCode(65 + index)}</span><span className="whitespace-pre-wrap">{option}</span></li>)}</ol><div className="mt-6"><div className="mb-2 flex justify-between text-xs text-gray-500"><span>Answers received</span><span>{session.answered_count || 0} / {session.participant_count || 0}</span></div><progress aria-label="Students who answered" value={session.answered_count || 0} max={Math.max(session.participant_count || 0, 1)} className="h-2 w-full accent-red-600" /></div></> : <p className="leading-7 text-gray-500">Ask students to open the Live Quiz page and enter the code above. Start when your class is ready.</p>}
                    <div className="mt-7 flex flex-wrap gap-3"><button disabled={!canControl} onClick={live.advanceQuestion} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{session.status === "waiting" ? "Start first question" : session.question_index + 1 >= session.question_count ? "Finish quiz & show results" : "Next question"}</button><button disabled={!canControl} onClick={() => setConfirmEnd(true)} className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">End session</button></div>
                    {confirmEnd && <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm text-amber-900">End this quiz for everyone? The final leaderboard will remain visible.</p><div className="mt-3 flex gap-3"><button disabled={!canControl} onClick={() => { live.endSession(); setConfirmEnd(false); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">End quiz</button><button onClick={() => setConfirmEnd(false)} className="px-3 py-2 text-sm font-semibold text-gray-600">Keep playing</button></div></div>}
                  </>
                )}
              </section>
              <button onClick={() => { live.leaveRoom(); setCopied(false); setConfirmEnd(false); }} className="text-xs text-gray-500 underline underline-offset-2">Disconnect from this room (students keep their scores)</button>
            </div>
            <Leaderboard entries={session?.leaderboard || []} currentUserId={user?.id} participantCount={session?.participant_count || 0} finished={session?.status === "finished"} />
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <form onSubmit={createRoom} className="space-y-5">
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"><h2 className="mb-4 text-lg font-bold">1. Name your live quiz</h2><label htmlFor="live-title" className="mb-2 block text-sm font-medium text-gray-600">Room title</label><input id="live-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="e.g. Biology · Cell revision" required className={inputStyle} /></section>
              {questions.map((question, questionIndex) => (
                <section key={question.key} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Question {questionIndex + 1}</h2>{questions.length > 1 && <button type="button" aria-label={`Remove question ${questionIndex + 1}`} onClick={() => setQuestions((previous) => previous.filter((item) => item.key !== question.key))} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>}</div>
                  <label htmlFor={`question-${question.key}`} className="mb-2 block text-sm font-medium text-gray-600">Question text</label><textarea id={`question-${question.key}`} value={question.question} onChange={(event) => updateQuestion(question.key, { question: event.target.value })} maxLength={2000} rows={3} required placeholder="What would you like to ask?" className={inputStyle} />
                  <fieldset className="mt-5"><legend className="mb-3 text-sm font-medium text-gray-600">Answer options <span className="font-normal text-gray-400">· Select the correct answer</span></legend><div className="space-y-3">{question.options.map((option, optionIndex) => <div key={optionIndex} className="flex items-center gap-3"><input type="radio" name={`correct-${question.key}`} id={`correct-${question.key}-${optionIndex}`} checked={question.correct_answer === optionIndex} onChange={() => updateQuestion(question.key, { correct_answer: optionIndex })} aria-label={`Option ${String.fromCharCode(65 + optionIndex)} is correct for question ${questionIndex + 1}`} className="h-4 w-4 shrink-0 accent-red-600" /><label htmlFor={`option-${question.key}-${optionIndex}`} className="sr-only">Option {String.fromCharCode(65 + optionIndex)}</label><input id={`option-${question.key}-${optionIndex}`} value={option} onChange={(event) => updateQuestion(question.key, { options: question.options.map((text, index) => index === optionIndex ? event.target.value : text) })} maxLength={500} required placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`} className={inputStyle} />{question.options.length > 2 && <button type="button" onClick={() => updateQuestion(question.key, { options: question.options.filter((_, index) => index !== optionIndex), correct_answer: question.correct_answer === optionIndex ? 0 : question.correct_answer > optionIndex ? question.correct_answer - 1 : question.correct_answer })} aria-label={`Remove option ${String.fromCharCode(65 + optionIndex)}`} className="rounded-lg p-2 text-gray-400 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>}</div>)}</div></fieldset>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4">{question.options.length < 6 && <button type="button" onClick={() => updateQuestion(question.key, { options: [...question.options, ""] })} className="flex items-center gap-1.5 text-xs font-semibold text-red-600"><PlusIcon className="h-4 w-4" />Add option</button>}<label className="ml-auto flex items-center gap-2 text-xs text-gray-500" htmlFor={`time-${question.key}`}><ClockIcon className="h-4 w-4" />Time per question<input id={`time-${question.key}`} type="number" min={5} max={300} step={1} required value={question.time_limit_seconds} onChange={(event) => updateQuestion(question.key, { time_limit_seconds: event.target.value })} className="w-20 rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none focus:border-red-500" />sec</label></div>
                </section>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-4"><button type="button" disabled={questions.length >= 50} onClick={() => setQuestions((previous) => [...previous, blankQuestion()])} className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50"><PlusIcon className="h-4 w-4" />Add question</button><button type="submit" disabled={live.busy || !live.authenticated} className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{live.busy ? "Creating your room…" : "Create live room"}</button></div>
            </form>
            <aside className="space-y-5"><section className="rounded-2xl border border-red-100 bg-red-50/50 p-5"><h2 className="font-bold">You set the pace</h2><ol className="mt-4 space-y-4 text-sm leading-6 text-gray-600"><li><span className="font-semibold text-red-600">01.</span> Write questions with 2–6 options and one correct answer.</li><li><span className="font-semibold text-red-600">02.</span> Share your unique code with your students.</li><li><span className="font-semibold text-red-600">03.</span> Start and advance questions whenever your class is ready.</li></ol><p className="mt-5 border-t border-red-100 pt-4 text-xs leading-5 text-gray-500">A teacher account is required. Students can reconnect with the same account and room code to keep their score.</p></section><section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-bold">Return to your room</h2><p className="mt-2 text-xs leading-5 text-gray-500">Reconnect with your room code and the same teacher account.</p><form onSubmit={(event) => { event.preventDefault(); live.joinRoom(resumeCode); }} className="mt-4 space-y-3"><label htmlFor="host-resume-code" className="sr-only">Room code to resume</label><input id="host-resume-code" value={resumeCode} onChange={(event) => setResumeCode(event.target.value.toUpperCase())} required minLength={6} maxLength={6} pattern="[A-Za-z0-9]{6}" placeholder="ABC123" autoComplete="off" className={`${inputStyle} font-mono tracking-widest uppercase`} /><button disabled={live.busy || !live.authenticated} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Reconnect to room</button></form></section></aside>
          </div>
        )}
      </div>
    </main>
  );
}
