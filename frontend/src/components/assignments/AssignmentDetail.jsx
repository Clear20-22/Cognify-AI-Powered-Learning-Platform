import React, { useEffect, useState } from "react";
import { apiService } from "../../services/apiService";
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILE_MB,
  STATUS_STYLES,
  checkFile,
  formatDateTime,
  formatSize,
  timeLeft,
} from "./format";

function Alert({ message, type = "error" }) {
  if (!message) return null;
  const styles =
    type === "success"
      ? "bg-green-50 border-green-200 text-green-700"
      : "bg-red-50 border-red-200 text-red-700";
  return (
    <div role={type === "success" ? "status" : "alert"}
      className={`p-3 border rounded-xl text-sm font-medium ${styles}`}>
      {message}
    </div>
  );
}

function FileButton({ file, onDownload }) {
  const [error, setError] = useState(null);
  const handleClick = async () => {
    try {
      setError(null);
      await onDownload();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={handleClick}
        className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-800">
        📎 {file.filename}
        <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
      </button>
      {error && <span className="text-xs text-red-600 mt-1">{error}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Teacher: review submissions and grade (FR-ASG-06, FR-ASG-07)
// ---------------------------------------------------------------------------

function GradeForm({ assignment, submission, onGraded }) {
  const [marks, setMarks] = useState(submission.marks ?? "");
  const [feedback, setFeedback] = useState(submission.feedback || "");
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = Number(marks);
    if (marks === "" || Number.isNaN(value) || value < 0 || value > assignment.max_marks) {
      setStatus({ type: "error", text: `Marks must be between 0 and ${assignment.max_marks}` });
      return;
    }
    setSaving(true);
    try {
      const graded = await apiService.gradeSubmission(
        assignment.id, submission.id, value, feedback.trim()
      );
      setStatus({ type: "success", text: "Marks saved" });
      onGraded(graded);
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-2">
      <div className="flex items-center gap-2">
        <input type="number" min="0" max={assignment.max_marks} step="any" value={marks}
          onChange={(e) => { setMarks(e.target.value); setStatus(null); }}
          aria-label={`Marks for ${submission.student_email}`}
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg" />
        <span className="text-sm text-gray-500">/ {assignment.max_marks}</span>
      </div>
      <textarea value={feedback} onChange={(e) => { setFeedback(e.target.value); setStatus(null); }}
        rows={2} maxLength={5000} placeholder="Feedback for the student"
        aria-label={`Feedback for ${submission.student_email}`}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
          {saving ? "Saving..." : submission.status === "graded" ? "Update marks" : "Save marks"}
        </button>
        {status && (
          <span className={`text-sm ${status.type === "success" ? "text-green-700" : "text-red-600"}`}>
            {status.text}
          </span>
        )}
      </div>
    </form>
  );
}

function TeacherSubmissions({ assignment }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiService.listSubmissions(assignment.id);
        setSubmissions(data.submissions || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assignment.id]);

  const replace = (updated) =>
    setSubmissions((current) => current.map((s) => (s.id === updated.id ? updated : s)));

  if (loading) return <p className="text-gray-600">Loading submissions...</p>;
  if (error) return <Alert message={`Could not load submissions: ${error}`} />;
  if (submissions.length === 0) {
    return <p className="text-gray-600">No submissions yet.</p>;
  }

  const graded = submissions.filter((s) => s.status === "graded").length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {submissions.length} submission{submissions.length === 1 ? "" : "s"} · {graded} graded ·{" "}
        {submissions.length - graded} awaiting review
      </p>
      {submissions.map((s) => (
        <div key={s.id} className="border border-gray-200 rounded-xl p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-900">{s.student_name || s.student_email}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[s.status].className}`}>
                {STATUS_STYLES[s.status].label}
              </span>
              {s.is_late && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">Late</span>
              )}
            </div>
            <p className="text-xs text-gray-500 break-all">
              {s.student_email} · submitted {formatDateTime(s.submitted_at)}
              {s.resubmission_count > 0 && ` · resubmitted ${s.resubmission_count}×`}
            </p>
            {s.text && (
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                {s.text}
              </p>
            )}
            {s.file && (
              <FileButton file={s.file}
                onDownload={() => apiService.downloadSubmissionFile(assignment.id, s)} />
            )}
          </div>
          <GradeForm assignment={assignment} submission={s} onGraded={replace} />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Student: submit, resubmit and see marks (FR-ASG-03, 04, 05, 08)
// ---------------------------------------------------------------------------

function StudentSubmission({ assignment, onSubmitted }) {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setSubmission(await apiService.getMySubmission(assignment.id));
      } catch (err) {
        setStatus({ type: "error", text: err.message });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assignment.id]);

  if (loading) return <p className="text-gray-600">Loading your submission...</p>;

  const isGraded = submission?.status === "graded";
  const deadlineClosed = assignment.is_past_deadline && !assignment.allow_late;
  const canSubmit = !isGraded && !deadlineClosed;

  const handleFile = (e) => {
    const chosen = e.target.files?.[0] || null;
    const problem = chosen && checkFile(chosen);
    if (problem) {
      setStatus({ type: "error", text: problem });
      e.target.value = "";
      setFile(null);
      return;
    }
    setStatus(null);
    setFile(chosen);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !file) {
      setStatus({ type: "error", text: "Add a text answer or a file" });
      return;
    }
    if (submission && !window.confirm("Replace your previous submission with this one?")) {
      return;
    }
    setSaving(true);
    try {
      const saved = await apiService.submitAssignment(assignment.id, text.trim(), file);
      setSubmission(saved);
      setText("");
      setFile(null);
      e.target.reset();
      setStatus({ type: "success", text: saved.is_late ? "Submitted (late)" : "Submitted" });
      onSubmitted();
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {isGraded && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm text-green-800 font-semibold">Marks</p>
          <p className="text-3xl font-bold text-green-900">
            {submission.marks} <span className="text-lg font-medium">/ {assignment.max_marks}</span>
          </p>
          {submission.feedback && (
            <>
              <p className="text-sm text-green-800 font-semibold mt-3">Feedback</p>
              <p className="text-gray-800 whitespace-pre-wrap">{submission.feedback}</p>
            </>
          )}
        </div>
      )}

      {submission && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900">Your submission</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[submission.status].className}`}>
              {STATUS_STYLES[submission.status].label}
            </span>
            {submission.is_late && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">Late</span>
            )}
          </div>
          <p className="text-xs text-gray-500">Submitted {formatDateTime(submission.submitted_at)}</p>
          {submission.text && (
            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words bg-gray-50 rounded-lg p-3">
              {submission.text}
            </p>
          )}
          {submission.file && (
            <FileButton file={submission.file}
              onDownload={() => apiService.downloadSubmissionFile(assignment.id, submission)} />
          )}
        </div>
      )}

      {isGraded && (
        <p className="text-sm text-gray-600">This submission has been graded and can no longer be changed.</p>
      )}
      {!isGraded && deadlineClosed && (
        <Alert message="The deadline has passed and late submissions are not accepted." />
      )}

      {canSubmit && (
        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <h4 className="font-semibold text-gray-900">
            {submission ? "Resubmit (replaces your previous submission)" : "Submit your work"}
          </h4>
          {assignment.is_past_deadline && (
            <p className="text-sm text-orange-700">The deadline has passed — this will be marked late.</p>
          )}
          <textarea value={text} onChange={(e) => { setText(e.target.value); setStatus(null); }}
            rows={6} maxLength={20000} placeholder="Write your answer (optional if you attach a file)"
            aria-label="Your answer"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
          <div>
            <input type="file" accept={ACCEPT_ATTRIBUTE} onChange={handleFile}
              aria-label="Attach a file" className="block w-full text-sm text-gray-600" />
            <p className="text-xs text-gray-500 mt-1">
              One file, up to {MAX_FILE_MB} MB: PDF, DOCX, PPTX, ZIP, PNG, JPG or TXT.
            </p>
          </div>
          <Alert message={status?.text} type={status?.type} />
          <button type="submit" disabled={saving}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50">
            {saving ? "Submitting..." : submission ? "Resubmit" : "Submit"}
          </button>
        </form>
      )}
      {!canSubmit && status && <Alert message={status.text} type={status.type} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail page
// ---------------------------------------------------------------------------

function AssignmentDetail({ assignment, isTeacher, onBack, onEdit, onDeleted, onSubmitted }) {
  const [deleteError, setDeleteError] = useState(null);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${assignment.title}" and all its submissions? This cannot be undone.`)) {
      return;
    }
    try {
      await apiService.deleteAssignment(assignment.id);
      onDeleted(assignment.id);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <button type="button" onClick={onBack} className="text-sm text-red-600 hover:underline">
        ← Back to assignments
      </button>

      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{assignment.title}</h2>
            <p className="text-sm text-gray-500">
              {assignment.course_id && `${assignment.course_id} · `}by {assignment.teacher_name || "Teacher"}
            </p>
          </div>
          {isTeacher && (
            <div className="flex gap-2">
              <button type="button" onClick={onEdit}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Edit</button>
              <button type="button" onClick={handleDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium">Delete</button>
            </div>
          )}
        </div>
        <Alert message={deleteError} />

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Deadline</dt>
            <dd className="font-medium text-gray-900">{formatDateTime(assignment.deadline)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Time left</dt>
            <dd className={`font-medium ${assignment.is_past_deadline ? "text-red-600" : "text-gray-900"}`}>
              {timeLeft(assignment.deadline)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Max marks</dt>
            <dd className="font-medium text-gray-900">{assignment.max_marks}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Late submissions</dt>
            <dd className="font-medium text-gray-900">{assignment.allow_late ? "Accepted" : "Not accepted"}</dd>
          </div>
        </dl>

        {assignment.description && (
          <p className="text-gray-800 whitespace-pre-wrap">{assignment.description}</p>
        )}

        {assignment.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {assignment.attachments.map((file) => (
              <FileButton key={file.file_id} file={file}
                onDownload={() => apiService.downloadAttachment(assignment.id, file)} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isTeacher ? "Submissions" : "Your work"}
        </h3>
        {isTeacher ? (
          <TeacherSubmissions assignment={assignment} />
        ) : (
          <StudentSubmission assignment={assignment} onSubmitted={onSubmitted} />
        )}
      </section>
    </div>
  );
}

export default AssignmentDetail;
