import React, { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { apiService } from "../services/apiService";
import Sidebar from "./Sidebar";
import AssignmentForm from "./assignments/AssignmentForm";
import AssignmentDetail from "./assignments/AssignmentDetail";
import { STATUS_STYLES, formatDateTime, timeLeft } from "./assignments/format";
import { Bars3Icon, PlusIcon } from "@heroicons/react/24/outline";

const STUDENT_TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "submitted", label: "Submitted" },
  { id: "graded", label: "Graded" },
];

// Assignments (FR-ASG-01..08): teachers create and grade, students submit.
// Teachers and admins get the management view; students get their own view.
function Assignments({ onNavigate }) {
  const { hasRole, isDemo } = useAuth();
  const isTeacher = hasRole("teacher", "admin");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState({ mode: "list", id: null }); // list | create | edit | detail
  const [tab, setTab] = useState("all");

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.listAssignments();
      setAssignments(data.assignments || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isDemo) loadAssignments();
  }, [isDemo, loadAssignments]);

  if (isDemo) {
    return <Navigate to="/dashboard" replace />;
  }

  const selected = assignments.find((a) => a.id === view.id);
  const backToList = () => {
    setView({ mode: "list", id: null });
    loadAssignments();
  };
  const upsert = (saved) => {
    setAssignments((current) =>
      current.some((a) => a.id === saved.id)
        ? current.map((a) => (a.id === saved.id ? { ...a, ...saved } : a))
        : [saved, ...current]
    );
    setView({ mode: "detail", id: saved.id });
    // Create/edit responses carry no submission counts, so refresh the list
    loadAssignments();
  };

  const visible = isTeacher || tab === "all"
    ? assignments
    : assignments.filter((a) => a.my_status === tab);

  const totals = {
    submissions: assignments.reduce((sum, a) => sum + (a.submission_count || 0), 0),
    awaiting: assignments.reduce((sum, a) => sum + (a.awaiting_review || 0), 0),
    pending: assignments.filter((a) => a.my_status === "pending").length,
  };

  const renderContent = () => {
    if (view.mode === "create") {
      return <AssignmentForm onSaved={upsert} onCancel={() => setView({ mode: "list", id: null })} />;
    }
    if (view.mode === "edit" && selected) {
      return (
        <AssignmentForm assignment={selected} onSaved={upsert}
          onCancel={() => setView({ mode: "detail", id: selected.id })} />
      );
    }
    if (view.mode === "detail" && selected) {
      return (
        <AssignmentDetail
          key={selected.id}
          assignment={selected}
          isTeacher={isTeacher}
          onBack={backToList}
          onEdit={() => setView({ mode: "edit", id: selected.id })}
          onDeleted={(id) => {
            setAssignments((current) => current.filter((a) => a.id !== id));
            setView({ mode: "list", id: null });
          }}
          onSubmitted={loadAssignments}
        />
      );
    }

    return (
      <>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Assignments</h2>
            <p className="text-gray-600">
              {isTeacher
                ? `${assignments.length} assignment${assignments.length === 1 ? "" : "s"} · ${totals.submissions} submissions · ${totals.awaiting} awaiting review`
                : `${totals.pending} pending · submit before the deadline`}
            </p>
          </div>
          {isTeacher && (
            <button type="button" onClick={() => setView({ mode: "create", id: null })}
              className="inline-flex items-center gap-2 px-5 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700">
              <PlusIcon className="w-5 h-5" /> New assignment
            </button>
          )}
        </div>

        {!isTeacher && (
          <div className="flex flex-wrap gap-2 mb-6" role="tablist">
            {STUDENT_TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  tab === t.id ? "bg-red-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : error ? (
          <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            Could not load assignments: {error}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-center text-gray-600 py-16">
            {isTeacher
              ? "No assignments yet. Create one with “New assignment”."
              : tab === "all"
              ? "No assignments yet."
              : `No ${tab} assignments.`}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visible.map((a) => (
              <button key={a.id} type="button" onClick={() => setView({ mode: "detail", id: a.id })}
                className="text-left bg-white rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-lg transition-all p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  {!isTeacher && a.my_status && (
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[a.my_status].className}`}>
                      {STATUS_STYLES[a.my_status].label}
                    </span>
                  )}
                </div>
                {a.course_id && <p className="text-xs text-gray-500">{a.course_id}</p>}
                <p className="text-sm text-gray-600">Due {formatDateTime(a.deadline)}</p>
                <p className={`text-sm font-medium ${
                  a.is_past_deadline && (isTeacher || a.my_status === "pending") ? "text-red-600" : "text-gray-700"
                }`}>
                  {timeLeft(a.deadline)}
                </p>
                {isTeacher ? (
                  <p className="text-sm text-gray-700">
                    {a.submission_count} submitted ·{" "}
                    <span className={a.awaiting_review ? "font-semibold text-red-600" : ""}>
                      {a.awaiting_review} to review
                    </span>
                  </p>
                ) : (
                  a.my_status === "graded" && (
                    <p className="text-sm font-semibold text-green-700">
                      {a.my_marks} / {a.max_marks}
                    </p>
                  )
                )}
              </button>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        onNavigate={onNavigate} currentPage="assignments" theme="white" />

      <div className={`transition-all duration-300 min-h-screen ${sidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}>
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Open menu">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Assignments</h1>
          <div className="w-10"></div>
        </div>

        <div className="px-6 py-8">{renderContent()}</div>
      </div>
    </div>
  );
}

export default Assignments;
