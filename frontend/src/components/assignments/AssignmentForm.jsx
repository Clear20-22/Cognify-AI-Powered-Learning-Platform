import React, { useState } from "react";
import { apiService } from "../../services/apiService";
import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENTS,
  MAX_FILE_MB,
  checkFile,
  toLocalInput,
} from "./format";

// Create a new assignment, or edit one when `assignment` is given (FR-ASG-01)
function AssignmentForm({ assignment, onSaved, onCancel }) {
  const isEdit = Boolean(assignment);
  const [form, setForm] = useState({
    title: assignment?.title || "",
    description: assignment?.description || "",
    deadline: assignment ? toLocalInput(assignment.deadline) : "",
    maxMarks: assignment ? String(assignment.max_marks) : "100",
    allowLate: assignment?.allow_late || false,
    courseId: assignment?.course_id || "",
  });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: value });
    setError(null);
  };

  const handleFiles = (e) => {
    const chosen = Array.from(e.target.files || []);
    const problem =
      chosen.length > MAX_ATTACHMENTS
        ? `At most ${MAX_ATTACHMENTS} files`
        : chosen.map(checkFile).find(Boolean);
    if (problem) {
      setError(problem);
      e.target.value = "";
      setFiles([]);
      return;
    }
    setError(null);
    setFiles(chosen);
  };

  const validate = () => {
    if (!form.title.trim()) return "Title is required";
    if (!form.deadline) return "Choose a deadline";
    // An unchanged past deadline is fine when editing (e.g. only enabling late submissions)
    const deadlineChanged = !isEdit || form.deadline !== toLocalInput(assignment.deadline);
    if (deadlineChanged && new Date(form.deadline) <= new Date()) {
      return "Deadline must be in the future";
    }
    const marks = Number(form.maxMarks);
    if (!(marks > 0 && marks <= 1000)) return "Max marks must be between 1 and 1000";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    const fields = {
      title: form.title.trim(),
      description: form.description.trim(),
      deadline: new Date(form.deadline).toISOString(),
      max_marks: Number(form.maxMarks),
      allow_late: form.allowLate,
      course_id: form.courseId.trim(),
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        // Send only what changed
        const original = {
          title: assignment.title,
          description: assignment.description,
          deadline: new Date(assignment.deadline).toISOString(),
          max_marks: assignment.max_marks,
          allow_late: assignment.allow_late,
          course_id: assignment.course_id || "",
        };
        const changes = Object.fromEntries(
          Object.entries(fields).filter(([key, value]) => value !== original[key])
        );
        saved = Object.keys(changes).length
          ? await apiService.updateAssignment(assignment.id, changes)
          : assignment;
      } else {
        saved = await apiService.createAssignment(fields, files);
      }
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 max-w-3xl"
    >
      <h3 className="text-xl font-bold text-gray-900">
        {isEdit ? "Edit assignment" : "New assignment"}
      </h3>

      <div>
        <label htmlFor="asg-title" className={labelClass}>Title</label>
        <input id="asg-title" type="text" value={form.title} onChange={update("title")}
          maxLength={200} className={inputClass} />
      </div>

      <div>
        <label htmlFor="asg-description" className={labelClass}>Instructions</label>
        <textarea id="asg-description" value={form.description} onChange={update("description")}
          rows={5} maxLength={10000} className={`${inputClass} resize-y`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="asg-deadline" className={labelClass}>Deadline</label>
          <input id="asg-deadline" type="datetime-local" value={form.deadline}
            onChange={update("deadline")} min={toLocalInput(new Date().toISOString())}
            className={inputClass} />
        </div>
        <div>
          <label htmlFor="asg-marks" className={labelClass}>Max marks</label>
          <input id="asg-marks" type="number" min="1" max="1000" step="any" value={form.maxMarks}
            onChange={update("maxMarks")} className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="asg-course" className={labelClass}>
          Course ID <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <input id="asg-course" type="text" value={form.courseId} onChange={update("courseId")}
          maxLength={100} placeholder="e.g. CSE-4113" className={inputClass} />
      </div>

      <label className="flex items-center gap-3 text-sm text-gray-700">
        <input type="checkbox" checked={form.allowLate} onChange={update("allowLate")}
          className="w-4 h-4 accent-red-600" />
        Accept late submissions after the deadline
      </label>

      {!isEdit && (
        <div>
          <label htmlFor="asg-files" className={labelClass}>
            Supporting files <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <input id="asg-files" type="file" multiple accept={ACCEPT_ATTRIBUTE}
            onChange={handleFiles} className="block w-full text-sm text-gray-600" />
          <p className="text-xs text-gray-500 mt-1">
            Up to {MAX_ATTACHMENTS} files, {MAX_FILE_MB} MB each: PDF, DOCX, PPTX, ZIP, PNG, JPG or TXT.
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50">
          {saving ? "Saving..." : isEdit ? "Save changes" : "Create assignment"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default AssignmentForm;
